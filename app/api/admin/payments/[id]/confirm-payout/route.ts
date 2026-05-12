import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'
import { PAYMENT_STATUS } from '@/lib/constants/statuses'

const ALLOWED_FROM = [PAYMENT_STATUS.HELD, PAYMENT_STATUS.PARTIALLY_REFUNDED]

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!isAdmin(user.id)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const db = getDb()
  const { data: payment } = await db
    .from('payments')
    .select('id, status')
    .eq('id', params.id)
    .single()

  if (!payment) return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 })

  // 冪等: 既に payout_pending なら 200
  if (payment.status === PAYMENT_STATUS.PAYOUT_PENDING) {
    return NextResponse.json({ ok: true })
  }

  // refund_pending 中は禁止
  if (payment.status === PAYMENT_STATUS.REFUND_PENDING) {
    return NextResponse.json(
      { error: '返金処理中のため操作できません。処理完了後に再試行してください。' },
      { status: 423 }
    )
  }

  // payout_paid 以降は変更不可
  if (payment.status === PAYMENT_STATUS.PAYOUT_PAID) {
    return NextResponse.json({ error: '振込済みのため操作できません' }, { status: 409 })
  }

  if (!ALLOWED_FROM.includes(payment.status as typeof ALLOWED_FROM[number])) {
    return NextResponse.json(
      { error: `現在のステータス（${payment.status}）では支払確定できません` },
      { status: 409 }
    )
  }

  const { error } = await db.from('payments').update({
    status: PAYMENT_STATUS.PAYOUT_PENDING,
    updated_at: new Date().toISOString(),
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
