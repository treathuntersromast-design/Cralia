import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/isAdmin'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { ChevronLeft } from 'lucide-react'
import EventForm from '../EventForm'

export default async function NewEventPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/events/new')
  if (!isAdmin(user.id, user.email)) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader isAdminUser isDashboard={false} />
      <Container className="py-8 max-w-2xl">
        <Link href="/admin/events" className="inline-flex items-center gap-1 text-xs text-[var(--c-text-3)] hover:text-brand no-underline mb-4 transition-colors">
          <ChevronLeft size={14} /> イベント一覧に戻る
        </Link>
        <h1 className="text-xl font-bold text-[var(--c-text)] mb-6">イベントを新規作成</h1>
        <EventForm mode="new" />
      </Container>
    </div>
  )
}
