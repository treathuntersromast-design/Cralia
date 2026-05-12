import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'
import { PAYMENT_STATUS } from '@/lib/constants/statuses'
import { TRANSFER_FEE } from '@/lib/stripe'

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
  if (!isAdmin(user.id)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  let body: { bank_info?: unknown } = {}
  try { body = await req.json() } catch { /* bank_info は任意 */ }

  const bankInfo = typeof body.bank_info === 'string' ? body.bank_info.trim() : ''

  const db = getDb()
  const { data: payment } = await db
    .from('payments')
    .select('id, status, amount, fee, refunded_amount, project_id')
    .eq('id', params.id)
    .single()

  if (!payment) return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 })

  if (payment.status === PAYMENT_STATUS.REFUND_PENDING) {
    return NextResponse.json(
      { error: '返金処理中のため操作できません。処理完了後に再試行してください。' },
      { status: 423 }
    )
  }

  if (payment.status !== PAYMENT_STATUS.PAYOUT_PENDING) {
    return NextResponse.json(
      { error: `現在のステータス（${payment.status}）では振込登録できません` },
      { status: 409 }
    )
  }

  // payout_amount = amount - 事務手数料(fee) - 振込手数料(TRANSFER_FEE) - refunded_amount
  const payoutAmount = payment.amount - (payment.fee ?? 0) - TRANSFER_FEE - (payment.refunded_amount ?? 0)
  if (payoutAmount <= 0) {
    return NextResponse.json(
      { error: '手数料・振込手数料控除後の支払額が 0 以下のため振込登録できません' },
      { status: 400 }
    )
  }

  // project から creator_id を取得
  const { data: project } = await db
    .from('projects')
    .select('creator_id')
    .eq('id', payment.project_id)
    .single()

  if (!project) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })

  // creator_payouts INSERT（payment_id UNIQUE で二重防止）
  const { data: payout, error: payoutErr } = await db
    .from('creator_payouts')
    .insert({
      payment_id: payment.id,
      creator_id: project.creator_id,
      amount:     payoutAmount,
      paid_at:    new Date().toISOString(),
    })
    .select('id')
    .single()

  if (payoutErr) {
    if (payoutErr.code === '23505') {
      return NextResponse.json({ error: 'この決済はすでに振込登録済みです' }, { status: 409 })
    }
    return NextResponse.json({ error: '振込登録に失敗しました' }, { status: 500 })
  }

  // bank_info を creator_payout_bank_details に保存
  if (bankInfo && payout) {
    await db.from('creator_payout_bank_details').insert({
      creator_payout_id: payout.id,
      bank_info: bankInfo,
    })
  }

  // payment.status → payout_paid
  await db.from('payments').update({
    status: PAYMENT_STATUS.PAYOUT_PAID,
    updated_at: new Date().toISOString(),
  }).eq('id', payment.id)

  return NextResponse.json({ ok: true, payout_amount: payoutAmount })
}
