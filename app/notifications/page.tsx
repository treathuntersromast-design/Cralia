import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const TYPE_META: Record<string, { icon: string; color: string }> = {
  message:        { icon: '💬', color: '#60a5fa' },
  project_invite: { icon: '🎯', color: '#c77dff' },
  order_received: { icon: '📩', color: '#4ade80' },
  order_accepted: { icon: '✅', color: '#4ade80' },
  order_declined: { icon: '❌', color: '#f87171' },
  review:         { icon: '⭐', color: '#fbbf24' },
  system:         { icon: '🔔', color: '#a9a8c0' },
}

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/notifications')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // 未読IDを記録してから既読にマーク（表示時は記録した未読IDで判定する）
  const unreadIds = new Set((notifications ?? []).filter((n) => !n.read_at).map((n) => n.id))
  if (unreadIds.size > 0) {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', Array.from(unreadIds))
  }

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

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 32px' }}>通知</h1>

        {!notifications || notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(22,22,31,0.8)', borderRadius: '20px', border: '1px dashed rgba(199,125,255,0.2)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <p style={{ fontSize: '16px', margin: '0 0 8px', fontWeight: '700' }}>通知はありません</p>
            <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>依頼やメッセージが届くとここに表示されます</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.system
              const isUnread = unreadIds.has(n.id)
              return (
                <div key={n.id} style={{
                  background: isUnread ? 'rgba(199,125,255,0.06)' : 'rgba(22,22,31,0.7)',
                  border: `1px solid ${isUnread ? 'rgba(199,125,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: `${meta.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  }}>{meta.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: isUnread ? '700' : '500', fontSize: '14px', margin: '0 0 4px' }}>{n.title}</p>
                    {n.body && <p style={{ color: '#a9a8c0', fontSize: '13px', margin: '0 0 6px', lineHeight: '1.5' }}>{n.body}</p>}
                    <p style={{ color: '#5c5b78', fontSize: '12px', margin: 0 }}>
                      {new Date(n.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {isUnread && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c77dff', flexShrink: 0, marginTop: '6px' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
