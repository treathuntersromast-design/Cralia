import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'
import { getStripe } from '@/lib/stripe'
import { PAYMENT_STATUS, PaymentStatus, isRefundable } from '@/lib/constants/statuses'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!isAdmin(user.id, user.email)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  let body: { amount?: unknown } = {}
  try { body = await req.json() } catch { /* amount は任意 */ }

  const db = getDb()
  const { data: payment } = await db
    .from('payments')
    .select('id, status, amount, refunded_amount, stripe_payment_intent_id')
    .eq('id', params.id)
    .single()

  if (!payment) return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 })

  // ステータスガード
  if (payment.status === PAYMENT_STATUS.PAYOUT_PAID) {
    return NextResponse.json({ error: '振込済みのため返金できません' }, { status: 409 })
  }
  if (payment.status === PAYMENT_STATUS.PAYOUT_PENDING) {
    return NextResponse.json(
      { error: '支払確定済みです。返金する場合はまず支払確定を取消してください。' },
      { status: 409 }
    )
  }
  if (payment.status === PAYMENT_STATUS.REFUND_PENDING) {
    return NextResponse.json({ error: '返金処理中です。処理完了後に再試行してください。' }, { status: 423 })
  }
  if (!isRefundable(payment.status as PaymentStatus)) {
    return NextResponse.json(
      { error: `現在のステータス（${payment.status}）では返金できません` },
      { status: 409 }
    )
  }
  if (!payment.stripe_payment_intent_id) {
    return NextResponse.json({ error: '支払情報が見つかりません（Stripe決済が完了していません）' }, { status: 400 })
  }

  // 返金額の決定と超過チェック
  const refundedSoFar     = payment.refunded_amount ?? 0
  const maxRefundable     = payment.amount - refundedSoFar
  const requestedAmount   = typeof body.amount === 'number' ? body.amount : maxRefundable

  if (requestedAmount <= 0) {
    return NextResponse.json({ error: '返金額は 1 円以上である必要があります' }, { status: 400 })
  }
  if (requestedAmount > maxRefundable) {
    return NextResponse.json(
      { error: `返金可能額（${maxRefundable}円）を超えています` },
      { status: 400 }
    )
  }

  // payment を refund_pending に更新
  await db.from('payments').update({
    status: PAYMENT_STATUS.REFUND_PENDING,
    updated_at: new Date().toISOString(),
  }).eq('id', params.id)

  // Stripe refunds.create
  try {
    await getStripe().refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: requestedAmount,
    })
  } catch (e) {
    // Stripe API 失敗: 元のステータスに戻す
    await db.from('payments').update({
      status: payment.status,
      updated_at: new Date().toISOString(),
    }).eq('id', params.id)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `返金に失敗しました: ${msg}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, refund_amount: requestedAmount })
}
