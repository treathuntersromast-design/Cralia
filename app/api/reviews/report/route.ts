/**
 * POST /api/reviews/report — 評価への異議申し立て
 *
 * - 被評価者（reviewee_id === current user）のみ報告可能
 * - 同一レビューへの重複報告不可
 * - 報告への対応には 1〜2 週間かかります
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

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { reviewId, reason } = body

  if (typeof reviewId !== 'string') {
    return NextResponse.json({ error: 'reviewId は必須です' }, { status: 400 })
  }
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({ error: '報告理由を入力してください' }, { status: 400 })
  }
  if (reason.length > VALIDATION.REPORT_REASON_MAX) {
    return NextResponse.json({ error: `報告理由は${VALIDATION.REPORT_REASON_MAX}文字以内で入力してください` }, { status: 400 })
  }

  const db = getDb()

  // レビューの存在確認 + 被評価者チェック
  const { data: review } = await db
    .from('reviews')
    .select('id, reviewee_id')
    .eq('id', reviewId)
    .single()

  if (!review) return NextResponse.json({ error: '評価が見つかりません' }, { status: 404 })
  if (review.reviewee_id !== user.id) {
    return NextResponse.json({ error: '自分への評価のみ報告できます' }, { status: 403 })
  }

  // 重複チェック
  const { data: existing } = await db
    .from('evaluation_reports')
    .select('id')
    .eq('review_id', reviewId)
    .eq('reporter_id', user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'この評価はすでに報告済みです' }, { status: 409 })

  const { error } = await db.from('evaluation_reports').insert({
    review_id:   reviewId,
    reporter_id: user.id,
    reason:      reason.trim(),
  })

  if (error) return NextResponse.json({ error: '報告の送信に失敗しました' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
