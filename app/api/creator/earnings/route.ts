import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { PAYMENT_STATUS } from '@/lib/constants/statuses'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const db = getDb()

  const [{ data: payouts }, { data: pendingPayments }] = await Promise.all([
    // 振込済み: id/payment_id/amount/paid_at のみ（bank_info は creator_payout_bank_details にあり非公開）
    db.from('creator_payouts')
      .select(`
        id, payment_id, amount, paid_at,
        payments!inner(project_id, projects!inner(title))
      `)
      .eq('creator_id', user.id)
      .order('paid_at', { ascending: false }),

    // 支払確定済み（振込待ち）
    db.from('payments')
      .select('id, amount, fee, refunded_amount, project_id, projects!inner(title, creator_id)')
      .eq('status', PAYMENT_STATUS.PAYOUT_PENDING)
      .eq('projects.creator_id', user.id),
  ])

  const totalEarned = (payouts ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const pendingPayout = (pendingPayments ?? []).reduce((sum, p) => {
    const payoutAmount = (p.amount ?? 0) - (p.fee ?? 0) - (p.refunded_amount ?? 0)
    return sum + Math.max(0, payoutAmount)
  }, 0)

  // Supabase SDK returns joined FK rows as arrays regardless of cardinality
  const payoutList = ((payouts ?? []) as unknown as {
    id: string; amount: number; paid_at: string | null
    payments: { project_id: string; projects: { title: string }[] }[]
  }[]).map((p) => ({
    id: p.id,
    amount: p.amount,
    paid_at: p.paid_at,
    project_title: p.payments?.[0]?.projects?.[0]?.title ?? null,
  }))

  return NextResponse.json({
    total_earned: totalEarned,
    pending_payout: pendingPayout,
    payouts: payoutList,
  })
}
