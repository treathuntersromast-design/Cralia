import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STALE_PROCESSING_MINUTES } from '@/lib/stripe'

// Stripe v22 doesn't expose its types via the default StripeConstructor export.
// Define the minimal shapes we need from verified webhook payloads.
interface CheckoutSession {
  metadata?: Record<string, string> | null
  payment_status: string
  amount_total: number | null
  currency: string | null
  payment_intent: string | { id: string } | null
}
interface StripeRefund {
  id: string
  amount: number
  payment_intent: string | { id: string } | null
  status: string | null
  reason: string | null
  failure_reason?: string | null
}
interface StripeWebhookEvent {
  id: string
  type: string
  data: { object: unknown }
}
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { PAYMENT_STATUS } from '@/lib/constants/statuses'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function markEventProcessing(db: ReturnType<typeof getDb>, eventId: string, eventType: string): Promise<'new' | 'skip'> {
  // INSERT を試みる（status='processing'）
  const { error } = await db.from('stripe_webhook_events').insert({
    event_id: eventId,
    event_type: eventType,
    status: 'processing',
  })

  if (!error) return 'new'  // 新規 → 処理する

  // UNIQUE 違反: 既存レコードを確認
  const { data: existing } = await db
    .from('stripe_webhook_events')
    .select('status, processed_at')
    .eq('event_id', eventId)
    .single()

  if (!existing) return 'skip'
  if (existing.status === 'processed' || existing.status === 'failed') return 'skip'

  // processing: stale 判定（STALE_PROCESSING_MINUTES 分超過で再処理）
  const processedAt = new Date(existing.processed_at).getTime()
  const staleMs = STALE_PROCESSING_MINUTES * 60 * 1000
  if (Date.now() - processedAt > staleMs) {
    await db.from('stripe_webhook_events').update({
      status: 'processing',
      processed_at: new Date().toISOString(),
    }).eq('event_id', eventId)
    return 'new'  // stale → 再処理
  }

  return 'skip'  // 別プロセスが処理中
}

async function markEventDone(db: ReturnType<typeof getDb>, eventId: string) {
  await db.from('stripe_webhook_events').update({ status: 'processed' }).eq('event_id', eventId)
}

async function markEventFailed(db: ReturnType<typeof getDb>, eventId: string, message: string) {
  await db.from('stripe_webhook_events').update({
    status: 'failed',
    error_message: message.slice(0, 500),
  }).eq('event_id', eventId)
}

// ---------- イベントハンドラ ----------

async function handleCheckoutCompleted(db: ReturnType<typeof getDb>, session: CheckoutSession) {
  const paymentId = session.metadata?.payment_id
  if (!paymentId) return

  if (session.payment_status !== 'paid') return

  const { data: payment } = await db
    .from('payments')
    .select('id, amount, currency, status')
    .eq('id', paymentId)
    .single()

  if (!payment) return

  // amount / currency 不一致チェック
  const amountMismatch   = session.amount_total !== payment.amount
  const currencyMismatch = session.currency !== payment.currency

  if (amountMismatch || currencyMismatch) {
    console.error(`[webhook] payment mismatch: id=${paymentId} DB=${payment.amount}/${payment.currency} Stripe=${session.amount_total}/${session.currency}`)
    await db.from('payments').update({ status: PAYMENT_STATUS.PAYMENT_MISMATCH }).eq('id', paymentId)
    return
  }

  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null

  await db.from('payments').update({
    status: PAYMENT_STATUS.HELD,
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: paymentIntentId,
    payment_status: session.payment_status,
    updated_at: new Date().toISOString(),
  }).eq('id', paymentId)
}

async function handleCheckoutExpired(db: ReturnType<typeof getDb>, session: CheckoutSession) {
  const paymentId = session.metadata?.payment_id
  if (!paymentId) return

  // pending のみ expired に更新（held 以降は触らない）
  await db.from('payments')
    .update({ status: PAYMENT_STATUS.EXPIRED, updated_at: new Date().toISOString() })
    .eq('id', paymentId)
    .eq('status', PAYMENT_STATUS.PENDING)
}

