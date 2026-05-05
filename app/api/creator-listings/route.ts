import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasCreatorRole } from '@/lib/constants/activity'
import { VALIDATION } from '@/lib/constants/validation'

export const dynamic = 'force-dynamic'

// ── GET /api/creator-listings ──────────────────────────────
// 公開中の仕事募集一覧を取得
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const creatorType = searchParams.get('creator_type')
  const orderType   = searchParams.get('order_type')

  let query = supabase
    .from('creator_listings')
    .select(`
      id, title, description, creator_types, order_type,
      price_min, price_max, status, created_at,
      creator_id,
      users!creator_listings_creator_id_fkey (
        display_name, avatar_url, entity_type
      )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)

  if (creatorType) {
    query = query.contains('creator_types', [creatorType])
  }
  if (orderType === 'paid' || orderType === 'free') {
    query = query.eq('order_type', orderType)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })

  return NextResponse.json({ data })
}

// ── POST /api/creator-listings ─────────────────────────────
// 仕事募集を投稿（クリエイターロールチェック）
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // クリエイターロール確認（activity_style_id: 1=クリエイター, 3=両方）
  const { data: userData } = await supabase
    .from('users')
    .select('activity_style_id')
    .eq('id', user.id)
    .single()

  if (!hasCreatorRole(userData?.activity_style_id as number | null)) {
    return NextResponse.json({ error: 'クリエイターとして登録されているアカウントのみ投稿できます' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const title        = typeof body.title       === 'string' ? body.title.trim()       : ''
  const description  = typeof body.description === 'string' ? body.description.trim() : null
  const creatorTypes = Array.isArray(body.creatorTypes) ? (body.creatorTypes as string[]) : []
  const orderType    = body.orderType === 'free' ? 'free' : 'paid'
  const priceMin     = typeof body.priceMin === 'number' && body.priceMin >= 0 ? body.priceMin : null
  const priceMax     = typeof body.priceMax === 'number' && body.priceMax >= 0 ? body.priceMax : null

  if (!title) return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
  if (creatorTypes.length === 0) {
    return NextResponse.json({ error: 'クリエイタータイプを1つ以上選択してください' }, { status: 400 })
  }
  if (title.length > VALIDATION.CREATOR_LISTING_TITLE_MAX) {
    return NextResponse.json({ error: `タイトルは${VALIDATION.CREATOR_LISTING_TITLE_MAX}文字以内にしてください` }, { status: 400 })
  }
  if (description && description.length > VALIDATION.CREATOR_LISTING_DESC_MAX) {
    return NextResponse.json({ error: `説明文は${VALIDATION.CREATOR_LISTING_DESC_MAX}文字以内にしてください` }, { status: 400 })
  }
  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    return NextResponse.json({ error: '価格の最小値が最大値を超えています' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('creator_listings')
    .insert({
      creator_id:    user.id,
      title,
      description,
      creator_types: creatorTypes,
      order_type:    orderType,
      price_min:     priceMin,
      price_max:     priceMax,
      status:        'open',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
