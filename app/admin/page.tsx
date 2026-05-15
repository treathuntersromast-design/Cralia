import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import {
  MessageSquare, CreditCard, Settings2, Mail,
  Users, BarChart3, Megaphone, ShieldCheck, AlertTriangle, CalendarDays,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const menuItems = [
  {
    href: '/admin/inquiries',
    icon: MessageSquare,
    title: '問い合わせ管理',
    desc: 'ユーザーからの問い合わせ・紛争を確認・対応する',
    accent: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    href: '/admin/payments',
    icon: CreditCard,
    title: '決済管理',
    desc: '預かり決済の確認・支払確定・返金・振込登録を行う',
    accent: 'bg-green-50 text-green-600 border-green-100',
  },
  {
    href: '/admin/fees',
    icon: Settings2,
    title: '手数料設定',
    desc: '事務手数料・振込手数料・最低依頼金額の現在値を確認する',
    accent: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    href: '/admin/messages',
    icon: Mail,
    title: 'ユーザーへのメッセージ',
    desc: '特定ユーザーまたは全ユーザーに通知・メッセージを送信する',
    accent: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  {
    href: '/admin/users',
    icon: Users,
    title: 'ユーザー管理',
    desc: 'ユーザー一覧の確認・アカウント情報の管理を行う',
    accent: 'bg-rose-50 text-rose-600 border-rose-100',
  },
  {
    href: '/admin/reports',
    icon: BarChart3,
    title: '売上レポート',
    desc: '手数料収入・決済件数の月次集計を確認する',
    accent: 'bg-teal-50 text-teal-600 border-teal-100',
  },
  {
    href: '/admin/announcements',
    icon: Megaphone,
    title: 'お知らせ管理',
    desc: 'サービス全体へのお知らせ・メンテナンス通知を管理する',
    accent: 'bg-orange-50 text-orange-600 border-orange-100',
  },
  {
    href: '/admin/events',
    icon: CalendarDays,
    title: 'イベント管理',
    desc: 'クリエイター交流イベントの作成・編集・削除を行う',
    accent: 'bg-sky-50 text-sky-600 border-sky-100',
  },
]

export default async function AdminMenuPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')
  if (!isAdmin(user.id, user.email)) redirect('/dashboard')

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { count: totalUsers },
    { count: pendingPayments },
    { count: disputedPayments },
  ] = await Promise.all([
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('payments').select('*', { count: 'exact', head: true }).in('status', ['held', 'payout_pending']),
    db.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
  ])

  const stats = [
    { label: '総ユーザー数', value: totalUsers ?? 0, cls: 'text-brand' },
    { label: '対応待ち決済', value: pendingPayments ?? 0, cls: 'text-amber-600' },
    { label: '要確認決済', value: disputedPayments ?? 0, cls: 'text-red-500' },
  ]

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader isAdminUser isDashboard={false} />

      <Container className="py-8 max-w-4xl">
        {/* ヘッダ */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--c-accent)] flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-white" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--c-text)]">管理者メニュー</h1>
            <p className="text-xs text-[var(--c-text-3)]">Cralia プラットフォーム管理</p>
          </div>
        </div>

        {/* クイック統計 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map(s => (
            <div key={s.label} className="bg-[var(--c-surface)] border border-[var(--c-border-2)] rounded-2xl px-4 py-3">
              <div className="text-xs text-[var(--c-text-3)] mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.cls}`}>{s.value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* 要確認アラート */}
        {(disputedPayments ?? 0) > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
              <AlertTriangle size={16} aria-hidden />
              要確認の決済が {disputedPayments} 件あります
            </div>
            <Link href="/admin/payments" className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg no-underline hover:bg-red-700 transition-colors">
              確認する
            </Link>
          </div>
        )}

        {/* メニュー */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {menuItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-4 p-5 bg-[var(--c-surface)] border border-[var(--c-border-2)] rounded-2xl hover:border-brand hover:shadow-sm transition-all no-underline"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${item.accent}`}>
                <item.icon size={18} aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[var(--c-text)] text-sm group-hover:text-brand transition-colors">
                  {item.title}
                </div>
                <div className="text-xs text-[var(--c-text-3)] mt-0.5 leading-relaxed">
                  {item.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  )
}
