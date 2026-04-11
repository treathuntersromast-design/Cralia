/**
 * GET  /api/reviews?orderId=xxx  — 依頼に紐づくレビュー一覧
 * POST /api/reviews               — レビュー投稿
 *   - 依頼者 (client) が投稿 → review_type = 'order_to_creator'
 *   - クリエイター (creator) が投稿 → review_type = 'order_to_client'
 *   どちらも completed の依頼のみ・重複投稿不可
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { VALIDATION } from '@/lib/constants/validation'

export const dynamic = 'force-dynamic'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId は必須です' }, { status: 400 })

  const db = getDb()
  const { data, error } = await db
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer_id, reviewee_id, review_type')
    .eq('project_id', orderId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  return NextResponse.json({ reviews: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { orderId, rating, comment } = body

  if (typeof orderId !== 'string') return NextResponse.json({ error: 'orderId は必須です' }, { status: 400 })
  const r = Number(rating)
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return NextResponse.json({ error: '評価は1〜5の整数で入力してください' }, { status: 400 })
  }
  if (typeof comment === 'string' && comment.length > VALIDATION.REVIEW_COMMENT_MAX) {
    return NextResponse.json({ error: `コメントは${VALIDATION.REVIEW_COMMENT_MAX}文字以内で入力してください` }, { status: 400 })
  }

  const db = getDb()

  const { data: order } = await db
    .from('projects')
    .select('id, client_id, creator_id, status')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
  if (order.status !== 'completed') return NextResponse.json({ error: '完了した依頼のみ評価できます' }, { status: 400 })

  const isClient  = order.client_id  === user.id
  const isCreator = order.creator_id === user.id

  if (!isClient && !isCreator) {
    return NextResponse.json({ error: '評価できる権限がありません' }, { status: 403 })
  }

  const reviewType = isClient ? 'order_to_creator' : 'order_to_client'
  const revieweeId = isClient ? order.creator_id   : order.client_id

  // 重複チェック
  const { data: existing } = await db
    .from('reviews')
    .select('id')
    .eq('project_id', orderId)
    .eq('reviewer_id', user.id)
    .eq('reviewee_id', revieweeId)
    .single()

  if (existing) return NextResponse.json({ error: 'すでに評価を投稿しています' }, { status: 409 })

  const { error } = await db.from('reviews').insert({
    review_type:  reviewType,
    project_id:   orderId,
    reviewer_id:  user.id,
    reviewee_id:  revieweeId,
    rating:       r,
    comment:      typeof comment === 'string' ? comment.trim() || null : null,
  })

  if (error) return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
