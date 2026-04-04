import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/messages')

  // 暫定：自分が参加している依頼（project）を取得してスレッド一覧として表示
  const { data: orders } = await supabase
    .from('projects')
    .select('id, title, status, created_at, client_id, creator_id')
    .or(`client_id.eq.${user.id},creator_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
        </Link>
        <Link href="/dashboard" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← ダッシュボードへ</Link>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px' }}>メッセージ</h1>
          <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>依頼に紐づいたチャットスレッド</p>
        </div>

        {/* 開発中バナー */}
        <div style={{
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: '14px', padding: '14px 20px', marginBottom: '28px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '18px' }}>🚧</span>
          <p style={{ margin: 0, fontSize: '13px', color: '#fbbf24' }}>
            メッセージ機能は現在開発中です。依頼が確立されると自動でチャットスレッドが作成されます。
          </p>
        </div>

        {!orders || orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(22,22,31,0.8)', borderRadius: '20px', border: '1px dashed rgba(199,125,255,0.2)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <p style={{ fontSize: '16px', margin: '0 0 8px', fontWeight: '700' }}>まだメッセージはありません</p>
            <p style={{ color: '#7c7b99', fontSize: '14px', margin: '0 0 24px' }}>依頼が成立するとチャットスレッドがここに表示されます</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/search" style={{ padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
                クリエイターを探す
              </Link>
              <Link href="/clients" style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid rgba(199,125,255,0.3)', background: 'transparent', color: '#c77dff', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
                発注者を探す
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(199,125,255,0.12)',
                  borderRadius: '16px', padding: '18px 22px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>💬</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ fontWeight: '700', fontSize: '15px', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</p>
                    <p style={{ color: '#7c7b99', fontSize: '12px', margin: 0 }}>
                      {o.client_id === user.id ? '依頼者として' : 'クリエイターとして'} ·{' '}
                      {new Date(o.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <span style={{ color: '#a9a8c0', fontSize: '13px' }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
