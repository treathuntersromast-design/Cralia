import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/AppHeader'
import CreatorListingsClient from '@/components/CreatorListingsClient'

export const dynamic = 'force-dynamic'

export default async function CreatorListingsPage({
  searchParams,
}: {
  searchParams: { posted?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/creator-listings')

  const { data, error } = await supabase
    .from('creator_listings')
    .select(`
      id, title, description, creator_types, order_type,
      price_min, price_max, status, created_at,
      creator_id,
      users!creator_listings_creator_id_fkey (
        display_name, avatar_url, entity_type
      )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--c-bg)]">
        <AppHeader />
        <p className="text-center mt-20 text-[var(--c-text-3)]">データの取得に失敗しました</p>
      </div>
    )
  }

  const listings = (data ?? []).map((item) => ({
    ...item,
    users: Array.isArray(item.users) ? (item.users[0] ?? null) : item.users,
  })) as Parameters<typeof CreatorListingsClient>[0]['listings']

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <CreatorListingsClient
        listings={listings}
        currentUserId={user.id}
        postedSuccess={searchParams.posted === '1'}
      />
    </div>
  )
}
