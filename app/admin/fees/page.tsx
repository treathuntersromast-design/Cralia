import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/isAdmin'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { PLATFORM_FEE_RATE, TRANSFER_FEE } from '@/lib/stripe'
import { VALIDATION } from '@/lib/constants/validation'
import { ChevronLeft, Info } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminFeesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdmin(user.id, user.email)) redirect('/dashboard')

  const rows = [
    {
      label: '事務手数料',
      value: `${(PLATFORM_FEE_RATE * 100).toFixed(0)}%`,
      desc: 'クリエイター報酬から差し引かれるプラットフォーム手数料',
      example: `依頼金額 10,000円 → 手数料 ${(10000 * PLATFORM_FEE_RATE).toLocaleString()}円`,
      key: 'PLATFORM_FEE_RATE',
    },
    {
      label: '振込手数料',
      value: `¥${TRANSFER_FEE.toLocaleString()}`,
      desc: 'クリエイターへ振り込む際に差し引かれる固定手数料（クリエイター負担）',
      example: `依頼金額 10,000円 → 振込手数料 ${TRANSFER_FEE.toLocaleString()}円`,
      key: 'TRANSFER_FEE',
    },
    {
      label: '依頼金額の最低金額',
      value: `¥${VALIDATION.MIN_PROJECT_BUDGET.toLocaleString()}`,
      desc: '振込手数料を差し引いた後に最低限の金額を確保するための下限',
      example: `最低 ${VALIDATION.MIN_PROJECT_BUDGET.toLocaleString()}円未満の依頼は作成不可`,
      key: 'MIN_PROJECT_BUDGET',
    },
  ]

  const example = 10000
  const fee = Math.round(example * PLATFORM_FEE_RATE)
  const payout = example - fee - TRANSFER_FEE

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader isAdminUser isDashboard={false} />
      <Container className="py-8 max-w-2xl">
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-[var(--c-text-3)] hover:text-brand no-underline mb-6 transition-colors">
          <ChevronLeft size={14} /> 管理者メニューに戻る
        </Link>

        <h1 className="text-xl font-bold text-[var(--c-text)] mb-1">手数料設定</h1>
        <p className="text-xs text-[var(--c-text-3)] mb-6">
          手数料の変更はソースコード（<code className="bg-[var(--c-surface-2)] px-1 rounded">lib/stripe.ts</code>）を編集してください。
        </p>

        <div className="space-y-3 mb-8">
          {rows.map(r => (
            <div key={r.key} className="bg-[var(--c-surface)] border border-[var(--c-border-2)] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="font-semibold text-[var(--c-text)] text-sm">{r.label}</div>
                  <div className="text-xs text-[var(--c-text-3)] mt-0.5">{r.desc}</div>
                </div>
                <div className="text-2xl font-bold text-brand flex-shrink-0">{r.value}</div>
              </div>
              <div className="text-xs text-[var(--c-text-4)] bg-[var(--c-surface-2)] rounded-lg px-3 py-1.5">
                例: {r.example}
              </div>
            </div>
          ))}
        </div>

        {/* 振込額シミュレーション */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border-2)] rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text)] mb-4">
            <Info size={16} aria-hidden />
            振込額シミュレーション（依頼金額 ¥{example.toLocaleString()} の場合）
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--c-text-3)]">依頼金額</span>
              <span className="font-medium text-[var(--c-text)]">¥{example.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--c-text-3)]">事務手数料（{(PLATFORM_FEE_RATE * 100).toFixed(0)}%）</span>
              <span className="text-red-500">▲¥{fee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--c-text-3)]">振込手数料（固定）</span>
              <span className="text-red-500">▲¥{TRANSFER_FEE.toLocaleString()}</span>
            </div>
            <div className="border-t border-[var(--c-border)] pt-2 flex justify-between font-bold">
              <span className="text-[var(--c-text)]">クリエイター振込額</span>
              <span className="text-brand">¥{payout.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
