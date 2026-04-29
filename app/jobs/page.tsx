import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JobListingsClient from '@/components/JobListingsClient'
import { AppHeader } from '@/components/layout/AppHeader'

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
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <JobListingsClient
        listings={(listings ?? []) as unknown as Parameters<typeof JobListingsClient>[0]['listings']}
        currentUserId={user.id}
        postedSuccess={postedSuccess}
      />
    </div>
  )
}
