import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import OrderActions from './OrderActions'
import EditOrderModal from './EditOrderModal'
import ReviewSection from '@/components/ReviewSection'
import { ORDER_STATUS_MAP, ORDER_STATUS_STEPS } from '@/lib/constants/statuses'

export const dynamic = 'force-dynamic'

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
      .select('id, rating, comment, created_at, reviewer_id')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  const isClient  = order.client_id  === user.id
  const isCreator = order.creator_id === user.id
  const st = ORDER_STATUS_MAP[order.status] ?? ORDER_STATUS_MAP.pending
  const isClosed = ['completed', 'cancelled', 'disputed'].includes(order.status)
  const isCompleted = order.status === 'completed'
  const isPending = order.status === 'pending'
  const currentStep = ORDER_STATUS_STEPS.indexOf(order.status as typeof ORDER_STATUS_STEPS[number])

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', color: '#f0eff8' }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          Cralia
        </Link>
        <Link href="/orders" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← 依頼一覧へ</Link>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        {/* ステータスバッジ＋タイトル */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
              {st.label}
            </span>
            <span style={{
              padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
              color: order.order_type === 'free' ? '#60a5fa' : '#c77dff',
              background: order.order_type === 'free' ? 'rgba(96,165,250,0.12)' : 'rgba(199,125,255,0.12)',
              border: `1px solid ${order.order_type === 'free' ? 'rgba(96,165,250,0.3)' : 'rgba(199,125,255,0.3)'}`,
            }}>
              {order.order_type === 'free' ? '無償依頼' : '有償依頼'}
            </span>
            <span style={{ color: '#5c5b78', fontSize: '12px' }}>
              {new Date(order.created_at).toLocaleDateString('ja-JP')} 作成
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, lineHeight: '1.4' }}>{order.title}</h1>
        </div>

        {/* 進行ステップ（完了/キャンセル以外） */}
        {!isClosed && (
          <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {ORDER_STATUS_STEPS.map((step, i) => {
                const done   = currentStep > i
                const active = currentStep === i
                const labels: Record<string, string> = { pending: '提案中', accepted: '承認', in_progress: '進行中', delivered: '納品', completed: '完了' }
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < ORDER_STATUS_STEPS.length - 1 ? 1 : undefined }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', background: done ? '#c77dff' : active ? 'rgba(199,125,255,0.3)' : 'rgba(255,255,255,0.06)', border: active ? '2px solid #c77dff' : 'none', color: done ? '#fff' : active ? '#c77dff' : '#5c5b78' }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '10px', color: active ? '#c77dff' : done ? '#a9a8c0' : '#5c5b78', whiteSpace: 'nowrap' }}>{labels[step]}</span>
                    </div>
                    {i < ORDER_STATUS_STEPS.length - 1 && (
                      <div style={{ flex: 1, height: '2px', background: done ? '#c77dff' : 'rgba(255,255,255,0.08)', margin: '0 4px 16px' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 依頼者 / クリエイター */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: '依頼者', name: clientUser?.display_name ?? '不明', id: order.client_id, isYou: isClient },
            { label: 'クリエイター', name: creatorUser?.display_name ?? '不明', id: order.creator_id, isYou: isCreator },
          ].map(({ label, name, id, isYou }) => (
            <Link key={id} href={`/profile/${id}?back=/orders/${order.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px' }}>
                <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '0.08em' }}>{label}</p>
                <p style={{ color: '#f0eff8', fontSize: '14px', fontWeight: '700', margin: 0 }}>
                  {name} {isYou && <span style={{ color: '#c77dff', fontSize: '11px' }}>（あなた）</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* 依頼詳細 */}
        <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 14px' }}>依頼内容</h2>
          <p style={{ color: '#d0cfea', fontSize: '14px', lineHeight: '1.8', margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>{order.description}</p>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            {order.order_type !== 'free' && (
              <div>
                <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '0.08em' }}>予算</p>
                <p style={{ color: '#f0eff8', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                  {order.budget != null ? `¥${order.budget.toLocaleString()}` : '未定'}
                </p>
              </div>
            )}
            <div>
              <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '0.08em' }}>希望納期</p>
              <p style={{ color: '#f0eff8', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                {order.deadline ? new Date(order.deadline).toLocaleDateString('ja-JP') : '未定'}
              </p>
            </div>
            <div>
              <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '0.08em' }}>ポートフォリオ掲載</p>
              <p style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: order.portfolio_allowed ? '#c77dff' : '#5c5b78' }}>
                {order.portfolio_allowed ? '✅ 許可' : '🔒 不許可'}
              </p>
            </div>
            {order.copyright_agreed != null && (
              <div>
                <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '0.08em' }}>著作権同意</p>
                <p style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: order.copyright_agreed ? '#4ade80' : '#5c5b78' }}>
                  {order.copyright_agreed ? '✅ 同意済み' : '未同意'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* メッセージスレッドへのリンク */}
        <Link
          href={`/messages/${order.id}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '13px 20px', borderRadius: '12px', marginBottom: '12px',
            border: '1px solid rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.06)',
            color: '#34d399', fontSize: '14px', fontWeight: '600', textDecoration: 'none',
          }}
        >
          💬 チャットスレッドを開く
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
          <div style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: '14px', padding: '16px 20px', textAlign: 'center' }}>
            <p style={{ color: st.color, fontWeight: '700', margin: isCompleted ? '0 0 12px' : '0' }}>この依頼は「{st.label}」で終了しています</p>
            {isCompleted && (
              <Link
                href={`/orders/${order.id}/receipt`}
                style={{ display: 'inline-block', padding: '9px 22px', borderRadius: '10px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}
              >
                📄 領収書 / 発注書を発行する
              </Link>
            )}
          </div>
        )}

        {/* レビューセクション */}
        <ReviewSection
          orderId={order.id}
          isClient={isClient}
          isCompleted={isCompleted}
          currentUserId={user.id}
          initialReviews={reviews ?? []}
        />
      </div>
    </main>
  )
}
