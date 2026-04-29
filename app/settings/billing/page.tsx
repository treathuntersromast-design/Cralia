import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Check } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/settings/billing')

  const { data: userData } = await supabase
    .from('users')
    .select('entity_type')
    .eq('id', user.id)
    .single()

  const isCorporate = userData?.entity_type === 'corporate'

  const currentFeatures = [
    'プロフィール公開・クリエイター検索',
    'ポートフォリオ掲載',
    '依頼の送受信・管理',
    'プロジェクトボード',
    'クリエイター・依頼者検索',
    'イベント参加',
  ]

  const individualFeatures = ['無制限のポートフォリオ掲載', 'エスクロー決済', 'AI自己紹介文作成', '優先サポート']

  const corporateFeatures = [
    '個人プランの全機能',
    'チームアカウント・担当者管理',
    '発注承認ワークフロー',
    '請求書払い（銀行振込）対応',
    '発注履歴CSVエクスポート・領収書PDF発行',
    '専任サポート・SLA対応',
  ]

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <h1 className="text-[26px] font-bold mb-2">プランと請求</h1>
        <p className="text-[14px] text-[var(--c-text-3)] mb-8">ご利用中のプランと今後の機能予定</p>

        {/* ベータ版バナー */}
        <div className="bg-[#4ade80]/8 border border-[#4ade80]/25 rounded-card p-5 mb-8 flex items-start gap-4">
          <Check size={20} className="text-[#16a34a] shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-bold text-[15px] text-[#16a34a] mb-1">ベータ版期間中は全機能を無料でご利用いただけます</p>
            <p className="text-[13px] text-[var(--c-text-2)] leading-[1.7]">
              正式リリース後は個人向け・法人向けのプランを提供予定です。ベータ版終了の際は事前にお知らせします。
            </p>
          </div>
        </div>

        {/* 現在のプラン */}
        <section className="mb-8">
          <h2 className="text-[12px] font-bold text-[var(--c-text-3)] tracking-wider uppercase mb-4">現在のプラン</h2>
          <div className="bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-card p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[22px] font-bold mb-1">ベータプラン</p>
                <p className="text-[15px] font-bold text-[#16a34a]">¥0 / 月（ベータ期間中）</p>
              </div>
              <Badge tone="ok" variant="soft">利用中</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {currentFeatures.map((label) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Check size={15} className="text-[#16a34a] shrink-0" aria-hidden />
                  <span className="text-[14px] text-[var(--c-text)]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 今後のプラン予定 */}
        <section className="mb-8">
          <h2 className="text-[12px] font-bold text-[var(--c-text-3)] tracking-wider uppercase mb-4">正式リリース後のプラン（予定）</h2>
          <div className="flex flex-col gap-4">

            {/* 個人プラン */}
            <Card bordered padded>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[18px] font-bold mb-0.5">個人プラン</p>
                  <p className="text-[13px] text-[var(--c-text-3)]">個人クリエイター・フリーランス向け</p>
                </div>
                <Badge tone="neutral" variant="soft">準備中</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {individualFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    <span className="text-[13px] text-[var(--c-text-2)]">{f}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 法人プラン */}
            <Card bordered padded className="relative overflow-hidden">
              {isCorporate && (
                <div className="absolute top-3 right-3">
                  <Badge tone="brand" variant="soft">あなたのアカウントタイプ</Badge>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[18px] font-bold mb-0.5">法人プラン</p>
                  <p className="text-[13px] text-[var(--c-text-3)]">企業・団体・サークル向け</p>
                </div>
                <Badge tone="neutral" variant="soft">準備中</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {corporateFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] shrink-0" />
                    <span className="text-[13px] text-[var(--c-text-2)]">{f}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* 法人向け早期アクセス */}
        {isCorporate && (
          <section className="mb-8">
            <div className="bg-[#60a5fa]/5 border border-[#60a5fa]/20 rounded-card p-6 text-center">
              <p className="font-bold text-[16px] mb-2">法人向けプランの早期アクセス登録</p>
              <p className="text-[13px] text-[var(--c-text-3)] mb-4 leading-[1.7]">
                正式リリース前に法人プランのご案内を希望される場合はお問い合わせください。
              </p>
              <button
                type="button"
                disabled
                className="h-10 px-7 rounded-[8px] border border-[#60a5fa]/30 bg-[#60a5fa]/8 text-[#60a5fa] text-[14px] font-bold cursor-not-allowed opacity-70"
              >
                お問い合わせ（準備中）
              </button>
            </div>
          </section>
        )}

        <p className="text-[12px] text-[var(--c-text-4)] leading-[1.8] text-center">
          プラン内容・価格はベータ期間終了前に正式発表予定です。<br />
          ご不明点は <Link href="/settings" className="text-[var(--c-text-3)] underline">設定ページ</Link> からお問い合わせください。
        </p>
      </Container>
    </div>
  )
}
