import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Check, Lock, MessageCircle, FileText } from 'lucide-react'
import OrderActions from './OrderActions'
import EditOrderModal from './EditOrderModal'
import ReviewSection from '@/components/ReviewSection'
import { ORDER_STATUS_MAP, ORDER_STATUS_STEPS } from '@/lib/constants/statuses'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

const CLOSED_WRAP: Record<string, string> = {
  completed: 'bg-[#4ade80]/8 border-[#4ade80]/25 text-[#16a34a]',
  cancelled:  'bg-[var(--c-surface-2)] border-[var(--c-border)] text-[var(--c-text-3)]',
  disputed:   'bg-[#dc2626]/8 border-[#dc2626]/25 text-[#dc2626]',
}

function orderTone(status: string): 'brand' | 'ok' | 'warn' | 'danger' | 'neutral' {
  const map: Record<string, 'brand' | 'ok' | 'warn' | 'danger' | 'neutral'> = {
    pending: 'warn', accepted: 'ok', in_progress: 'brand', delivered: 'brand',
    completed: 'neutral', cancelled: 'neutral', disputed: 'danger',
  }
  return map[status] ?? 'neutral'
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/orders/${params.id}`)

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order } = await db
    .from('projects')
    .select('id, title, description, budget, deadline, status, created_at, updated_at, client_id, creator_id, portfolio_allowed, order_type, copyright_agreed')
    .eq('id', params.id)
    .single()

  if (!order) notFound()
  if (order.client_id !== user.id && order.creator_id !== user.id) notFound()

  const [{ data: clientUser }, { data: creatorUser }, { data: reviews }] = await Promise.all([
    db.from('users').select('display_name, avatar_url').eq('id', order.client_id).single(),
    db.from('users').select('display_name, avatar_url').eq('id', order.creator_id).single(),
    db.from('reviews')
      .select('id, rating, comment, created_at, reviewer_id, reviewee_id, review_type')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  const isClient   = order.client_id  === user.id
  const isCreator  = order.creator_id === user.id
  const st         = ORDER_STATUS_MAP[order.status] ?? ORDER_STATUS_MAP.pending
  const isClosed   = ['completed', 'cancelled', 'disputed'].includes(order.status)
  const isCompleted = order.status === 'completed'
  const isPending   = order.status === 'pending'
  const currentStep = ORDER_STATUS_STEPS.indexOf(order.status as typeof ORDER_STATUS_STEPS[number])
  const stepLabels: Record<string, string> = { pending: '提案中', accepted: '承認', in_progress: '進行中', delivered: '納品', completed: '完了' }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">

        {/* ステータス＋タイトル */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <Badge tone={orderTone(order.status)} variant="soft">{st.label}</Badge>
            <Badge tone={order.order_type === 'free' ? 'neutral' : 'brand'} variant="soft">
              {order.order_type === 'free' ? '無償依頼' : '有償依頼'}
            </Badge>
            <span className="text-[12px] text-[var(--c-text-4)]">
              {new Date(order.created_at).toLocaleDateString('ja-JP')} 作成
            </span>
          </div>
          <h1 className="text-[24px] font-bold leading-[1.4]">{order.title}</h1>
        </div>

        {/* 進行ステップ */}
        {!isClosed && (
          <Card bordered padded className="mb-6">
            <div className="flex items-center">
              {ORDER_STATUS_STEPS.map((step, i) => {
                const done   = currentStep > i
                const active = currentStep === i
                return (
                  <div key={step} className={`flex items-center ${i < ORDER_STATUS_STEPS.length - 1 ? 'flex-1' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${done ? 'bg-brand text-white' : active ? 'bg-brand/20 text-brand border-2 border-brand' : 'bg-[var(--c-border)] text-[var(--c-text-3)]'}`}>
                        {done ? <Check size={13} aria-hidden /> : i + 1}
                      </div>
                      <span className={`text-[10px] whitespace-nowrap ${active ? 'text-brand font-semibold' : done ? 'text-[var(--c-text-2)]' : 'text-[var(--c-text-3)]'}`}>
                        {stepLabels[step]}
                      </span>
                    </div>
                    {i < ORDER_STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-4 ${done ? 'bg-brand' : 'bg-[var(--c-border-2)]'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* 依頼者 / クリエイター */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: '依頼者', name: clientUser?.display_name ?? '不明', id: order.client_id, isYou: isClient },
            { label: 'クリエイター', name: creatorUser?.display_name ?? '不明', id: order.creator_id, isYou: isCreator },
          ].map(({ label, name, id, isYou }) => (
            <Link key={id} href={`/profile/${id}?back=/orders/${order.id}`} className="no-underline">
              <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-card p-4 hover:border-brand transition-colors">
                <p className="text-[11px] font-bold text-[var(--c-text-4)] tracking-wider uppercase mb-1">{label}</p>
                <p className="text-[14px] font-bold text-[var(--c-text)]">
                  {name}
                  {isYou && <span className="text-brand text-[11px] ml-1">（あなた）</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* 依頼詳細 */}
        <Card bordered padded className="mb-6">
          <h2 className="text-[12px] font-bold text-[var(--c-text-3)] tracking-wider uppercase mb-4">依頼内容</h2>
          <p className="text-[14px] text-[var(--c-text-2)] leading-[1.8] whitespace-pre-wrap mb-5">{order.description}</p>

          <div className="flex gap-6 flex-wrap border-t border-[var(--c-border)] pt-4">
            {order.order_type !== 'free' && (
              <div>
                <p className="text-[11px] font-bold text-[var(--c-text-4)] tracking-wider uppercase mb-1">予算</p>
                <p className="text-[15px] font-bold">
                  {order.budget != null ? `¥${order.budget.toLocaleString()}` : '未定'}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold text-[var(--c-text-4)] tracking-wider uppercase mb-1">希望納期</p>
              <p className="text-[15px] font-bold">
                {order.deadline ? new Date(order.deadline).toLocaleDateString('ja-JP') : '未定'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--c-text-4)] tracking-wider uppercase mb-1">ポートフォリオ掲載</p>
              <p className={`text-[13px] font-bold flex items-center gap-1 ${order.portfolio_allowed ? 'text-brand' : 'text-[var(--c-text-3)]'}`}>
                {order.portfolio_allowed ? <Check size={13} aria-hidden /> : <Lock size={13} aria-hidden />}
                {order.portfolio_allowed ? '許可' : '不許可'}
              </p>
            </div>
            {order.copyright_agreed != null && (
              <div>
                <p className="text-[11px] font-bold text-[var(--c-text-4)] tracking-wider uppercase mb-1">著作権同意</p>
                <p className={`text-[13px] font-bold flex items-center gap-1 ${order.copyright_agreed ? 'text-[#16a34a]' : 'text-[var(--c-text-3)]'}`}>
                  {order.copyright_agreed ? <Check size={13} aria-hidden /> : null}
                  {order.copyright_agreed ? '同意済み' : '未同意'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* メッセージスレッドリンク */}
        <Link
          href={`/messages/${order.id}`}
          className="flex items-center justify-center gap-2 h-11 rounded-[10px] mb-3 border border-brand/20 bg-brand-soft text-brand text-[14px] font-semibold no-underline hover:bg-brand/10 transition-colors"
        >
          <MessageCircle size={16} aria-hidden />
          チャットスレッドを開く
        </Link>

        {/* 依頼編集（pending かつ依頼者のみ） */}
        {isPending && isClient && (
          <EditOrderModal
            orderId={order.id}
            initialTitle={order.title}
            initialDescription={order.description}
            initialBudget={order.budget}
            initialDeadline={order.deadline ?? null}
          />
        )}

        {/* アクション */}
        {!isClosed && (
          <OrderActions
            orderId={order.id}
            status={order.status}
            isClient={isClient}
            isCreator={isCreator}
            creatorId={order.creator_id}
            deadline={order.deadline ?? null}
          />
        )}

        {isClosed && (
          <div className={`rounded-card border px-5 py-4 text-center ${CLOSED_WRAP[order.status] ?? CLOSED_WRAP.cancelled}`}>
            <p className="font-bold mb-3">この依頼は「{st.label}」で終了しています</p>
            {isCompleted && (
              <Link
                href={`/orders/${order.id}/receipt`}
                className="inline-flex items-center gap-2 h-9 px-5 rounded-[8px] bg-[#4ade80]/10 border border-[#4ade80]/25 text-[#16a34a] text-[13px] font-bold no-underline hover:bg-[#4ade80]/15 transition-colors"
              >
                <FileText size={14} aria-hidden />
                領収書 / 発注書を発行する
              </Link>
            )}
          </div>
        )}

        {/* レビューセクション */}
        <ReviewSection
          orderId={order.id}
          isClient={isClient}
          isCreator={isCreator}
          isCompleted={isCompleted}
          currentUserId={user.id}
          clientId={order.client_id}
          creatorId={order.creator_id}
          initialReviews={(reviews ?? []) as { id: string; rating: number; comment: string | null; created_at: string; reviewer_id: string; reviewee_id: string; review_type: string }[]}
        />
      </Container>
    </div>
  )
}
