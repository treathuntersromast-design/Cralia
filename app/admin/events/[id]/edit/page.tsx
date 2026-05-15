import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { ChevronLeft } from 'lucide-react'
import EventForm from '../../EventForm'

export const dynamic = 'force-dynamic'

function toDatetimeLocal(dt: string | null): string {
  if (!dt) return ''
  // datetime-local requires "YYYY-MM-DDTHH:mm" format
  return new Date(dt).toISOString().slice(0, 16)
}

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/admin/events/${params.id}/edit`)
  if (!isAdmin(user.id, user.email)) redirect('/dashboard')

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: ev } = await db
    .from('events')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!ev) return notFound()

  const initialValues = {
    title:           ev.title ?? '',
    description:     ev.description ?? '',
    event_date:      toDatetimeLocal(ev.event_date),
    ends_at:         toDatetimeLocal(ev.ends_at),
    apply_deadline:  toDatetimeLocal(ev.apply_deadline),
    location:        ev.location ?? '',
    venue_type:      (ev.venue_type ?? 'online') as 'online' | 'offline' | 'hybrid',
    capacity:        ev.capacity ?? 30,
    fee:             ev.fee ?? 0,
    target_audience: ev.target_audience ?? '',
    banner_url:      ev.banner_url ?? '',
    cancel_policy:   ev.cancel_policy ?? '',
    organizer_name:  ev.organizer_name ?? '',
    tags:            (ev.tags as string[] ?? []).join(', '),
    status:          (ev.status ?? 'open') as 'open' | 'closed' | 'cancelled',
    is_featured:     ev.is_featured ?? false,
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader isAdminUser isDashboard={false} />
      <Container className="py-8 max-w-2xl">
        <Link href="/admin/events" className="inline-flex items-center gap-1 text-xs text-[var(--c-text-3)] hover:text-brand no-underline mb-4 transition-colors">
          <ChevronLeft size={14} /> イベント一覧に戻る
        </Link>
        <h1 className="text-xl font-bold text-[var(--c-text)] mb-6">イベントを編集</h1>
        <EventForm mode="edit" eventId={params.id} initialValues={initialValues} />
      </Container>
    </div>
  )
}
