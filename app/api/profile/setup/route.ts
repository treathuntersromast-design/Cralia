import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { rolesToActivityStyleId } from '@/lib/constants/activity'
import { VALIDATION } from '@/lib/constants/validation'

const ALLOWED_URL_SCHEMES = ['https:', 'http:']

function isSafeUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    return ALLOWED_URL_SCHEMES.includes(url.protocol)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  // 認証確認はセッションクライアントで行う
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // DB 操作はサービスロールクライアントで行う（RLS の INSERT ポリシー不足を回避）
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  // 型付きで取り出す
  const entityType = body.entityType
  const roles = body.roles
  const displayName = body.displayName
  const snsLinks = body.snsLinks
  const creatorTypes = body.creatorTypes
  const clientTypes = body.clientTypes
  const skills = body.skills
  const bio = body.bio
  const portfolios = body.portfolios
  const priceMin = body.priceMin
  const priceNote = body.priceNote
  const availability = body.availability
  const deliveryDays = body.deliveryDays

  // バリデーション
  if (!Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json({ error: '活動スタイルを選択してください' }, { status: 400 })
  }
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    return NextResponse.json({ error: '表示名を入力してください' }, { status: 400 })
  }
  if (displayName.trim().length > VALIDATION.DISPLAY_NAME_MAX) {
    return NextResponse.json({ error: `表示名は${VALIDATION.DISPLAY_NAME_MAX}文字以内で入力してください` }, { status: 400 })
  }
  if (bio !== undefined && bio !== null) {
    if (typeof bio !== 'string') return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    if (bio.trim().length > VALIDATION.BIO_MAX) return NextResponse.json({ error: `自己紹介は${VALIDATION.BIO_MAX}文字以内で入力してください` }, { status: 400 })
  }
  if (priceNote !== undefined && priceNote !== null) {
    if (typeof priceNote !== 'string') return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    if (priceNote.trim().length > VALIDATION.PRICE_NOTE_MAX) return NextResponse.json({ error: `単価の補足は${VALIDATION.PRICE_NOTE_MAX}文字以内で入力してください` }, { status: 400 })
  }
  if (deliveryDays !== undefined && deliveryDays !== null) {
    if (typeof deliveryDays !== 'string') return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    if (deliveryDays.trim().length > VALIDATION.DELIVERY_DAYS_MAX) return NextResponse.json({ error: `納品期間は${VALIDATION.DELIVERY_DAYS_MAX}文字以内で入力してください` }, { status: 400 })
  }
  if (Array.isArray(skills)) {
    if (skills.length > VALIDATION.SKILLS_MAX) {
      return NextResponse.json({ error: `スキルタグは${VALIDATION.SKILLS_MAX}個以内にしてください` }, { status: 400 })
    }
    if (skills.some((s: unknown) => typeof s !== 'string' || s.trim().length > VALIDATION.SKILL_TAG_MAX)) {
      return NextResponse.json({ error: `スキルタグは1つ${VALIDATION.SKILL_TAG_MAX}文字以内にしてください` }, { status: 400 })
    }
  }
  if (Array.isArray(portfolios) && portfolios.length > VALIDATION.PORTFOLIOS_MAX) {
    return NextResponse.json({ error: `ポートフォリオは${VALIDATION.PORTFOLIOS_MAX}件以内にしてください` }, { status: 400 })
  }
  if (Array.isArray(snsLinks) && snsLinks.length > VALIDATION.SNS_LINKS_MAX) {
    return NextResponse.json({ error: `SNSリンクは${VALIDATION.SNS_LINKS_MAX}件以内にしてください` }, { status: 400 })
  }

  const rolesArr = Array.isArray(roles) ? (roles as string[]) : []
  const isCreator = rolesArr.includes('creator')
  const isClient  = rolesArr.includes('client')
  const safeClientTypes = Array.isArray(clientTypes) ? clientTypes : []

  const activityStyleId = rolesToActivityStyleId(rolesArr)

  // SNS リンク：IDが空のエントリを除外
  const filteredSnsLinks = Array.isArray(snsLinks)
    ? snsLinks.filter((s: { platform: string; id: string }) => s.id?.trim())
    : []

  // 1. users テーブルを更新（activity_style_id で保存）
  let userUpsertPayload: Record<string, unknown> = {
    id: user.id,
    entity_type: typeof entityType === 'string' ? entityType : 'individual',
    activity_style_id: activityStyleId,
    display_name: displayName.trim(),
    sns_links: filteredSnsLinks,
    client_type: safeClientTypes,
    updated_at: new Date().toISOString(),
  }

  let { error: userError } = await db
    .from('users')
    .upsert(userUpsertPayload, { onConflict: 'id' })

  // client_type カラム未作成の場合はフォールバック（後方互換）
  if (userError?.code === '42703') {
    const { client_type: _removed, ...payloadWithoutClientType } = userUpsertPayload as Record<string, unknown>
    userUpsertPayload = payloadWithoutClientType;
    ({ error: userError } = await db
      .from('users')
      .upsert(userUpsertPayload, { onConflict: 'id' }))
  }

  if (userError) {
    console.error('[profile/setup] userError:', userError)
    return NextResponse.json({ error: 'ユーザー情報の保存に失敗しました' }, { status: 500 })
  }

  // 2. クリエイターの場合は creator_profiles を作成・更新
  if (isCreator) {
    // 単価のバリデーション（負の値を弾く）
    const parsedPrice = priceMin !== '' && priceMin !== null && priceMin !== undefined
      ? parseInt(String(priceMin), 10)
      : null
    const safePrice = parsedPrice !== null && parsedPrice >= 0 ? parsedPrice : null

    const bioStr = typeof bio === 'string' ? bio.trim() : null
    const priceNoteStr = typeof priceNote === 'string' ? priceNote.trim() || null : null
    const deliveryDaysStr = typeof deliveryDays === 'string' ? deliveryDays.trim() || null : null

    const profileData = {
      creator_id: user.id,
      display_name: displayName.trim(),
      creator_type: Array.isArray(creatorTypes) ? creatorTypes : [],
      skills: Array.isArray(skills) ? skills : [],
      bio: bioStr || null,
      price_min: safePrice,
      price_note: priceNoteStr,
      project_types: [],
      availability: typeof availability === 'string' ? availability : 'open',
      delivery_days: deliveryDaysStr,
      schedule: { days: [1, 2, 3, 4, 5], default_working_days: 10 },
      updated_at: new Date().toISOString(),
    }

    const { error: profileError } = await db
      .from('creator_profiles')
      .upsert(profileData, { onConflict: 'creator_id' })

    if (profileError) {
      console.error('[profile/setup] profileError:', profileError)
      return NextResponse.json({ error: 'プロフィールの保存に失敗しました' }, { status: 500 })
    }

    // 3. ポートフォリオを保存（既存を削除して再挿入）
    if (Array.isArray(portfolios) && portfolios.length > 0) {
      const validPortfolios = portfolios.filter((p: { url: string }) => {
        const url = p.url?.trim()
        return url && isSafeUrl(url)
      })

      if (validPortfolios.length > 0) {
        // 既存のポートフォリオを削除
        await db.from('portfolios').delete().eq('creator_id', user.id)

        const portfolioData = validPortfolios.map((p: { platform: string; url: string; title: string }, i: number) => ({
          creator_id: user.id,
          platform: p.platform,
          url: p.url.trim(),
          title: p.title?.trim().slice(0, 100) ?? null,
          display_order: i,
        }))

        const { error: portfolioError } = await db.from('portfolios').insert(portfolioData)
        if (portfolioError) {
          return NextResponse.json({ error: 'ポートフォリオの保存に失敗しました' }, { status: 500 })
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
