import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft:       { label: '下書き',     color: '#a9a8c0', bg: 'rgba(169,168,192,0.12)' },
  pending:     { label: '提案中',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  accepted:    { label: '承認済み',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  in_progress: { label: '進行中',     color: '#c77dff', bg: 'rgba(199,125,255,0.12)' },
  delivered:   { label: '納品済み',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  completed:   { label: '完了',       color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
  cancelled:   { label: 'キャンセル', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  disputed:    { label: '異議申し立て', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

export default async function OrdersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/orders')

  const [{ data: received }, { data: sent }] = await Promise.all([
    // 受信した依頼（自分がクリエイター）
    supabase.from('projects')
      .select('id, title, status, budget, deadline, created_at, client_id')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    // 送った依頼（自分がクライアント）
    supabase.from('projects')
      .select('id, title, status, budget, deadline, created_at, creator_id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const allEmpty = (!received || received.length === 0) && (!sent || sent.length === 0)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '22px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
        </Link>
        <Link href="/dashboard" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← ダッシュボードへ</Link>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px' }}>依頼管理</h1>
          <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>受け取った依頼・送った依頼を管理します</p>
        </div>

        {/* 開発中バナー */}
        <div style={{
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: '14px', padding: '14px 20px', marginBottom: '28px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '18px' }}>🚧</span>
          <p style={{ margin: 0, fontSize: '13px', color: '#fbbf24' }}>
            依頼の送受信機能は現在開発中です。クリエイター・発注者の検索から営業・依頼の流れを実装予定です。
          </p>
        </div>

        {allEmpty ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(22,22,31,0.8)', borderRadius: '20px', border: '1px dashed rgba(199,125,255,0.2)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '16px', margin: '0 0 8px', fontWeight: '700' }}>まだ依頼はありません</p>
            <p style={{ color: '#7c7b99', fontSize: '14px', margin: '0 0 24px' }}>クリエイターを探して依頼を送るか、プロフィールを充実させて依頼を受けましょう</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/search" style={{ padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
                クリエイターを探す
              </Link>
              <Link href={`/profile/${user.id}`} style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid rgba(199,125,255,0.3)', background: 'transparent', color: '#c77dff', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
                プロフィールを確認
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* 受信した依頼 */}
            {received && received.length > 0 && (
              <section>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#a9a8c0', margin: '0 0 12px', letterSpacing: '0.05em' }}>
                  受け取った依頼 ({received.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {received.map((o) => <OrderCard key={o.id} order={o} />)}
                </div>
              </section>
            )}

            {/* 送った依頼 */}
            {sent && sent.length > 0 && (
              <section>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#a9a8c0', margin: '0 0 12px', letterSpacing: '0.05em' }}>
                  送った依頼 ({sent.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sent.map((o) => <OrderCard key={o.id} order={o} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order: o }: { order: { id: string; title: string; status: string; budget: number | null; deadline: string | null; created_at: string } }) {
  const st = STATUS_MAP[o.status] ?? STATUS_MAP.draft
  return (
    <div style={{
      background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(199,125,255,0.12)',
      borderRadius: '16px', padding: '18px 22px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
    }}>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <p style={{ fontWeight: '700', fontSize: '15px', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {o.budget != null && (
            <span style={{ color: '#a9a8c0', fontSize: '12px' }}>¥{o.budget.toLocaleString()}</span>
          )}
          {o.deadline && (
            <span style={{ color: '#a9a8c0', fontSize: '12px' }}>納期: {new Date(o.deadline).toLocaleDateString('ja-JP')}</span>
          )}
          <span style={{ color: '#5c5b78', fontSize: '12px' }}>{new Date(o.created_at).toLocaleDateString('ja-JP')} 作成</span>
        </div>
      </div>
      <span style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: st.color, background: st.bg, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {st.label}
      </span>
    </div>
  )
}
