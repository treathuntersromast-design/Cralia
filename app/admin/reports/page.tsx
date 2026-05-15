import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { ChevronLeft } from 'lucide-react'
import { PLATFORM_FEE_RATE, TRANSFER_FEE } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdmin(user.id, user.email)) redirect('/dashboard')

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: payments } = await db
    .from('payments')
    .select('amount, fee, refunded_amount, status, paid_at, created_at')
    .in('status', ['held', 'payout_pending', 'payout_paid', 'refunded', 'partially_refunded'])
    .order('created_at', { ascending: false })

  const total = payments ?? []

  const totalRevenue   = total.reduce((s, p) => s + (p.amount ?? 0), 0)
  const totalFees      = total.reduce((s, p) => s + (p.fee ?? 0), 0)
  const totalRefunded  = total.reduce((s, p) => s + (p.refunded_amount ?? 0), 0)
  const paidOut        = total.filter(p => p.status === 'payout_paid')
  const totalPayouts   = paidOut.reduce((s, p) => s + (p.amount - (p.fee ?? 0) - TRANSFER_FEE - (p.refunded_amount ?? 0)), 0)
  const transferFeeTotal = paidOut.length * TRANSFER_FEE

  const stats = [
    { label: '総決済金額', value: `¥${totalRevenue.toLocaleString()}`, desc: 'プラットフォーム経由の総決済額' },
    { label: '手数料収入合計', value: `¥${totalFees.toLocaleString()}`, desc: `事務手数料（${(PLATFORM_FEE_RATE * 100).toFixed(0)}%）の累計` },
    { label: '振込手数料収入', value: `¥${transferFeeTotal.toLocaleString()}`, desc: `振込手数料（¥${TRANSFER_FEE}/件 × ${paidOut.length}件）` },
    { label: '総返金額', value: `¥${totalRefunded.toLocaleString()}`, desc: '返金した金額の累計' },
    { label: '総振込額', value: `¥${totalPayouts.toLocaleString()}`, desc: 'クリエイターへの振込累計（手数料控除後）' },
  ]

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader isAdminUser isDashboard={false} />
      <Container className="py-8 max-w-3xl">
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-[var(--c-text-3)] hover:text-brand no-underline mb-6 transition-colors">
          <ChevronLeft size={14} /> 管理者メニューに戻る
        </Link>
        <h1 className="text-xl font-bold text-[var(--c-text)] mb-6">売上レポート</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-[var(--c-surface)] border border-[var(--c-border-2)] rounded-2xl p-5">
              <div className="text-xs text-[var(--c-text-3)] mb-1">{s.label}</div>
              <div className="text-2xl font-bold text-[var(--c-text)] mb-1">{s.value}</div>
              <div className="text-xs text-[var(--c-text-4)]">{s.desc}</div>
            </div>
          ))}
        </div>

        <div className="text-xs text-[var(--c-text-4)] bg-[var(--c-surface-2)] rounded-2xl px-4 py-3">
          ※ 振込済み（payout_paid）の件数を元に集計しています。月次・期間フィルターは今後追加予定です。
        </div>
      </Container>
    </div>
  )
}
