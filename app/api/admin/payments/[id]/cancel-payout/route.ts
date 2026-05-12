import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'
import { PAYMENT_STATUS } from '@/lib/constants/statuses'

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
    .select('id, status, refunded_amount')
    .eq('id', params.id)
    .single()

  if (!payment) return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 })

  if (payment.status !== PAYMENT_STATUS.PAYOUT_PENDING) {
    if (payment.status === PAYMENT_STATUS.PAYOUT_PAID) {
      return NextResponse.json({ error: '振込済みのため取消できません' }, { status: 409 })
    }
    return NextResponse.json(
      { error: `現在のステータス（${payment.status}）では支払確定取消できません` },
      { status: 409 }
    )
  }

  // 返金済み分があれば partially_refunded、なければ held に戻す
  const nextStatus = (payment.refunded_amount ?? 0) > 0
    ? PAYMENT_STATUS.PARTIALLY_REFUNDED
    : PAYMENT_STATUS.HELD

  const { error } = await db.from('payments').update({
    status: nextStatus,
    updated_at: new Date().toISOString(),
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })

  return NextResponse.json({ ok: true, status: nextStatus })
}
