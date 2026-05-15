import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

export default async function AdminRedirectPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-[var(--c-surface)] border border-[var(--c-border)] rounded-[20px] px-8 py-10 shadow-[0_8px_32px_var(--c-shadow)]">

        <div className="text-center mb-8">
          <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-[var(--c-text-3)] mb-2">
            管理者アカウント
          </p>
          <h1 className="text-[22px] font-extrabold text-[var(--c-text)] m-0 mb-2">
            どちらに移動しますか？
          </h1>
          <p className="text-[13px] text-[var(--c-text-3)] m-0">
            {user.email}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-4 px-5 py-4 rounded-[14px] bg-[#f87171]/6 border border-[#f87171]/25 no-underline hover:bg-[#f87171]/10 transition-colors"
          >
            <span className="w-10 h-10 rounded-[10px] bg-[#dc2626]/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} color="#dc2626" aria-hidden />
            </span>
            <span>
              <span className="block font-bold text-[15px] text-[var(--c-text)] mb-0.5">
                管理者ページへ
              </span>
              <span className="block text-[12px] text-[var(--c-text-3)]">
                ユーザー管理・依頼管理・エラーログ
              </span>
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-4 px-5 py-4 rounded-[14px] bg-[var(--c-accent-a06)] border border-[var(--c-accent-a20)] no-underline hover:bg-[var(--c-accent-a12)] transition-colors"
          >
            <span className="w-10 h-10 rounded-[10px] bg-[var(--c-accent-a12)] flex items-center justify-center shrink-0">
              <LayoutDashboard size={20} color="var(--c-accent)" aria-hidden />
            </span>
            <span>
              <span className="block font-bold text-[15px] text-[var(--c-text)] mb-0.5">
                ダッシュボードへ
              </span>
              <span className="block text-[12px] text-[var(--c-text-3)]">
                通常のユーザーとして利用する
              </span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
