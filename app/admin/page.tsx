import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// 管理者のメールアドレスを環境変数で制御
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')

  // 管理者チェック
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/dashboard')
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { count: totalUsers },
    { count: totalOrders },
    { count: completedOrders },
    { count: disputedOrders },
    { count: activeOrders },
    { data: recentErrors },
    { data: recentOrders },
  ] = await Promise.all([
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('projects').select('*', { count: 'exact', head: true }),
    db.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    db.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    db.from('projects').select('*', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'in_progress', 'delivered']),
    db.from('error_logs').select('id, endpoint, message, created_at, user_id').order('created_at', { ascending: false }).limit(20),
    db.from('projects').select('id, title, status, created_at, client_id, creator_id').order('created_at', { ascending: false }).limit(10),
  ])

  const stats = [
    { label: '総ユーザー数',       value: totalUsers ?? 0,     color: '#c77dff', bg: 'rgba(199,125,255,0.08)', border: 'rgba(199,125,255,0.2)' },
    { label: '総依頼数',           value: totalOrders ?? 0,    color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)'  },
    { label: 'アクティブな依頼',   value: activeOrders ?? 0,   color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)'  },
    { label: '完了済み依頼',       value: completedOrders ?? 0,color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)'  },
    { label: '異議申し立て中',     value: disputedOrders ?? 0, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', color: '#f0eff8', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
        </Link>
        <span style={{ color: '#f87171', fontSize: '13px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
          管理者
        </span>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px' }}>管理者ダッシュボード</h1>
          <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>プラットフォーム全体の状況</p>
        </div>

        {/* 統計カード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px', marginBottom: '36px' }}>
          {stats.map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '18px 20px' }}>
              <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', margin: '0 0 6px', letterSpacing: '0.05em' }}>{label}</p>
              <p style={{ color, fontSize: '28px', fontWeight: '800', margin: 0 }}>{value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* 最近の依頼 */}
          <div style={{ background: 'rgba(22,22,31,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', margin: 0 }}>最近の依頼</h2>
            </div>
            {!recentOrders || recentOrders.length === 0 ? (
              <p style={{ color: '#5c5b78', fontSize: '13px', margin: 0 }}>依頼はありません</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentOrders.map((o) => (
                  <Link key={o.id} href={`/orders/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 14px' }}>
                      <p style={{ fontWeight: '600', fontSize: '13px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.title}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#7c7b99' }}>{o.status}</span>
                        <span style={{ fontSize: '11px', color: '#5c5b78' }}>
                          {new Date(o.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* エラーログ */}
          <div style={{ background: 'rgba(22,22,31,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px 24px' }}>
            <h2 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 16px' }}>エラーログ（直近20件）</h2>
            {!recentErrors || recentErrors.length === 0 ? (
              <p style={{ color: '#5c5b78', fontSize: '13px', margin: 0 }}>エラーはありません ✅</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
                {recentErrors.map((e) => (
                  <div key={e.id} style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '10px 14px' }}>
                    <p style={{ color: '#f87171', fontSize: '12px', fontWeight: '700', margin: '0 0 2px' }}>
                      [{e.endpoint}]
                    </p>
                    <p style={{ color: '#d0cfea', fontSize: '12px', margin: '0 0 4px', lineHeight: '1.5', wordBreak: 'break-all' }}>
                      {e.message}
                    </p>
                    <p style={{ color: '#5c5b78', fontSize: '11px', margin: 0 }}>
                      {new Date(e.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 異議申し立て中の依頼リンク */}
        {(disputedOrders ?? 0) > 0 && (
          <div style={{ marginTop: '20px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#f87171', fontWeight: '700', fontSize: '14px', margin: '0 0 2px' }}>
                ⚠️ 異議申し立て中の依頼が {disputedOrders} 件あります
              </p>
              <p style={{ color: '#a9a8c0', fontSize: '12px', margin: 0 }}>対応が必要な依頼を確認してください</p>
            </div>
            <Link
              href="/admin/disputes"
              style={{ padding: '9px 18px', borderRadius: '10px', background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', fontSize: '13px', fontWeight: '700', textDecoration: 'none', flexShrink: 0 }}
            >
              確認する
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
