import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { ChevronLeft, Plus, Star, Calendar, MapPin, Users, Ticket } from 'lucide-react'
import EventListActions from './EventListActions'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open:      { label: '受付中',   cls: 'bg-green-50 text-green-700 border-green-200' },
  closed:    { label: '締切',     cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  cancelled: { label: '中止',     cls: 'bg-red-50 text-red-600 border-red-200' },
}

const VENUE_LABEL: Record<string, string> = {
  online: 'オンライン',
  offline: 'オフライン',
  hybrid: 'ハイブリッド',
}

export default async function AdminEventsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/events')
  if (!isAdmin(user.id, user.email)) redirect('/dashboard')

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: events } = await db
    .from('events')
    .select('id, title, event_date, ends_at, apply_deadline, location, venue_type, capacity, fee, status, is_featured, organizer_name, tags')
    .order('event_date', { ascending: false })

  const list = events ?? []

  const now = new Date()
  const upcoming = list.filter(e => new Date(e.event_date) >= now)
  const past     = list.filter(e => new Date(e.event_date) < now)

  function formatDate(dt: string | null) {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('ja-JP', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function EventRow({ ev }: { ev: typeof list[0] }) {
    const st = STATUS_LABEL[ev.status] ?? STATUS_LABEL.open
    return (
      <div className="bg-[var(--c-surface)] border border-[var(--c-border-2)] rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2 min-w-0">
            {ev.is_featured && <Star size={14} className="text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" />}
            <div className="min-w-0">
              <div className="font-semibold text-[var(--c-text)] text-sm leading-snug truncate">{ev.title}</div>
              {ev.organizer_name && (
                <div className="text-xs text-[var(--c-text-3)] mt-0.5">{ev.organizer_name}</div>
              )}
            </div>
          </div>
          <span className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full border ${st.cls}`}>
            {st.label}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[var(--c-text-3)] mb-3">
          <div className="flex items-center gap-1">
            <Calendar size={12} aria-hidden />
            <span>{formatDate(ev.event_date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={12} aria-hidden />
            <span>{VENUE_LABEL[ev.venue_type] ?? ev.venue_type} / {ev.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={12} aria-hidden />
            <span>定員 {ev.capacity.toLocaleString()} 名</span>
          </div>
          <div className="flex items-center gap-1">
            <Ticket size={12} aria-hidden />
            <span>{ev.fee === 0 ? '無料' : `¥${ev.fee.toLocaleString()}`}</span>
          </div>
        </div>

        {ev.tags && ev.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {(ev.tags as string[]).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-[var(--c-bg)] border border-[var(--c-border-2)] rounded-full text-[var(--c-text-3)]">
                {tag}
              </span>
            ))}
          </div>
        )}

        <EventListActions eventId={ev.id} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader isAdminUser isDashboard={false} />
      <Container className="py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-[var(--c-text-3)] hover:text-brand no-underline mb-2 transition-colors">
              <ChevronLeft size={14} /> 管理者メニューに戻る
            </Link>
            <h1 className="text-xl font-bold text-[var(--c-text)]">イベント管理</h1>
          </div>
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--c-accent)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity no-underline"
          >
            <Plus size={16} aria-hidden />
            新規作成
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-16 text-[var(--c-text-3)] text-sm">
            イベントがまだありません。「新規作成」から追加してください。
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[var(--c-text-3)] uppercase tracking-wider mb-3">
                  今後のイベント ({upcoming.length}件)
                </h2>
                <div className="space-y-3">
                  {upcoming.map(ev => <EventRow key={ev.id} ev={ev} />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[var(--c-text-3)] uppercase tracking-wider mb-3">
                  過去のイベント ({past.length}件)
                </h2>
                <div className="space-y-3">
                  {past.map(ev => <EventRow key={ev.id} ev={ev} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </Container>
    </div>
  )
}
