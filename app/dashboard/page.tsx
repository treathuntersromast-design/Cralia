import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import LogoutButton from '@/components/LogoutButton'
import AvatarUpload from '@/components/AvatarUpload'
import { activityStyleToLabel } from '@/lib/constants/activity'
import { ORDER_STATUS_MAP, PROJECT_STATUS_MAP, INACTIVE_ORDER_STATUSES } from '@/lib/constants/statuses'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { data: profileRows },
    { count: unreadCount_ },
    { data: activeProjects },
    { data: receivedOrders },
    { data: sentOrders },
    { data: calTokenRows },
  ] = await Promise.all([
    supabase.from('users').select('activity_style_id, display_name, avatar_url').eq('id', user.id).limit(1),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
    // 稼働中のプロジェクト（completed / cancelled を除外）
    supabase.from('project_boards')
      .select('id, title, status')
      .eq('owner_id', user.id)
      .in('status', ['recruiting', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5),
    // 受注中の依頼（completed / cancelled を除外）
    supabase.from('projects')
      .select('id, title, status, budget, deadline')
      .eq('creator_id', user.id)
      .not('status', 'in', INACTIVE_ORDER_STATUSES)
      .order('created_at', { ascending: false })
      .limit(5),
    // 発注中の依頼（completed / cancelled を除外）
    supabase.from('projects')
      .select('id, title, status, budget, deadline')
      .eq('client_id', user.id)
      .not('status', 'in', INACTIVE_ORDER_STATUSES)
      .order('created_at', { ascending: false })
      .limit(5),
    // Googleカレンダー連携確認
    db.from('creator_tokens').select('creator_id').eq('creator_id', user.id).limit(1),
  ])

  const profile = profileRows?.[0] ?? null
  if (!profile || !profile.activity_style_id) redirect('/profile/setup-prompt')

  const calConnected = (calTokenRows?.length ?? 0) > 0

  const roleLabels = activityStyleToLabel(profile.activity_style_id as number)
  const unreadCount = unreadCount_ ?? 0

  const hasActiveOrders = (receivedOrders && receivedOrders.length > 0) || (sentOrders && sentOrders.length > 0)

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', color: '#f0eff8' }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          CreMatch
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/notifications" style={{ position: 'relative', padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#a9a8c0', textDecoration: 'none', fontSize: '18px', display: 'flex', alignItems: 'center' }}>
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', borderRadius: '50%', background: '#ff6b9d', fontSize: '10px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/messages" style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#a9a8c0', textDecoration: 'none', fontSize: '18px' }}>💬</Link>
          <Link href="/settings" style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#a9a8c0', textDecoration: 'none', fontSize: '18px' }}>⚙️</Link>
          <LogoutButton />
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        {/* ウェルカムカード */}
        <div style={{ background: 'rgba(199,125,255,0.08)', border: '1px solid rgba(199,125,255,0.2)', borderRadius: '20px', padding: '28px 32px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <AvatarUpload
            currentUrl={profile.avatar_url ?? null}
            displayName={profile.display_name ?? user.email ?? '?'}
            size={68}
            readonly
          />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>
              {profile.display_name ?? user.email?.split('@')[0]} さん、おかえりなさい
            </h2>
            <p style={{ color: '#a9a8c0', margin: '0 0 12px', fontSize: '14px' }}>
              活動スタイル: <strong style={{ color: '#c77dff' }}>{roleLabels}</strong>
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Link href={`/profile/${user.id}`} style={{ padding: '8px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                👤 プロフィール
              </Link>
              <Link href="/settings" style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(199,125,255,0.3)', background: 'transparent', color: '#c77dff', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                ⚙️ 設定
              </Link>
            </div>
          </div>
        </div>

        {/* Googleカレンダー連携推奨バナー */}
        {!calConnected && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)',
            borderRadius: '16px', padding: '16px 20px', marginBottom: '32px', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <span style={{ fontSize: '24px', flexShrink: 0 }}>📅</span>
              <div>
                <p style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '14px', color: '#4ade80' }}>
                  Googleカレンダーを連携しましょう
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#7c7b99' }}>
                  連携すると、クライアントからの依頼時にあなたの空き状況を考慮した納期提案が自動で行われます。
                </p>
              </div>
            </div>
            <Link
              href="/settings/calendar"
              style={{
                padding: '10px 20px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)',
                color: '#4ade80', fontSize: '13px', fontWeight: '700', textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              連携する →
            </Link>
          </div>
        )}

        {/* クイックアクション */}
        <h3 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 14px' }}>クイックアクション</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '40px' }}>
          {[
            { href: '/search', icon: '🔍', label: 'クリエイターを探す', color: '#c77dff', bg: 'rgba(199,125,255,0.1)', border: 'rgba(199,125,255,0.3)' },
            { href: '/clients', icon: '📣', label: 'お仕事募集中の依頼者', color: '#ff6b9d', bg: 'rgba(255,107,157,0.1)', border: 'rgba(255,107,157,0.3)' },
            { href: '/jobs', icon: '📋', label: '案件を探す', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
            { href: '/jobs/new', icon: '📣', label: 'クリエイターを募集する', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' },
            { href: '/projects', icon: '🎯', label: 'マイプロジェクト', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)' },
            { href: '/orders', icon: '🤝', label: '依頼管理', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.3)' },
            { href: '/messages', icon: '💬', label: 'メッセージ', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' },
            { href: '/notifications', icon: '🔔', label: `通知${unreadCount > 0 ? ` (${unreadCount})` : ''}`, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
            { href: '/events', icon: '🎉', label: '交流会', color: '#f0d080', bg: 'rgba(240,208,128,0.1)', border: 'rgba(240,208,128,0.3)' },
          ].map(({ href, icon, label, color, bg, border }) => (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 18px', borderRadius: '14px',
              background: bg, border: `1px solid ${border}`,
              color, fontSize: '14px', fontWeight: '700', textDecoration: 'none',
            }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <span style={{ fontSize: '13px' }}>{label}</span>
            </Link>
          ))}
        </div>

        {/* 稼働中のプロジェクト */}
        {activeProjects && activeProjects.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: 0 }}>稼働中のプロジェクト</h3>
              <Link href="/projects" style={{ color: '#c77dff', fontSize: '13px', textDecoration: 'none' }}>すべて見る →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(96,165,250,0.15)',
                    borderRadius: '14px', padding: '14px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>🎯</span>
                      <span style={{ fontWeight: '600', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', flexShrink: 0,
                      padding: '3px 10px', borderRadius: '20px',
                      color: PROJECT_STATUS_MAP[p.status]?.color ?? '#a9a8c0',
                      background: PROJECT_STATUS_MAP[p.status]?.bg ?? 'rgba(169,168,192,0.12)',
                    }}>
                      {PROJECT_STATUS_MAP[p.status]?.label ?? p.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* アクティブな依頼 */}
        {hasActiveOrders && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: 0 }}>アクティブな依頼</h3>
              <Link href="/orders" style={{ color: '#4ade80', fontSize: '13px', textDecoration: 'none' }}>すべて見る →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(receivedOrders ?? []).map((o) => {
                const st = ORDER_STATUS_MAP[o.status] ?? { label: o.status, color: '#a9a8c0' }
                return (
                  <Link key={o.id} href="/orders" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(74,222,128,0.15)',
                      borderRadius: '14px', padding: '14px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>📩</span>
                        <div style={{ overflow: 'hidden' }}>
                          <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#5c5b78' }}>
                            受注
                            {o.budget != null && ` · ¥${o.budget.toLocaleString()}`}
                            {o.deadline && ` · 納期 ${new Date(o.deadline).toLocaleDateString('ja-JP')}`}
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', flexShrink: 0, padding: '3px 10px', borderRadius: '20px', color: st.color, background: `${st.color}18` }}>
                        {st.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
              {(sentOrders ?? []).map((o) => {
                const st = ORDER_STATUS_MAP[o.status] ?? { label: o.status, color: '#a9a8c0' }
                return (
                  <Link key={o.id} href="/orders" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,107,157,0.15)',
                      borderRadius: '14px', padding: '14px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>📤</span>
                        <div style={{ overflow: 'hidden' }}>
                          <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#5c5b78' }}>
                            発注
                            {o.budget != null && ` · ¥${o.budget.toLocaleString()}`}
                            {o.deadline && ` · 納期 ${new Date(o.deadline).toLocaleDateString('ja-JP')}`}
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', flexShrink: 0, padding: '3px 10px', borderRadius: '20px', color: st.color, background: `${st.color}18` }}>
                        {st.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* 開発中の機能 */}
        <h3 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 14px' }}>開発中の機能</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { emoji: '💳', title: 'エスクロー決済', desc: 'Stripe連携・前払い', week: 'Week 11-12' },
            { emoji: '📝', title: 'AI依頼文添削', desc: 'Claude APIで自動添削', week: 'Week 13-14' },
          ].map(({ emoji, title, desc, week }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{emoji}</div>
              <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{title}</div>
              <div style={{ color: '#7c7b99', fontSize: '12px', marginBottom: '8px' }}>{desc}</div>
              <span style={{ fontSize: '11px', background: 'rgba(199,125,255,0.12)', color: '#c77dff', padding: '2px 8px', borderRadius: '20px' }}>{week}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
