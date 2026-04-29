import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import LogoutButton from '@/components/LogoutButton'
import AvatarUpload from '@/components/AvatarUpload'
import { activityStyleToLabel } from '@/lib/constants/activity'
import { ORDER_STATUS_MAP, PROJECT_STATUS_MAP, INACTIVE_ORDER_STATUSES } from '@/lib/constants/statuses'
import DashboardCalendar from '@/components/DashboardCalendar'
import UpcomingMeetBanner from '@/components/UpcomingMeetBanner'

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
    { data: completedAsCreator },
    { data: myTasksRaw },
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
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(5),
    // 発注中の依頼（completed / cancelled を除外）
    supabase.from('projects')
      .select('id, title, status, budget, deadline')
      .eq('client_id', user.id)
      .not('status', 'in', INACTIVE_ORDER_STATUSES)
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(5),
    // Googleカレンダー連携確認
    db.from('creator_tokens').select('creator_id').eq('creator_id', user.id).limit(1),
    // 受注実績（完了済み・クリエイターとして）
    db.from('projects')
      .select('id, budget, order_type')
      .eq('creator_id', user.id)
      .eq('status', 'completed'),
    // 自分が担当のタスク（未完了・納期順）
    db.from('project_tasks')
      .select('id, title, status, due_date, project_id, project_boards(id, title)')
      .eq('assigned_user_id', user.id)
      .neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(10),
  ])

  // 受注完了案件へのレビュー取得
  const completedIds = (completedAsCreator ?? []).map((p) => p.id)
  const { data: reviewsAsCreator } = completedIds.length > 0
    ? await db.from('reviews').select('rating').in('project_id', completedIds)
    : { data: [] }

  // マイタスクのブロック状態を計算
  const myTaskIds = (myTasksRaw ?? []).map((t) => t.id)
  const [{ data: myDeps }, { data: upstreamTasks }] = await Promise.all([
    myTaskIds.length > 0
      ? db.from('project_task_deps').select('task_id, depends_on_id').in('task_id', myTaskIds)
      : Promise.resolve({ data: [] }),
    myTaskIds.length > 0
      ? db.from('project_task_deps')
          .select('depends_on_id')
          .in('task_id', myTaskIds)
          .then(async ({ data: depEdges }) => {
            const upIds = [...new Set((depEdges ?? []).map((d) => d.depends_on_id))]
            return upIds.length > 0
              ? db.from('project_tasks').select('id, title, status').in('id', upIds)
              : Promise.resolve({ data: [] })
          })
      : Promise.resolve({ data: [] }),
  ])

  const upstreamMap: Record<string, { title: string; status: string }> = {}
  for (const u of upstreamTasks ?? []) upstreamMap[u.id] = { title: u.title, status: u.status }

  const depByTask: Record<string, string[]> = {}
  for (const d of myDeps ?? []) {
    if (!depByTask[d.task_id]) depByTask[d.task_id] = []
    depByTask[d.task_id].push(d.depends_on_id)
  }

  type MyTask = {
    id: string
    title: string
    status: string
    due_date: string | null
    project_id: string
    projectTitle: string
    blockedBy: { id: string; title: string }[]
  }

  const myTasks: MyTask[] = (myTasksRaw ?? []).map((t) => {
    const pb = t.project_boards as { id: string; title: string } | null
    const deps = depByTask[t.id] ?? []
    const blockedBy = deps
      .filter((depId) => upstreamMap[depId]?.status !== 'done')
      .map((depId) => ({ id: depId, title: upstreamMap[depId]?.title ?? '不明なタスク' }))
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      due_date: t.due_date,
      project_id: t.project_id,
      projectTitle: pb?.title ?? 'プロジェクト',
      blockedBy,
    }
  })

  const profile = profileRows?.[0] ?? null
  if (!profile || !profile.activity_style_id) redirect('/profile/setup-prompt')

  const calConnected = (calTokenRows?.length ?? 0) > 0

  const roleLabels = activityStyleToLabel(profile.activity_style_id as number)
  const unreadCount = unreadCount_ ?? 0

  const hasActiveOrders = (receivedOrders && receivedOrders.length > 0) || (sentOrders && sentOrders.length > 0)

  // 納期カラーヘルパー（ダッシュボード用）
  function deadlineColor(deadline: string | null): string {
    if (!deadline) return '#7c7b99'
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
    if (days < 0)  return '#ff6b9d'
    if (days <= 2) return '#ff6b9d'
    if (days <= 6) return '#fbbf24'
    return '#7c7b99'
  }
  function deadlineLabel(deadline: string | null): string {
    if (!deadline) return ''
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
    const dateStr = new Date(deadline).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    if (days < 0)  return `${dateStr}（${Math.abs(days)}日超過）`
    if (days === 0) return `${dateStr}（今日）`
    return `${dateStr}（あと${days}日）`
  }

  // クリエイター統計
  const totalCompleted = completedAsCreator?.length ?? 0
  const totalEarnings  = (completedAsCreator ?? [])
    .filter((p) => p.order_type !== 'free' && p.budget != null)
    .reduce((sum, p) => sum + (p.budget as number), 0)
  const ratings        = (reviewsAsCreator ?? []).map((r) => r.rating as number)
  const avgRating      = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : null
  const isCreatorRole  = [1, 3].includes(profile.activity_style_id as number)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-text)' }}>
      {/* ヘッダー */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,1,255,0.12)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0001ff', margin: 0 }}>
          Cralia
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/notifications" style={{ position: 'relative', padding: '8px', borderRadius: '10px', background: 'rgba(0,1,255,0.06)', color: '#0001ff', textDecoration: 'none', fontSize: '18px', display: 'flex', alignItems: 'center' }}>
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', borderRadius: '50%', background: '#0001ff', fontSize: '10px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/messages" style={{ padding: '8px', borderRadius: '10px', background: 'rgba(0,1,255,0.06)', color: '#0001ff', textDecoration: 'none', fontSize: '18px' }}>💬</Link>
          <Link href="/settings" style={{ padding: '8px', borderRadius: '10px', background: 'rgba(0,1,255,0.06)', color: '#0001ff', textDecoration: 'none', fontSize: '18px' }}>⚙️</Link>
          <LogoutButton />
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        {/* ウェルカムカード */}
        <div style={{ background: '#ffffff', border: '1px solid rgba(0,1,255,0.15)', borderRadius: '20px', padding: '28px 32px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <AvatarUpload
            currentUrl={profile.avatar_url ?? null}
            displayName={profile.display_name ?? user.email ?? '?'}
            size={68}
            readonly
          />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px', color: '#0001ff' }}>
              {profile.display_name ?? user.email?.split('@')[0]} さん、おかえりなさい
            </h2>
            <p style={{ color: 'rgba(0,1,200,0.65)', margin: '0 0 12px', fontSize: '14px' }}>
              活動スタイル: <strong style={{ color: '#0001ff' }}>{roleLabels}</strong>
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Link href={`/profile/${user.id}`} style={{ padding: '8px 18px', borderRadius: '10px', background: '#0001ff', color: '#fff', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                👤 プロフィール
              </Link>
              <Link href="/settings" style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(0,1,255,0.3)', background: 'transparent', color: '#0001ff', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                ⚙️ 設定
              </Link>
            </div>
          </div>
        </div>

        {/* Meet アラート */}
        <UpcomingMeetBanner calConnected={calConnected} />

        {/* ── 稼働中のプロジェクト（上部に移動） ── */}
        {activeProjects && activeProjects.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ color: 'var(--c-accent)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: 0 }}>稼働中のプロジェクト</h3>
              <Link href="/projects" style={{ color: 'var(--c-accent)', fontSize: '13px', textDecoration: 'none' }}>すべて見る →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: 'var(--c-surface)', border: '1px solid var(--c-border-2)',
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

        {/* ── アクティブな依頼（上部に移動・納期を目立たせる） ── */}
        {hasActiveOrders && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ color: 'var(--c-accent)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: 0 }}>アクティブな依頼</h3>
              <Link href="/orders" style={{ color: 'var(--c-accent)', fontSize: '13px', textDecoration: 'none' }}>すべて見る →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(receivedOrders ?? []).map((o) => {
                const st = ORDER_STATUS_MAP[o.status] ?? { label: o.status, color: 'var(--c-text-2)' }
                const dlColor = deadlineColor(o.deadline ?? null)
                const dlLabel = deadlineLabel(o.deadline ?? null)
                return (
                  <Link key={o.id} href={`/orders/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      background: 'var(--c-surface)',
                      border: `1px solid ${dlColor === '#ff6b9d' ? 'rgba(255,107,157,0.3)' : 'rgba(74,222,128,0.15)'}`,
                      borderRadius: '14px', padding: '14px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>📩</span>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: 'var(--c-text-4)' }}>受注{o.budget != null && ` · ¥${o.budget.toLocaleString()}`}</span>
                            {dlLabel && (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: dlColor }}>
                                📅 {dlLabel}
                              </span>
                            )}
                          </div>
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
                const st = ORDER_STATUS_MAP[o.status] ?? { label: o.status, color: 'var(--c-text-2)' }
                const dlColor = deadlineColor(o.deadline ?? null)
                const dlLabel = deadlineLabel(o.deadline ?? null)
                return (
                  <Link key={o.id} href={`/orders/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      background: 'var(--c-surface)',
                      border: `1px solid ${dlColor === '#ff6b9d' ? 'rgba(255,107,157,0.3)' : 'rgba(255,107,157,0.15)'}`,
                      borderRadius: '14px', padding: '14px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>📤</span>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: 'var(--c-text-4)' }}>発注{o.budget != null && ` · ¥${o.budget.toLocaleString()}`}</span>
                            {dlLabel && (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: dlColor }}>
                                📅 {dlLabel}
                              </span>
                            )}
                          </div>
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

        {/* ── クリエイター受注実績（依頼・プロジェクトの下に移動） ── */}
        {isCreatorRole && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ color: 'var(--c-accent)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 14px' }}>受注実績</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {[
                { icon: '✅', label: '完了件数', value: `${totalCompleted} 件` },
                { icon: '⭐', label: '平均評価', value: avgRating != null ? `${avgRating} / 5.0` : '評価なし', sub: avgRating != null ? `(${ratings.length}件)` : undefined },
                { icon: '💰', label: '有償案件収益（合計）', value: totalEarnings > 0 ? `¥${totalEarnings.toLocaleString()}` : '—' },
              ].map(({ icon, label, value, sub }) => (
                <div key={label} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border-2)', borderRadius: '16px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
                  <p style={{ color: 'var(--c-text-2)', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '0.05em' }}>{label}</p>
                  <p style={{ color: 'var(--c-text)', fontSize: '18px', fontWeight: '800', margin: 0 }}>{value}</p>
                  {sub && <p style={{ color: 'var(--c-text-3)', fontSize: '11px', margin: '2px 0 0' }}>{sub}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* クイックアクション */}
        <h3 style={{ color: 'var(--c-accent)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 14px' }}>クイックアクション</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '40px' }}>
          {[
            { href: '/search',        icon: '🔍', label: 'クリエイターを探す' },
            { href: '/clients',       icon: '📣', label: 'お仕事募集中の依頼者' },
            { href: '/jobs',          icon: '📋', label: '案件を探す' },
            { href: '/jobs/new',      icon: '📣', label: 'クリエイターを募集する' },
            { href: '/projects',      icon: '🎯', label: 'マイプロジェクト' },
            { href: '/orders',        icon: '🤝', label: '依頼管理' },
            { href: '/messages',      icon: '💬', label: 'メッセージ' },
            { href: '/notifications', icon: '🔔', label: `通知${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
            { href: '/events',        icon: '🎉', label: '交流会' },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 18px', borderRadius: '14px',
              background: 'var(--c-surface)', border: '1px solid var(--c-border-2)',
              color: 'var(--c-text)', fontSize: '14px', fontWeight: '700', textDecoration: 'none',
            }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <span style={{ fontSize: '13px' }}>{label}</span>
            </Link>
          ))}
        </div>

        {/* ── マイタスク（担当タスク一覧） ── */}
        {myTasks.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ color: 'var(--c-accent)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: 0 }}>マイタスク</h3>
              <Link href="/projects" style={{ color: 'var(--c-accent)', fontSize: '13px', textDecoration: 'none' }}>プロジェクト一覧 →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myTasks.map((t) => {
                const dlColor = deadlineColor(t.due_date)
                const dlLabel = deadlineLabel(t.due_date)
                const isBlocked = t.blockedBy.length > 0
                return (
                  <Link key={t.id} href={`/projects/${t.project_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      background: 'var(--c-surface)',
                      border: `1px solid ${isBlocked ? 'rgba(251,191,36,0.3)' : dlColor === '#ff6b9d' ? 'rgba(255,107,157,0.3)' : 'rgba(167,139,250,0.15)'}`,
                      borderRadius: '14px', padding: '14px 20px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>📋</span>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: 'var(--c-text-3)' }}>🎯 {t.projectTitle}</span>
                            {dlLabel && (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: dlColor }}>📅 {dlLabel}</span>
                            )}
                            {isBlocked && (
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24' }}>⚠️ 着手待ち</span>
                            )}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', flexShrink: 0, padding: '3px 10px', borderRadius: '20px',
                          color: t.status === 'in_progress' ? '#60a5fa' : '#a9a8c0',
                          background: t.status === 'in_progress' ? 'rgba(96,165,250,0.12)' : 'rgba(169,168,192,0.12)',
                        }}>
                          {t.status === 'in_progress' ? '進行中' : '未着手'}
                        </span>
                      </div>
                      {isBlocked && (
                        <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px' }}>
                          {t.blockedBy.map((b) => (
                            <p key={b.id} style={{ margin: 0, fontSize: '12px', color: '#fbbf24' }}>
                              「{b.title}」が完了していないため着手できません
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* カレンダー */}
        <DashboardCalendar calConnected={calConnected} />

        {/* 開発中の機能 */}
        <h3 style={{ color: 'var(--c-accent)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 14px' }}>開発中の機能</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { emoji: '💳', title: 'エスクロー決済', desc: 'Stripe連携・前払い', week: 'Week 11-12' },
            { emoji: '📝', title: 'AI依頼文添削', desc: 'Claude APIで自動添削', week: 'Week 13-14' },
          ].map(({ emoji, title, desc, week }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--c-border)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{emoji}</div>
              <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{title}</div>
              <div style={{ color: 'var(--c-text-3)', fontSize: '12px', marginBottom: '8px' }}>{desc}</div>
              <span style={{ fontSize: '11px', background: 'var(--c-accent-a12)', color: 'var(--c-accent)', padding: '2px 8px', borderRadius: '20px' }}>{week}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
