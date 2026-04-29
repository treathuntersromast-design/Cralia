import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ClientSearchClient from '@/components/ClientSearchClient'
import { AppHeader } from '@/components/layout/AppHeader'

export const dynamic = 'force-dynamic'

export type Client = {
  id: string
  display_name: string
  avatar_url: string | null
  entity_type: string
  sns_links: { platform: string; id: string }[]
  client_type?: string[]
  created_at: string
}

const VALID_FROM_PATHS = ['/dashboard', '/orders', '/projects', '/messages', '/notifications', '/events']

function resolveFrom(raw: string | undefined): { href: string; label: string } {
  const decoded = raw ? decodeURIComponent(raw) : ''
  const matched = VALID_FROM_PATHS.find((p) => decoded.startsWith(p))
  if (!matched) return { href: '/dashboard', label: 'ダッシュボードへ' }
  const labels: Record<string, string> = {
    '/orders': '依頼一覧へ',
    '/projects': 'プロジェクトへ',
    '/messages': 'メッセージへ',
    '/notifications': '通知へ',
    '/events': '交流会へ',
  }
  return { href: decoded, label: labels[matched] ?? 'ダッシュボードへ' }
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { entity?: string; q?: string; from?: string }
}) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const VALID_ENTITIES = ['individual', 'corporate']
  const rawEntity = searchParams.entity ?? ''
  const entityFilter = VALID_ENTITIES.includes(rawEntity) ? rawEntity : ''
  const initialQ = (searchParams.q ?? '').slice(0, 200)
  const { href: backHref, label: backLabel } = resolveFrom(searchParams.from)

  let query: any = admin
    .from('users')
    .select('id, display_name, avatar_url, entity_type, sns_links, client_type, created_at')
    .contains('roles', ['client'])
    .not('display_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500)

  if (entityFilter === 'corporate') query = query.eq('entity_type', 'corporate')
  if (entityFilter === 'individual') query = query.eq('entity_type', 'individual')

  const { data } = await query
  const clients: Client[] = (data ?? []) as Client[]

  const showBack = backHref !== '/dashboard'

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      {showBack && (
        <div className="border-b border-[var(--c-border)] bg-[var(--c-surface)]">
          <div className="max-w-[1000px] mx-auto px-6 py-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-[13px] text-[var(--c-text-3)] no-underline hover:text-brand transition-colors"
            >
              <ArrowLeft size={13} aria-hidden />
              {backLabel}
            </Link>
          </div>
        </div>
      )}
      <ClientSearchClient
        clients={clients}
        initialEntity={entityFilter}
        initialQ={initialQ}
      />
    </div>
  )
}
