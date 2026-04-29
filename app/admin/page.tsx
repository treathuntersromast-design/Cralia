import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)

const REPORT_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: '未対応',   cls: 'text-[#d97706] border-[#fbbf24]/30 bg-[#fbbf24]/5' },
  reviewing: { label: '確認中',   cls: 'text-[#60a5fa] border-[#60a5fa]/30 bg-[#60a5fa]/5' },
  resolved:  { label: '対応済み', cls: 'text-[#16a34a] border-[#4ade80]/30 bg-[#4ade80]/5' },
  dismissed: { label: '却下',     cls: 'text-[var(--c-text-3)] border-[var(--c-border)] bg-[var(--c-surface)]' },
}

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')

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
    { count: pendingReports },
    { data: recentReports },
  ] = await Promise.all([
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('projects').select('*', { count: 'exact', head: true }),
    db.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    db.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    db.from('projects').select('*', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'in_progress', 'delivered']),
    db.from('error_logs').select('id, endpoint, message, created_at, user_id').order('created_at', { ascending: false }).limit(20),
    db.from('projects').select('id, title, status, created_at, client_id, creator_id').order('created_at', { ascending: false }).limit(10),
    db.from('evaluation_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('evaluation_reports').select('id, reason, status, created_at, reporter_id, review_id').order('created_at', { ascending: false }).limit(20),
  ])

  const stats = [
    { label: '総ユーザー数',     value: totalUsers ?? 0,      bgCls: 'bg-brand-soft border-brand/20',      valCls: 'text-brand'      },
    { label: '総依頼数',         value: totalOrders ?? 0,     bgCls: 'bg-[#60a5fa]/8 border-[#60a5fa]/20', valCls: 'text-[#60a5fa]'  },
    { label: 'アクティブ',       value: activeOrders ?? 0,    bgCls: 'bg-[#fbbf24]/8 border-[#fbbf24]/20', valCls: 'text-[#d97706]'  },
    { label: '完了済み',         value: completedOrders ?? 0, bgCls: 'bg-[#4ade80]/8 border-[#4ade80]/20', valCls: 'text-[#16a34a]'  },
    { label: '異議申し立て中',   value: disputedOrders ?? 0,  bgCls: 'bg-[#f87171]/8 border-[#f87171]/20', valCls: 'text-[#dc2626]'  },
  ]

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container className="py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[24px] font-bold">管理者ダッシュボード</h1>
          <Badge tone="danger" variant="soft">管理者</Badge>
        </div>
        <p className="text-[14px] text-[var(--c-text-3)] mb-8">プラットフォーム全体の状況</p>

        {/* 統計カード */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-9">
          {stats.map(({ label, value, bgCls, valCls }) => (
            <div key={label} className={`${bgCls} border rounded-card p-5`}>
              <p className="text-[11px] font-bold text-[var(--c-text-3)] tracking-wider mb-1.5">{label}</p>
              <p className={`text-[28px] font-bold ${valCls}`}>{value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {/* 最近の依頼 */}
          <Card bordered padded>
            <h2 className="text-[12px] font-bold text-[var(--c-text-3)] tracking-wider uppercase mb-4">最近の依頼</h2>
            {!recentOrders || recentOrders.length === 0 ? (
              <p className="text-[13px] text-[var(--c-text-4)]">依頼はありません</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentOrders.map((o) => (
                  <Link key={o.id} href={`/orders/${o.id}`} className="no-underline text-[var(--c-text)]">
                    <div className="bg-[var(--c-surface-2)] rounded-[8px] px-3.5 py-2.5 hover:border hover:border-brand/20 transition-colors">
                      <p className="font-semibold text-[13px] truncate mb-0.5">{o.title}</p>
                      <div className="flex gap-2 items-center">
                        <span className="text-[11px] text-[var(--c-text-3)]">{o.status}</span>
                        <span className="text-[11px] text-[var(--c-text-4)]">
                          {new Date(o.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* エラーログ */}
          <Card bordered padded>
            <h2 className="text-[12px] font-bold text-[var(--c-text-3)] tracking-wider uppercase mb-4">エラーログ（直近20件）</h2>
            {!recentErrors || recentErrors.length === 0 ? (
              <div className="flex items-center gap-2 text-[#16a34a] text-[13px]">
                <CheckCircle2 size={15} aria-hidden />
                エラーはありません
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto">
                {recentErrors.map((e) => (
                  <div key={e.id} className="bg-[#f87171]/5 border border-[#f87171]/15 rounded-[8px] px-3.5 py-2.5">
                    <p className="text-[#dc2626] text-[12px] font-bold mb-0.5">[{e.endpoint}]</p>
                    <p className="text-[12px] text-[var(--c-text-2)] mb-1 leading-[1.5] break-all">{e.message}</p>
                    <p className="text-[11px] text-[var(--c-text-4)]">{new Date(e.created_at).toLocaleString('ja-JP')}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 異議申し立て警告 */}
        {(disputedOrders ?? 0) > 0 && (
          <div className="mt-5 bg-[#f87171]/5 border border-[#f87171]/25 rounded-card p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-[#dc2626] shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-[#dc2626] font-bold text-[14px] mb-0.5">
                  異議申し立て中の依頼が {disputedOrders} 件あります
                </p>
                <p className="text-[12px] text-[var(--c-text-3)]">対応が必要な依頼を確認してください</p>
              </div>
            </div>
            <Link
              href="/admin/disputes"
              className="shrink-0 h-9 px-4 rounded-[8px] bg-[#dc2626]/10 border border-[#dc2626]/35 text-[#dc2626] text-[13px] font-bold no-underline hover:bg-[#dc2626]/15 transition-colors flex items-center"
            >
              確認する
            </Link>
          </div>
        )}

        {/* 評価報告 pending 警告 */}
        {(pendingReports ?? 0) > 0 && (
          <div className="mt-5 bg-[#fbbf24]/5 border border-[#fbbf24]/25 rounded-card p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-[#d97706] shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-[#d97706] font-bold text-[14px] mb-0.5">
                  評価への異議申し立てが {pendingReports} 件あります（未対応）
                </p>
                <p className="text-[13px] text-[var(--c-text-3)]">下記一覧を確認し、対応してください。</p>
              </div>
            </div>
          </div>
        )}

        {/* 評価報告一覧 */}
        <Card bordered padded className="mt-5">
          <h2 className="text-[12px] font-bold text-[var(--c-text-3)] tracking-wider uppercase mb-4">
            評価への異議申し立て（直近20件）
          </h2>
          {!recentReports || recentReports.length === 0 ? (
            <div className="flex items-center gap-2 text-[#16a34a] text-[13px]">
              <CheckCircle2 size={15} aria-hidden />
              報告はありません
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto">
              {recentReports.map((rp) => {
                const si = REPORT_STATUS[rp.status] ?? REPORT_STATUS.pending
                return (
                  <div key={rp.id} className="bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-[8px] p-4">
                    <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${si.cls}`}>
                        {si.label}
                      </span>
                      <span className="text-[11px] text-[var(--c-text-4)]">
                        {new Date(rp.created_at).toLocaleString('ja-JP')}
                      </span>
                      <span className="text-[11px] text-[var(--c-text-3)]">
                        報告者 ID: {rp.reporter_id.slice(0, 8)}...
                      </span>
                      <span className="text-[11px] text-[var(--c-text-3)]">
                        レビュー ID: {rp.review_id.slice(0, 8)}...
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--c-text-2)] leading-[1.6] whitespace-pre-wrap break-words">
                      {rp.reason}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </Container>
    </div>
  )
}
