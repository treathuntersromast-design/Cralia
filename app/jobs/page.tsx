import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import JobListingsClient from '@/components/JobListingsClient'

export const dynamic = 'force-dynamic'

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { posted?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/jobs')

  const { data: listings } = await supabase
    .from('job_listings')
    .select(`
      id, title, description, creator_types, order_type,
      budget_min, budget_max, deadline, status, created_at, client_id,
      users!job_listings_client_id_fkey (
        display_name, avatar_url, entity_type
      )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(100)

  const postedSuccess = searchParams.posted === '1'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--c-bg)',
      color: 'var(--c-text)',
    }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid var(--c-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--c-accent)', textDecoration: 'none' }}>
          Cralia
        </Link>
        <Link href="/dashboard" style={{ color: 'var(--c-text-2)', fontSize: '14px', textDecoration: 'none' }}>← ダッシュボードへ</Link>
      </div>

      <JobListingsClient
        listings={(listings ?? []) as Parameters<typeof JobListingsClient>[0]['listings']}
        currentUserId={user.id}
        postedSuccess={postedSuccess}
      />
    </div>
  )
}
