import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/isAdmin'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { ChevronLeft, Construction } from 'lucide-react'

export default async function AdminMessagesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdmin(user.id, user.email)) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader isAdminUser isDashboard={false} />
      <Container className="py-8 max-w-2xl">
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-[var(--c-text-3)] hover:text-brand no-underline mb-6 transition-colors">
          <ChevronLeft size={14} /> 管理者メニューに戻る
        </Link>
        <h1 className="text-xl font-bold text-[var(--c-text)] mb-6">ユーザーへのメッセージ</h1>
        <div className="bg-[var(--c-surface)] border border-[var(--c-border-2)] rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <Construction size={32} className="text-[var(--c-text-4)]" aria-hidden />
          <p className="text-sm font-medium text-[var(--c-text-3)]">この機能は準備中です</p>
          <p className="text-xs text-[var(--c-text-4)] max-w-sm">
            管理者から特定ユーザーまたは全ユーザーへの一斉メッセージ機能は今後実装予定です。
          </p>
        </div>
      </Container>
    </div>
  )
}
