import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import ClientSearchClient from '@/components/ClientSearchClient'

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
  if (!matched) return { href: '/dashboard', label: '← ダッシュボードへ' }
  const labels: Record<string, string> = {
    '/orders': '← 依頼一覧へ',
    '/projects': '← プロジェクトへ',
    '/messages': '← メッセージへ',
    '/notifications': '← 通知へ',
    '/events': '← 交流会へ',
  }
  return { href: decoded, label: labels[matched] ?? '← ダッシュボードへ' }
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from('users')
    .select('id, display_name, avatar_url, entity_type, sns_links, client_type, created_at')
    .contains('roles', ['client'])
    .not('display_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (entityFilter === 'corporate') query = query.eq('entity_type', 'corporate')
  if (entityFilter === 'individual') query = query.eq('entity_type', 'individual')

  const { data } = await query
  const clients: Client[] = (data ?? []) as Client[]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      {/* ヘッダー */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/dashboard" style={{
          fontSize: '24px', fontWeight: '800',
          background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textDecoration: 'none',
        }}>
          Cralia
        </Link>
        <Link href={backHref} style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>
          {backLabel}
        </Link>
      </div>

      <ClientSearchClient
        clients={clients}
        initialEntity={entityFilter}
        initialQ={initialQ}
      />
    </div>
  )
}
