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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!isAdmin(user.id)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  let body: { admin_note?: unknown } = {}
  try { body = await req.json() } catch { /* noop */ }

  const db = getDb()
  const { data: payment } = await db
    .from('payments')
    .select('id, status')
    .eq('id', params.id)
    .single()

  if (!payment) return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 })

  const disputeableStatuses = [
    PAYMENT_STATUS.HELD,
    PAYMENT_STATUS.PARTIALLY_REFUNDED,
    PAYMENT_STATUS.PAYOUT_PENDING,
    PAYMENT_STATUS.PAYMENT_MISMATCH,
  ]
  if (!disputeableStatuses.includes(payment.status as typeof disputeableStatuses[number])) {
    return NextResponse.json(
      { error: `ステータス（${payment.status}）では要確認操作は行えません` },
      { status: 409 }
    )
  }

  const { error } = await db
    .from('payments')
    .update({
      status: PAYMENT_STATUS.DISPUTED,
      admin_note: typeof body.admin_note === 'string' ? body.admin_note : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