async function handleRefundCreated(db: ReturnType<typeof getDb>, refund: StripeRefund) {
  const paymentIntentId = typeof refund.payment_intent === 'string' ? refund.payment_intent : null
  if (!paymentIntentId) return

  const { data: payment } = await db
    .from('payments')
    .select('id, status')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single()

  if (!payment) return

  // refunds に pending 記録のみ。refunded_amount は加算しない（refund.updated(succeeded) まで待つ）
  await db.from('refunds').upsert({
    payment_id:              payment.id,
    stripe_refund_id:        refund.id,
    amount:                  refund.amount,
    status:                  'pending',
    previous_payment_status: payment.status,
    reason:                  refund.reason ?? null,
    updated_at:              new Date().toISOString(),
  }, { onConflict: 'stripe_refund_id', ignoreDuplicates: false })
}

async function handleRefundUpdated(db: ReturnType<typeof getDb>, refund: StripeRefund) {
  const { data: refundRow } = await db
    .from('refunds')
    .select('id, payment_id, amount, previous_payment_status')
    .eq('stripe_refund_id', refund.id)
    .single()

  if (!refundRow) return

  const { data: payment } = await db
    .from('payments')
    .select('id, amount, refunded_amount')
    .eq('id', refundRow.payment_id)
    .single()

  if (!payment) return

  if (refund.status === 'succeeded') {
    // 成功確認後にはじめて refunded_amount を加算
    const newRefundedTotal = (payment.refunded_amount ?? 0) + refundRow.amount
    const isFullRefund     = newRefundedTotal >= payment.amount

    await Promise.all([
      db.from('refunds').update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
      }).eq('stripe_refund_id', refund.id),
      db.from('payments').update({
        refunded_amount: newRefundedTotal,
        status: isFullRefund ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED,
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id),
    ])
  } else if (refund.status === 'failed' || refund.status === 'canceled') {
    // 失敗・キャンセル: refunded_amount は変更しない（pending 中は加算していないため）
    // previous_payment_status に戻す
    await Promise.all([
      db.from('refunds').update({
        status: refund.status,
        failure_reason: refund.failure_reason ?? null,
        updated_at: new Date().toISOString(),
      }).eq('stripe_refund_id', refund.id),
      db.from('payments').update({
        status: refundRow.previous_payment_status ?? PAYMENT_STATUS.HELD,
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id),
    ])
  }
  // TODO: Stripe Refund 状態を手動で再同期したい場合は
  // GET /api/admin/payments/[id]/sync-refund エンドポイントを追加し、
  // stripe.refunds.retrieve(stripe_refund_id) → この関数を再呼び出しする
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: StripeWebhookEvent
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!) as unknown as StripeWebhookEvent
  } catch (e) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${e instanceof Error ? e.message : ''}` },
      { status: 400 }
    )
  }

  const db = getDb()

  const result = await markEventProcessing(db, event.id, event.type)
  if (result === 'skip') {
    return NextResponse.json({ skipped: 'already processed or in progress' })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(db, event.data.object as CheckoutSession)
        break
      case 'checkout.session.expired':
        await handleCheckoutExpired(db, event.data.object as CheckoutSession)
        break
      case 'refund.created':
        await handleRefundCreated(db, event.data.object as StripeRefund)
        break
      case 'refund.updated':
      case 'charge.refund.updated':
        await handleRefundUpdated(db, event.data.object as StripeRefund)
        break
      default:
        // 未処理イベントは processed として記録
        break
    }

    await markEventDone(db, event.id)
    return NextResponse.json({ received: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[webhook] event=${event.type} id=${event.id} error:`, msg)
    await markEventFailed(db, event.id, msg)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
