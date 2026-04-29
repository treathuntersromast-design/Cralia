import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ORDER_STATUS_MAP } from '@/lib/constants/statuses'
import { AlertTriangle, CheckCircle2, User } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)

export default async function DisputesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/disputes')

  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/dashboard')
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: disputedProjects } = await db
    .from('projects')
    .select('id, title, description, budget, deadline, status, created_at, updated_at, client_id, creator_id, order_type')
    .eq('status', 'disputed')
    .order('updated_at', { ascending: false })

  const projectIds = (disputedProjects ?? []).map((p) => p.id)

  const clientIds  = Array.from(new Set((disputedProjects ?? []).map((p) => p.client_id)))
  const creatorIds = Array.from(new Set((disputedProjects ?? []).map((p) => p.creator_id)))
  const allIds     = Array.from(new Set([...clientIds, ...creatorIds]))

  const [{ data: usersData }, { data: messagesData }] = await Promise.all([
    allIds.length > 0
      ? db.from('users').select('id, display_name, avatar_url, entity_type').in('id', allIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? db.from('messages').select('project_id, created_at, body, sender_id').in('project_id', projectIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const userMap = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]))

  const lastMessageMap: Record<string, { body: string; created_at: string }> = {}
  for (const m of messagesData ?? []) {
    if (!lastMessageMap[m.project_id]) {
      lastMessageMap[m.project_id] = { body: m.body, created_at: m.created_at }
    }
  }

  const st = ORDER_STATUS_MAP['disputed']

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container className="py-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-[14px] text-brand no-underline hover:underline">
              ← 管理者ダッシュボード
            </Link>
          </div>
          <Badge tone="danger" variant="soft">管理者</Badge>
        </div>

        <div className="mb-8 mt-4">
          <h1 className="text-[24px] font-bold mb-1">異議申し立て中の依頼</h1>
          <p className="text-[14px] text-[var(--c-text-3)]">
            ステータスが「異議申し立て」になっている依頼の一覧です。依頼詳細ページで対応してください。
          </p>
        </div>

        {(!disputedProjects || disputedProjects.length === 0) ? (
          <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-card py-16 text-center">
            <CheckCircle2 size={40} className="text-[#16a34a] mx-auto mb-4" aria-hidden />
            <p className="text-[#16a34a] font-bold text-[16px] mb-1">異議申し立て中の依頼はありません</p>
            <p className="text-[13px] text-[var(--c-text-4)]">現在すべての依頼が正常に進行中です</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {disputedProjects.map((project) => {
              const client  = userMap[project.client_id]
              const creator = userMap[project.creator_id]
              const lastMsg = lastMessageMap[project.id]
              const daysSince = Math.floor((Date.now() - new Date(project.updated_at ?? project.created_at).getTime()) / 86400000)

              return (
                <Card key={project.id} bordered className="p-6 border-[#dc2626]/20">
                  {/* ヘッダー行 */}
                  <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <Badge tone="danger" variant="soft">{st.label}</Badge>
                        {daysSince > 7 && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-[#dc2626] bg-[#dc2626]/8 border border-[#dc2626]/25 rounded-full px-2.5 py-0.5">
                            <AlertTriangle size={10} aria-hidden />
                            {daysSince}日経過
                          </span>
                        )}
                        <span className="text-[12px] text-[var(--c-text-4)]">
                          {new Date(project.updated_at ?? project.created_at).toLocaleDateString('ja-JP')} 発生
                        </span>
                      </div>
                      <h2 className="text-[18px] font-bold mb-1 truncate">{project.title}</h2>
                      {project.budget != null && project.order_type !== 'free' && (
                        <p className="text-brand font-bold text-[14px]">¥{project.budget.toLocaleString()}</p>
                      )}
                    </div>
                    <Link
                      href={`/orders/${project.id}`}
                      className="shrink-0 h-9 px-5 rounded-[8px] bg-[#dc2626]/10 border border-[#dc2626]/35 text-[#dc2626] text-[13px] font-bold no-underline hover:bg-[#dc2626]/15 transition-colors flex items-center"
                    >
                      詳細を確認 →
                    </Link>
                  </div>

                  {/* 当事者情報 */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {([
                      { role: '依頼者（クライアント）', u: client },
                      { role: 'クリエイター（受注者）', u: creator },
                    ] as const).map(({ role, u }) => (
                      <div key={role} className="bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-[10px] p-3.5">
                        <p className="text-[11px] font-bold text-[var(--c-text-4)] tracking-wider uppercase mb-2">{role}</p>
                        {u ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full shrink-0 bg-brand-soft text-brand flex items-center justify-center overflow-hidden">
                              {u.avatar_url
                                ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                : <User size={14} aria-hidden />
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[13px] truncate mb-0.5">{u.display_name ?? '名前なし'}</p>
                              <p className="text-[11px] text-[var(--c-text-4)]">
                                {u.entity_type === 'corporate' ? '法人・団体' : '個人'} · ID: {u.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[13px] text-[var(--c-text-4)]">情報なし</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 最新メッセージプレビュー */}
                  {lastMsg && (
                    <div className="bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-[8px] p-3.5">
                      <p className="text-[11px] font-bold text-[var(--c-text-4)] tracking-wider uppercase mb-1.5">最新メッセージ</p>
                      <p className="text-[13px] text-[var(--c-text-2)] mb-1 line-clamp-2">{lastMsg.body}</p>
                      <p className="text-[11px] text-[var(--c-text-4)]">
                        {new Date(lastMsg.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </Container>
    </div>
  )
}
