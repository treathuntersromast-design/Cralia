import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CREATOR_TYPES } from '@/lib/constants/lists'
import { VALIDATION } from '@/lib/constants/validation'

function isSafeUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const ALLOWED_CREATOR_TYPES = [...CREATOR_TYPES]

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }
  const { displayName, creatorTypes, bio, skills, priceMin, priceNote, deliveryDays, snsLinks } = body

  // users テーブルの更新
  const userPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (displayName !== undefined) {
    if (typeof displayName !== 'string' || !displayName.trim()) return NextResponse.json({ error: '表示名を入力してください' }, { status: 400 })
    if (displayName.trim().length > VALIDATION.DISPLAY_NAME_MAX) return NextResponse.json({ error: `表示名は${VALIDATION.DISPLAY_NAME_MAX}文字以内にしてください` }, { status: 400 })
    userPatch.display_name = displayName.trim()
  }
  if (snsLinks !== undefined) {
    if (!Array.isArray(snsLinks)) return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    // ホームページを除いた SNS は 6件まで（ホームページ1件 + SNS6件 = 合計7件）
    const snsOnly = snsLinks.filter((s: { platform: string }) => s.platform !== 'ホームページ')
    if (snsOnly.length > 6) return NextResponse.json({ error: 'SNSリンクは6件以内にしてください' }, { status: 400 })
    // ホームページ URL は http/https のみ許可
    const homepage = snsLinks.find((s: { platform: string; id: string }) => s.platform === 'ホームページ')
    if (homepage?.id?.trim() && !isSafeUrl(homepage.id.trim())) {
      return NextResponse.json({ error: 'ホームページのURLはhttpまたはhttpsで始まるURLを入力してください' }, { status: 400 })
    }
    userPatch.sns_links = snsLinks.filter((s: { id: string }) => s.id?.trim())
  }

  if (Object.keys(userPatch).length > 1) {
    const { error } = await supabase.from('users').update(userPatch).eq('id', user.id)
    if (error) {
      console.error('[profile/update] userError:', error)
      return NextResponse.json({ error: 'ユーザー情報の更新に失敗しました' }, { status: 500 })
    }
  }

  // creator_profiles テーブルの更新
  const profilePatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (displayName !== undefined) profilePatch.display_name = displayName.trim()
  if (creatorTypes !== undefined) {
    if (!Array.isArray(creatorTypes)) return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    const invalid = (creatorTypes as unknown[]).filter(
      (t) => typeof t !== 'string' || (!ALLOWED_CREATOR_TYPES.includes(t) && !t.startsWith('その他（'))
    )
    if (invalid.length > 0) return NextResponse.json({ error: '不正なクリエイタータイプが含まれています' }, { status: 400 })
    profilePatch.creator_type = creatorTypes
  }
  if (bio !== undefined) {
    if (typeof bio !== 'string') return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    if (bio.trim().length > VALIDATION.BIO_MAX) return NextResponse.json({ error: `自己紹介は${VALIDATION.BIO_MAX}文字以内にしてください` }, { status: 400 })
    profilePatch.bio = bio.trim() || null
  }
  if (skills !== undefined) {
    if (!Array.isArray(skills) || skills.length > VALIDATION.SKILLS_MAX) return NextResponse.json({ error: `スキルは${VALIDATION.SKILLS_MAX}個以内にしてください` }, { status: 400 })
    if (skills.some((s: unknown) => typeof s !== 'string' || s.length > VALIDATION.SKILL_TAG_MAX)) return NextResponse.json({ error: `スキルは1つ${VALIDATION.SKILL_TAG_MAX}文字以内にしてください` }, { status: 400 })
    profilePatch.skills = skills
  }
  if (priceMin !== undefined) {
    const parsed = priceMin === '' || priceMin === null ? null : parseInt(String(priceMin), 10)
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) return NextResponse.json({ error: '単価は0以上の数値を入力してください' }, { status: 400 })
    if (parsed !== null && parsed > 100_000_000) return NextResponse.json({ error: '単価は1億円以内で入力してください' }, { status: 400 })
    profilePatch.price_min = parsed
  }
  if (priceNote !== undefined) {
    if (typeof priceNote !== 'string') return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    if (priceNote.length > VALIDATION.PRICE_NOTE_MAX) return NextResponse.json({ error: `単価補足は${VALIDATION.PRICE_NOTE_MAX}文字以内にしてください` }, { status: 400 })
    profilePatch.price_note = priceNote.trim() || null
  }
  if (deliveryDays !== undefined) {
    if (typeof deliveryDays !== 'string') return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    if (deliveryDays.length > VALIDATION.DELIVERY_DAYS_MAX) return NextResponse.json({ error: `納品期間は${VALIDATION.DELIVERY_DAYS_MAX}文字以内にしてください` }, { status: 400 })
    profilePatch.delivery_days = deliveryDays.trim() || null
  }

  if (Object.keys(profilePatch).length > 1) {
    const { error } = await supabase.from('creator_profiles').update(profilePatch).eq('creator_id', user.id)
    if (error) {
      console.error('[profile/update] profileError:', error)
      return NextResponse.json({ error: 'プロフィールの更新に失敗しました' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
