import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'
import { PAYMENT_STATUS } from '@/lib/constants/statuses'
import PrintButton from '@/components/ui/PrintButton'

export const dynamic = 'force-dynamic'

export default async function PurchaseOrderPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/payments/${params.id}/purchase-order`)

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: payment } = await db
    .from('payments')
    .select(`
      id, amount, fee, status, paid_at, created_at,
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

  // 依頼者または管理者のみアクセス可
  if (proj.client_id !== user.id && !isAdmin(user.id, user.email)) redirect('/dashboard')

  const allowed = [
    PAYMENT_STATUS.HELD,
    PAYMENT_STATUS.PAYOUT_PENDING,
    PAYMENT_STATUS.PAYOUT_PAID,
    PAYMENT_STATUS.REFUNDED,
    PAYMENT_STATUS.PARTIALLY_REFUNDED,
    PAYMENT_STATUS.DISPUTED,
  ]
  if (!allowed.includes(payment.status as typeof allowed[number])) return notFound()

  // メールアドレス取得
  const { data: clientAuth } = await db.auth.admin.getUserById(proj.client_id)
  const clientEmail = clientAuth?.user?.email ?? ''

  const issueDate = payment.paid_at
    ? new Date(payment.paid_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date(payment.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  const docNo = `PO-${payment.id.slice(0, 8).toUpperCase()}`

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* 印刷ボタン（印刷時は非表示） */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">発注書 — {docNo}</span>
        <PrintButton />
      </div>

      {/* 発注書本文 */}
      <div className="max-w-2xl mx-auto my-8 print:my-0 bg-white shadow-sm print:shadow-none p-10 print:p-8">

        {/* タイトル */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">発 注 書</h1>
            <p className="text-xs text-gray-400">（注文書）</p>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-1">
            <div>発行日: {issueDate}</div>
            <div>発注書番号: {docNo}</div>
          </div>
        </div>

        {/* 宛先・発行元 */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-xs text-gray-400 mb-1">発注者（お支払い者）</div>
            <div className="text-base font-bold text-gray-900">{proj.client?.display_name ?? '—'} 様</div>
            {clientEmail && <div className="text-xs text-gray-500 mt-0.5">{clientEmail}</div>}
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">受注者（業務委託先）</div>
            <div className="text-base font-bold text-gray-900">{proj.creator?.display_name ?? '—'} 様</div>
            <div className="text-xs text-gray-400 mt-0.5">仲介: Cralia プラットフォーム</div>
          </div>
        </div>

        <hr className="border-gray-200 mb-6" />

        {/* 発注内容 */}
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b border-t border-gray-300">
              <th className="text-left py-2 text-gray-600 font-semibold">品　目</th>
              <th className="text-right py-2 text-gray-600 font-semibold w-32">金　額</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">
                <div className="font-medium text-gray-900">{proj.title}</div>
                {proj.description && (
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{proj.description}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">業務委託費（プラットフォーム預かり決済）</div>
              </td>
              <td className="py-3 text-right font-bold text-gray-900">
                ¥{payment.amount.toLocaleString()}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-900">
              <td className="py-3 font-bold text-gray-900">合　計</td>
              <td className="py-3 text-right font-bold text-xl text-gray-900">
                ¥{payment.amount.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* 備考 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500 mb-8 space-y-1">
          <div>・ 支払方法: Cralia プラットフォーム預かり決済（検収後支払い）</div>
          <div>・ 支払日: {issueDate}</div>
          <div>・ なお、本発注書は電子的に発行されたものです。</div>
          <div>・ 収入印紙は電子文書のため不要です。</div>
        </div>

        {/* フッター */}
        <div className="border-t border-gray-200 pt-4 flex items-end justify-between">
          <div className="text-xs text-gray-400">
            <div className="font-semibold text-gray-600 mb-1">Cralia プラットフォーム</div>
            <div>（発注書は確定申告の証明書類としてご使用いただけます）</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">支払金額</div>
            <div className="text-2xl font-bold text-gray-900">¥{payment.amount.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
