import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import OrdersClient from './OrdersClient'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/orders')

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: received }, { data: sent }] = await Promise.all([
    db.from('projects')
      .select('id, title, status, order_type, budget, deadline, created_at, client_id')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('projects')
      .select('id, title, status, order_type, budget, deadline, created_at, creator_id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return <OrdersClient received={received ?? []} sent={sent ?? []} userId={user.id} />
}
