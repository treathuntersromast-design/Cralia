import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ReceiptClient from './ReceiptClient'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'

export const dynamic = 'force-dynamic'

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/orders/${params.id}/receipt`)

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order } = await db
    .from('projects')
    .select('id, title, status, budget, order_type, client_id, creator_id, created_at, deadline')
    .eq('id', params.id)
    .single()

  if (!order) notFound()
  if (order.client_id !== user.id && order.creator_id !== user.id) notFound()

  const [{ data: clientUser }, { data: creatorUser }] = await Promise.all([
    db.from('users').select('display_name').eq('id', order.client_id).single(),
    db.from('users').select('display_name').eq('id', order.creator_id).single(),
  ])

  const { data: receiptsRows } = await db
    .from('receipts')
    .select('*')
    .eq('project_id', params.id)
    .order('issued_at', { ascending: false })

  const isClient  = order.client_id  === user.id
  const isCreator = order.creator_id === user.id

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <Link
          href={`/orders/${params.id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--c-text-3)] no-underline hover:text-brand transition-colors mb-6"
        >
          <ArrowLeft size={14} aria-hidden />
          依頼詳細へ
        </Link>

        <div className="mb-7">
          <h1 className="text-[22px] font-bold mb-1.5">領収書 / 発注書</h1>
          <p className="text-[14px] text-[var(--c-text-3)]">{order.title}</p>
        </div>

        <ReceiptClient
          orderId={order.id}
          orderTitle={order.title}
          orderType={order.order_type ?? 'paid'}
          budget={order.budget}
          status={order.status}
          isClient={isClient}
          isCreator={isCreator}
          clientName={clientUser?.display_name ?? '不明'}
          creatorName={creatorUser?.display_name ?? '不明'}
          createdAt={order.created_at}
          initialReceipts={receiptsRows ?? []}
        />
      </Container>
    </div>
  )
}
