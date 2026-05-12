import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'
import { TRANSFER_FEE } from '@/lib/stripe'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

export default async function CreatorReceiptPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/payments/${params.id}/creator-receipt`)

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: payment } = await db
    .from('payments')
    .select(`
      id, amount, fee, refunded_amount, status, paid_at,
      projects!inner(
        id, title, description, client_id, creator_id,
        client:users!projects_client_id_fkey(id, display_name),
        creator:users!projects_creator_id_fkey(id, display_name)
      )
    `)
    .eq('id', params.id)
    .single()

  if (!payment) return notFound()

  const proj = payment.projects as unknown as {
    id: string; title: string; description: string | null
    client_id: string; creator_id: string
    client: { id: string; display_name: string | null }
    creator: { id: string; display_name: string | null }
  }

  // クリエイターまたは管理者のみアクセス可
  if (proj.creator_id !== user.id && !isAdmin(user.id)) redirect('/dashboard')

  // 振込済みのみ発行可
  if (payment.status !== 'payout_paid') return notFound()

  // payout 情報取得
  const { data: payout } = await db
    .from('creator_payouts')
    .select('id, amount, paid_at')
    .eq('payment_id', payment.id)
    .single()

  if (!payout) return notFound()

  const payoutAmount  = payout.amount
  const platformFee   = payment.fee ?? 0
  const transferFee   = TRANSFER_FEE
  const grossAmount   = payment.amount
  const refunded      = payment.refunded_amount ?? 0

  const issueDate = payout.paid_at
    ? new Date(payout.paid_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const docNo = `CR-${payout.id.slice(0, 8).toUpperCase()}`

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* 印刷ボタン（印刷時は非表示） */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">クリエイター向け領収書 — {docNo}</span>
        <PrintButton />
      </div>

      {/* 領収書本文 */}
      <div className="max-w-2xl mx-auto my-8 print:my-0 bg-white shadow-sm print:shadow-none p-10 print:p-8">

        {/* タイトル */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">領 収 書</h1>
            <p className="text-xs text-gray-400">（業務委託料 お振込証明）</p>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-1">
            <div>発行日: {issueDate}</div>
            <div>領収書番号: {docNo}</div>
          </div>
        </div>

        {/* 受取人 */}
        <div className="mb-6">
          <div className="text-xs text-gray-400 mb-1">受取人（クリエイター）</div>
          <div className="text-xl font-bold text-gray-900">{proj.creator?.display_name ?? '—'} 様</div>
        </div>

        {/* 金額 */}
        <div className="bg-gray-50 border-2 border-gray-900 rounded-lg px-6 py-5 mb-8 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 mb-1">お振込金額（税込）</div>
            <div className="text-4xl font-bold text-gray-900">¥{payoutAmount.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">但し書き</div>
            <div className="text-sm font-medium text-gray-700 max-w-[200px] text-right">{proj.title} 業務委託料として</div>
          </div>
        </div>

        {/* 金額明細 */}
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b border-t border-gray-300">
              <th className="text-left py-2 text-gray-600 font-semibold">項　目</th>
              <th className="text-right py-2 text-gray-600 font-semibold w-32">金　額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2.5 text-gray-700">受注金額</td>
              <td className="py-2.5 text-right text-gray-900 font-medium">¥{grossAmount.toLocaleString()}</td>
            </tr>
            {refunded > 0 && (
              <tr>
                <td className="py-2.5 text-gray-700">差引返金額</td>
                <td className="py-2.5 text-right text-red-600">▲¥{refunded.toLocaleString()}</td>
              </tr>
            )}
            <tr>
              <td className="py-2.5 text-gray-700">
                差引事務手数料（Cralia プラットフォーム手数料）
              </td>
              <td className="py-2.5 text-right text-red-600">▲¥{platformFee.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="py-2.5 text-gray-700">差引振込手数料</td>
              <td className="py-2.5 text-right text-red-600">▲¥{transferFee.toLocaleString()}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-900">
              <td className="py-3 font-bold text-gray-900">お振込金額</td>
              <td className="py-3 text-right font-bold text-xl text-gray-900">¥{payoutAmount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        {/* 発行元・備考 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-xs text-gray-400 mb-1">振込元（発行者）</div>
            <div className="font-semibold text-gray-800">{proj.client?.display_name ?? '—'} 様</div>
            <div className="text-xs text-gray-400">経由: Cralia プラットフォーム</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">振込日</div>
            <div className="font-semibold text-gray-800">{issueDate}</div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500 space-y-1">
          <div>・ 本領収書は電子的に発行されたものです。</div>
          <div>・ 確定申告の収入証明書類としてご使用いただけます。</div>
          <div>・ 本書に記載の振込金額が実際のお振込金額です。</div>
        </div>

        <div className="border-t border-gray-200 mt-6 pt-4 text-right">
          <div className="text-xs text-gray-400">Cralia プラットフォーム 発行</div>
        </div>
      </div>
    </div>
  )
}
