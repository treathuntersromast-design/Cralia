import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ORDER_STATUS_MAP } from '@/lib/constants/statuses'

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

  // クライアント・クリエイター情報を取得
  const clientIds  = [...new Set((disputedProjects ?? []).map((p) => p.client_id))]
  const creatorIds = [...new Set((disputedProjects ?? []).map((p) => p.creator_id))]
  const allIds     = [...new Set([...clientIds, ...creatorIds])]

  const [{ data: usersData }, { data: messagesData }] = await Promise.all([
    allIds.length > 0
      ? db.from('users').select('id, display_name, avatar_url, entity_type').in('id', allIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? db.from('messages').select('project_id, created_at, body, sender_id').in('project_id', projectIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const userMap = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]))

  // プロジェクトごとの最新メッセージ
  const lastMessageMap: Record<string, { body: string; created_at: string }> = {}
  for (const m of messagesData ?? []) {
    if (!lastMessageMap[m.project_id]) {
      lastMessageMap[m.project_id] = { body: m.body, created_at: m.created_at }
    }
  }

  const st = ORDER_STATUS_MAP['disputed']

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', color: '#f0eff8' }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--c-accent)', textDecoration: 'none' }}>
          Cralia
        </Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/admin" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← 管理者ダッシュボード</Link>
          <span style={{ color: '#f87171', fontSize: '13px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
            管理者
          </span>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px' }}>異議申し立て中の依頼</h1>
          <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>
            ステータスが「異議申し立て」になっている依頼の一覧です。依頼詳細ページで対応してください。
          </p>
        </div>

        {(!disputedProjects || disputedProjects.length === 0) ? (
          <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <p style={{ color: '#4ade80', fontWeight: '700', fontSize: '16px', margin: '0 0 6px' }}>異議申し立て中の依頼はありません</p>
            <p style={{ color: '#5c5b78', fontSize: '13px', margin: 0 }}>現在すべての依頼が正常に進行中です</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {disputedProjects.map((project) => {
              const client  = userMap[project.client_id]
              const creator = userMap[project.creator_id]
              const lastMsg = lastMessageMap[project.id]
              const daysSince = Math.floor((Date.now() - new Date(project.updated_at ?? project.created_at).getTime()) / 86400000)

              return (
                <div key={project.id} style={{
                  background: 'rgba(22,22,31,0.9)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '18px', padding: '24px',
                }}>
                  {/* ヘッダー行 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                          color: st.color, background: st.bg, border: `1px solid ${st.border}`,
                        }}>
                          {st.label}
                        </span>
                        {daysSince > 7 && (
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
                            ⚠️ {daysSince}日経過
                          </span>
                        )}
                        <span style={{ color: '#5c5b78', fontSize: '12px' }}>
                          {new Date(project.updated_at ?? project.created_at).toLocaleDateString('ja-JP')} 発生
                        </span>
                      </div>
                      <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.title}
                      </h2>
                      {project.budget != null && project.order_type !== 'free' && (
                        <p style={{ color: '#c77dff', fontSize: '14px', fontWeight: '700', margin: 0 }}>
                          ¥{project.budget.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/orders/${project.id}`}
                      style={{
                        flexShrink: 0, padding: '10px 20px', borderRadius: '12px',
                        background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)',
                        color: '#f87171', fontSize: '13px', fontWeight: '700', textDecoration: 'none',
                      }}
                    >
                      詳細を確認 →
                    </Link>
                  </div>

                  {/* 当事者情報 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    {[
                      { role: '依頼者（クライアント）', user: client, icon: '📣' },
                      { role: 'クリエイター（受注者）', user: creator, icon: '🎨' },
                    ].map(({ role, user: u, icon }) => (
                      <div key={role} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px' }}>
                        <p style={{ color: '#5c5b78', fontSize: '11px', fontWeight: '700', margin: '0 0 8px', letterSpacing: '0.05em' }}>{role}</p>
                        {u ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                              background: u.avatar_url ? 'transparent' : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                            }}>
                              {u.avatar_url
                                ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span style={{ fontSize: '14px' }}>{icon}</span>
                              }
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontWeight: '600', fontSize: '13px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {u.display_name ?? '名前なし'}
                              </p>
                              <p style={{ color: '#5c5b78', fontSize: '11px', margin: 0 }}>
                                {u.entity_type === 'corporate' ? '法人・団体' : '個人'} · ID: {u.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p style={{ color: '#5c5b78', fontSize: '13px', margin: 0 }}>情報なし</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 最新メッセージプレビュー */}
                  {lastMsg && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 14px' }}>
                      <p style={{ color: '#5c5b78', fontSize: '11px', fontWeight: '700', margin: '0 0 6px', letterSpacing: '0.05em' }}>最新メッセージ</p>
                      <p style={{ color: '#c0bdd8', fontSize: '13px', margin: '0 0 4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {lastMsg.body}
                      </p>
                      <p style={{ color: '#5c5b78', fontSize: '11px', margin: 0 }}>
                        {new Date(lastMsg.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
