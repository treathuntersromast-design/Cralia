import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import OrderActions from './OrderActions'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:     { label: '提案中',       color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',   border: 'rgba(251,191,36,0.3)'   },
  accepted:    { label: '承認済み',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',   border: 'rgba(96,165,250,0.3)'   },
  in_progress: { label: '進行中',       color: '#c77dff', bg: 'rgba(199,125,255,0.12)',  border: 'rgba(199,125,255,0.3)'  },
  delivered:   { label: '納品済み',     color: '#4ade80', bg: 'rgba(74,222,128,0.12)',   border: 'rgba(74,222,128,0.3)'   },
  completed:   { label: '完了',         color: '#4ade80', bg: 'rgba(74,222,128,0.08)',   border: 'rgba(74,222,128,0.2)'   },
  cancelled:   { label: 'キャンセル',   color: '#f87171', bg: 'rgba(248,113,113,0.12)',  border: 'rgba(248,113,113,0.3)'  },
  disputed:    { label: '異議申し立て', color: '#f87171', bg: 'rgba(248,113,113,0.12)',  border: 'rgba(248,113,113,0.3)'  },
}

const STEPS = ['pending', 'accepted', 'in_progress', 'delivered', 'completed'] as const

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
    .select('id, title, description, budget, deadline, status, created_at, updated_at, client_id, creator_id')
    .eq('id', params.id)
    .single()

  if (!order) notFound()
  if (order.client_id !== user.id && order.creator_id !== user.id) notFound()

  const [{ data: clientUser }, { data: creatorUser }] = await Promise.all([
    db.from('users').select('display_name, avatar_url').eq('id', order.client_id).single(),
    db.from('users').select('display_name, avatar_url').eq('id', order.creator_id).single(),
  ])

  const isClient  = order.client_id  === user.id
  const isCreator = order.creator_id === user.id
  const st = STATUS_MAP[order.status] ?? STATUS_MAP.pending
  const isClosed = ['completed', 'cancelled', 'disputed'].includes(order.status)
  const currentStep = STEPS.indexOf(order.status as typeof STEPS[number])

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', color: '#f0eff8', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
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
              color: (order as Record<string, unknown>).order_type === 'free' ? '#60a5fa' : '#c77dff',
              background: (order as Record<string, unknown>).order_type === 'free' ? 'rgba(96,165,250,0.12)' : 'rgba(199,125,255,0.12)',
              border: `1px solid ${(order as Record<string, unknown>).order_type === 'free' ? 'rgba(96,165,250,0.3)' : 'rgba(199,125,255,0.3)'}`,
            }}>
              {(order as Record<string, unknown>).order_type === 'free' ? '無償依頼' : '有償依頼'}
            </span>
            <span style={{ color: '#5c5b78', fontSize: '12px' }}>
              {new Date(order.created_at).toLocaleDateString('ja-JP')} 作成
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, lineHeight: '1.4' }}>{order.title}</h1>
        </div>

        {/* 進行ステップ（完了/キャンセル以外） */}
        {!isClosed && (
          <div style={{ background: 'rgba(22,22,31,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {STEPS.map((step, i) => {
                const done   = currentStep > i
                const active = currentStep === i
                const labels: Record<string, string> = { pending: '提案中', accepted: '承認', in_progress: '進行中', delivered: '納品', completed: '完了' }
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', background: done ? '#c77dff' : active ? 'rgba(199,125,255,0.3)' : 'rgba(255,255,255,0.06)', border: active ? '2px solid #c77dff' : 'none', color: done ? '#fff' : active ? '#c77dff' : '#5c5b78' }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '10px', color: active ? '#c77dff' : done ? '#a9a8c0' : '#5c5b78', whiteSpace: 'nowrap' }}>{labels[step]}</span>
                    </div>
                    {i < STEPS.length - 1 && (
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
              <div style={{ background: 'rgba(22,22,31,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px' }}>
                <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '0.06em' }}>{label}</p>
                <p style={{ color: '#f0eff8', fontSize: '14px', fontWeight: '700', margin: 0 }}>
                  {name} {isYou && <span style={{ color: '#c77dff', fontSize: '11px' }}>（あなた）</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* 依頼詳細 */}
        <div style={{ background: 'rgba(22,22,31,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 14px' }}>依頼内容</h2>
          <p style={{ color: '#d0cfea', fontSize: '14px', lineHeight: '1.8', margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>{order.description}</p>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <div>
              <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '0.06em' }}>予算</p>
              <p style={{ color: '#f0eff8', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                {order.budget != null ? `¥${order.budget.toLocaleString()}` : '未定'}
              </p>
            </div>
            <div>
              <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '0.06em' }}>希望納期</p>
              <p style={{ color: '#f0eff8', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                {order.deadline ? new Date(order.deadline).toLocaleDateString('ja-JP') : '未定'}
              </p>
            </div>
          </div>
        </div>

        {/* アクション */}
        {!isClosed && (
          <OrderActions
            orderId={order.id}
            status={order.status}
            isClient={isClient}
            isCreator={isCreator}
          />
        )}

        {isClosed && (
          <div style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: '14px', padding: '16px 20px', textAlign: 'center' }}>
            <p style={{ color: st.color, fontWeight: '700', margin: 0 }}>この依頼は「{st.label}」で終了しています</p>
          </div>
        )}
      </div>
    </main>
  )
}
