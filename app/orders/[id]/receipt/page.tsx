import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ReceiptClient from './ReceiptClient'

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

  // 既存の領収書・発注書を取得
  const { data: receiptsRows } = await db
    .from('receipts')
    .select('*')
    .eq('project_id', params.id)
    .order('issued_at', { ascending: false })

  const isClient  = order.client_id  === user.id
  const isCreator = order.creator_id === user.id

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', color: '#f0eff8', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
        </Link>
        <Link href={`/orders/${params.id}`} style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← 依頼詳細へ</Link>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>領収書 / 発注書</h1>
          <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>{order.title}</p>
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
      </div>
    </main>
  )
}
