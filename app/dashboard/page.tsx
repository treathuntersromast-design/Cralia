import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import AvatarUpload from '@/components/AvatarUpload'
import { activityStyleToLabel } from '@/lib/constants/activity'
import { ORDER_STATUS_MAP, PROJECT_STATUS_MAP, INACTIVE_ORDER_STATUSES } from '@/lib/constants/statuses'
import DashboardCalendar from '@/components/DashboardCalendar'
import UpcomingMeetBanner from '@/components/UpcomingMeetBanner'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { QuickActions } from '@/components/dashboard/QuickActions'
import {
  CheckCircle2, Target, Inbox, Send, Calendar,
  Star, Wallet, AlertTriangle, User, Settings,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function dlTextCls(deadline: string | null): string {
  if (!deadline) return 'text-[var(--c-text-4)]'
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
  if (days < 0 || days <= 2) return 'text-[#dc2626]'
  if (days <= 6) return 'text-[#d97706]'
  return 'text-[var(--c-text-3)]'
}

function dlBorderCls(deadline: string | null, blocked = false): string {
  if (blocked) return 'border-[#d97706]/30'
  if (!deadline) return 'border-[var(--c-border-2)]'
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
  return days < 0 || days <= 2 ? 'border-[#dc2626]/25' : 'border-[var(--c-border-2)]'
}

type BadgeTone = 'brand' | 'ok' | 'warn' | 'danger' | 'neutral'

function projectTone(status: string): BadgeTone {
  if (status === 'recruiting')  return 'ok'
  if (status === 'in_progress') return 'brand'
  if (status === 'cancelled')   return 'danger'
  return 'neutral'
}

function orderTone(status: string): BadgeTone {
  if (status === 'pending')                    return 'warn'
  if (status === 'accepted')                   return 'brand'
  if (status === 'in_progress')                return 'brand'
  if (status === 'delivered')                  return 'ok'
  if (status === 'completed')                  return 'ok'
  if (status === 'cancelled' || status === 'disputed') return 'danger'
  return 'neutral'
}

function dlLabel(deadline: string | null): string {
  if (!deadline) return ''
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
  const dateStr = new Date(deadline).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  if (days < 0)   return `${dateStr}（${Math.abs(days)}日超過）`
  if (days === 0) return `${dateStr}（今日）`
  return `${dateStr}（あと${days}日）`
}

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
    supabase.from('project_boards')
      .select('id, title, status')
      .eq('owner_id', user.id)
      .in('status', ['recruiting', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('projects')
      .select('id, title, status, budget, deadline')
      .eq('creator_id', user.id)
      .not('status', 'in', INACTIVE_ORDER_STATUSES)
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(5),
    supabase.from('projects')
      .select('id, title, status, budget, deadline')
      .eq('client_id', user.id)
      .not('status', 'in', INACTIVE_ORDER_STATUSES)
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(5),
    db.from('creator_tokens').select('creator_id').eq('creator_id', user.id).limit(1),
    db.from('projects')
      .select('id, budget, order_type')
      .eq('creator_id', user.id)
      .eq('status', 'completed'),
    db.from('project_tasks')
      .select('id, title, status, due_date, project_id, project_boards(id, title)')
      .eq('assigned_user_id', user.id)
      .neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(10),
  ])

  const completedIds = (completedAsCreator ?? []).map((p) => p.id)
  const { data: reviewsAsCreator } = completedIds.length > 0
    ? await db.from('reviews').select('rating').in('project_id', completedIds)
    : { data: [] }

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
            const upIds = Array.from(new Set((depEdges ?? []).map((d) => d.depends_on_id)))
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
    id: string; title: string; status: string; due_date: string | null
    project_id: string; projectTitle: string; blockedBy: { id: string; title: string }[]
  }

  const myTasks: MyTask[] = (myTasksRaw ?? []).map((t) => {
    const pb = t.project_boards as unknown as { id: string; title: string } | null
    const deps = depByTask[t.id] ?? []
    const blockedBy = deps
      .filter((depId) => upstreamMap[depId]?.status !== 'done')
      .map((depId) => ({ id: depId, title: upstreamMap[depId]?.title ?? '不明なタスク' }))
    return { id: t.id, title: t.title, status: t.status, due_date: t.due_date,
             project_id: t.project_id, projectTitle: pb?.title ?? 'プロジェクト', blockedBy }
  })

  const profile = profileRows?.[0] ?? null
  if (!profile || !profile.activity_style_id) redirect('/profile/setup-prompt')

  const calConnected   = (calTokenRows?.length ?? 0) > 0
  const roleLabels     = activityStyleToLabel(profile.activity_style_id as number)
  const unreadCount    = unreadCount_ ?? 0
  const hasActiveOrders = (receivedOrders && receivedOrders.length > 0) || (sentOrders && sentOrders.length > 0)
  const totalCompleted = completedAsCreator?.length ?? 0
  const totalEarnings  = (completedAsCreator ?? [])
    .filter((p) => p.order_type !== 'free' && p.budget != null)
    .reduce((sum, p) => sum + (p.budget as number), 0)
  const ratings        = (reviewsAsCreator ?? []).map((r) => r.rating as number)
  const avgRating      = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null
  const isCreatorRole  = [1, 3].includes(profile.activity_style_id as number)

  const todayStr   = new Date().toISOString().slice(0, 10)
  const todayTasks = myTasks.filter((t) => t.due_date != null && t.due_date <= todayStr).slice(0, 3)

  const sectionLabel = 'text-[11px] font-bold tracking-[0.1em] text-[var(--c-text-3)] uppercase mb-3'

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader unreadNotifications={unreadCount} />

      <Container className="py-5">
        {/* ウェルカムバー */}
        <div className="flex items-center gap-4 py-4 mb-4 border-b border-[var(--c-border)] flex-wrap">
          <AvatarUpload
            currentUrl={profile.avatar_url ?? null}
            displayName={profile.display_name ?? user.email ?? '?'}
            size={40}
            readonly
          />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[var(--c-text)] truncate">
              {profile.display_name ?? user.email?.split('@')[0]} さん、おかえりなさい
            </p>
            <Badge tone="brand" variant="soft" className="mt-1">{roleLabels}</Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/profile/${user.id}`} className="no-underline">
              <Button variant="primary" size="sm" leftIcon={<User size={14} aria-hidden />}>
                プロフィール
              </Button>
            </Link>
            <Link href="/settings" className="no-underline">
              <Button variant="ghost" size="sm" leftIcon={<Settings size={14} aria-hidden />}>
                設定
              </Button>
            </Link>
          </div>
        </div>

        <UpcomingMeetBanner calConnected={calConnected} />

        {/* 2カラムグリッド */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-6">

          {/* ── 左カラム ── */}
          <div className="flex flex-col gap-8">

            {/* 今日のタスク */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className={sectionLabel}>今日のタスク</h2>
                <Link href="/projects" className="text-[13px] text-brand no-underline hover:underline">
                  プロジェクト一覧 →
                </Link>
              </div>
              {todayTasks.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="今日のタスクはありません"
                  description="プロジェクトを作成すると、ここに今日のタスクが並びます"
                  cta={{ label: 'プロジェクトを作成', href: '/projects/new' }}
                  className="py-10"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {todayTasks.map((t) => {
                    const isBlocked = t.blockedBy.length > 0
                    const label = dlLabel(t.due_date)
                    return (
                      <Link key={t.id} href={`/projects/${t.project_id}`} className="no-underline text-[var(--c-text)]">
                        <Card className={`p-4 border ${dlBorderCls(t.due_date, isBlocked)} hover:shadow-md-soft transition-shadow`}>
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-semibold truncate mb-1">{t.title}</p>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1 text-[12px] text-[var(--c-text-3)]">
                                  <Target size={11} aria-hidden /> {t.projectTitle}
                                </span>
                                {label && (
                                  <span className={`flex items-center gap-1 text-[12px] font-semibold ${dlTextCls(t.due_date)}`}>
                                    <Calendar size={11} aria-hidden /> {label}
                                  </span>
                                )}
                              </div>
                              {isBlocked && (
                                <div className="mt-2 flex flex-col gap-0.5">
                                  {t.blockedBy.map((b) => (
                                    <span key={b.id} className="flex items-center gap-1 text-[12px] text-[#d97706]">
                                      <AlertTriangle size={11} aria-hidden />
                                      「{b.title}」が完了していないため着手できません
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Badge tone={t.status === 'in_progress' ? 'brand' : 'neutral'} variant="soft" className="shrink-0">
                              {t.status === 'in_progress' ? '進行中' : '未着手'}
                            </Badge>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            {/* 稼働中のプロジェクト */}
            {activeProjects && activeProjects.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={sectionLabel}>稼働中のプロジェクト</h2>
                  <Link href="/projects" className="text-[13px] text-brand no-underline hover:underline">すべて見る →</Link>
                </div>
                <div className="flex flex-col gap-2">
                  {activeProjects.map((p) => {
                    const st = PROJECT_STATUS_MAP[p.status]
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`} className="no-underline text-[var(--c-text)]">
                        <Card bordered className="p-4 flex items-center justify-between gap-3 hover:border-brand transition-colors">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Target size={14} className="text-brand shrink-0" aria-hidden />
                            <span className="font-semibold text-[14px] truncate">{p.title}</span>
                          </div>
                          <Badge tone={projectTone(p.status)} variant="soft" className="shrink-0">
                            {st?.label ?? p.status}
                          </Badge>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* アクティブな依頼 */}
            {hasActiveOrders && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={sectionLabel}>アクティブな依頼</h2>
                  <Link href="/orders" className="text-[13px] text-brand no-underline hover:underline">すべて見る →</Link>
                </div>
                <div className="flex flex-col gap-2">
                  {(receivedOrders ?? []).map((o) => {
                    const st  = ORDER_STATUS_MAP[o.status] ?? { label: o.status, color: 'var(--c-text-2)', bg: 'var(--c-surface-3)' }
                    const lbl = dlLabel(o.deadline ?? null)
                    return (
                      <Link key={o.id} href={`/orders/${o.id}`} className="no-underline text-[var(--c-text)]">
                        <Card className={`p-4 border ${dlBorderCls(o.deadline ?? null)}`}>
                          <div className="flex items-center gap-3">
                            <Inbox size={14} className="text-[var(--c-text-3)] shrink-0" aria-hidden />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[14px] truncate mb-0.5">{o.title}</p>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[11px] text-[var(--c-text-4)]">
                                  受注{o.budget != null && ` · ¥${o.budget.toLocaleString()}`}
                                </span>
                                {lbl && (
                                  <span className={`flex items-center gap-1 text-[12px] font-semibold ${dlTextCls(o.deadline ?? null)}`}>
                                    <Calendar size={11} aria-hidden /> {lbl}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge tone={orderTone(o.status)} variant="soft" className="shrink-0">
                              {st.label}
                            </Badge>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                  {(sentOrders ?? []).map((o) => {
                    const st  = ORDER_STATUS_MAP[o.status] ?? { label: o.status, color: 'var(--c-text-2)', bg: 'var(--c-surface-3)' }
                    const lbl = dlLabel(o.deadline ?? null)
                    return (
                      <Link key={o.id} href={`/orders/${o.id}`} className="no-underline text-[var(--c-text)]">
                        <Card className={`p-4 border ${dlBorderCls(o.deadline ?? null)}`}>
                          <div className="flex items-center gap-3">
                            <Send size={14} className="text-[var(--c-text-3)] shrink-0" aria-hidden />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[14px] truncate mb-0.5">{o.title}</p>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[11px] text-[var(--c-text-4)]">
                                  発注{o.budget != null && ` · ¥${o.budget.toLocaleString()}`}
                                </span>
                                {lbl && (
                                  <span className={`flex items-center gap-1 text-[12px] font-semibold ${dlTextCls(o.deadline ?? null)}`}>
                                    <Calendar size={11} aria-hidden /> {lbl}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge tone={orderTone(o.status)} variant="soft" className="shrink-0">
                              {st.label}
                            </Badge>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          {/* ── 右カラム ── */}
          <div className="flex flex-col gap-8">

            {/* 受注実績 */}
            {isCreatorRole && (
              <section>
                <h2 className={sectionLabel}>受注実績</h2>
                <Card padded bordered className="bg-white">
                  <div className="grid grid-cols-3 divide-x divide-[var(--c-border)]">
                    <div className="px-4 first:pl-0">
                      <div className="flex items-center gap-2 text-[var(--c-text-3)] text-xs mb-1">
                        <CheckCircle2 size={14} aria-hidden />完了件数
                      </div>
                      <div className="text-2xl font-bold text-[var(--c-text)]">
                        {totalCompleted}<span className="text-sm font-normal ml-1">件</span>
                      </div>
                    </div>
                    <div className="px-4">
                      <div className="flex items-center gap-2 text-[var(--c-text-3)] text-xs mb-1">
                        <Star size={14} aria-hidden />平均評価
                      </div>
                      <div className="text-2xl font-bold text-[var(--c-text)]">
                        {avgRating ?? '—'}
                      </div>
                    </div>
                    <div className="px-4 last:pr-0">
                      <div className="flex items-center gap-2 text-[var(--c-text-3)] text-xs mb-1">
                        <Wallet size={14} aria-hidden />収益
                      </div>
                      <div className="text-2xl font-bold text-[var(--c-text)]">
                        {totalEarnings > 0 ? `¥${totalEarnings.toLocaleString()}` : '—'}
                      </div>
                    </div>
                  </div>
                  {totalCompleted === 0 && (
                    <p className="mt-3 pt-3 border-t border-[var(--c-border)] text-xs text-[var(--c-text-3)]">
                      最初の案件を完了すると、ここに実績が表示されます
                    </p>
                  )}
                </Card>
              </section>
            )}

            {/* クイックアクション */}
            <QuickActions unreadCount={unreadCount} />

            {/* カレンダー */}
            <DashboardCalendar calConnected={calConnected} />
          </div>
        </div>
      </Container>
    </div>
  )
}
