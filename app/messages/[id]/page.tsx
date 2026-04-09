import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ChatThread from './ChatThread'

export const dynamic = 'force-dynamic'

export default async function MessageThreadPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/messages/${params.id}`)

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order } = await db
    .from('projects')
    .select('id, title, status, client_id, creator_id')
    .eq('id', params.id)
    .single()

  if (!order) notFound()
  if (order.client_id !== user.id && order.creator_id !== user.id) notFound()

  const [{ data: messages }, { data: clientUser }, { data: creatorUser }] = await Promise.all([
    db.from('messages')
      .select('id, sender_id, body, created_at, read_at')
      .eq('project_id', params.id)
      .order('created_at', { ascending: true }),
    db.from('users').select('display_name').eq('id', order.client_id).single(),
    db.from('users').select('display_name').eq('id', order.creator_id).single(),
  ])

  const partnerName = order.client_id === user.id
    ? (creatorUser?.display_name ?? 'クリエイター')
    : (clientUser?.display_name  ?? '依頼者')

  return (
    <main style={{ height: '100dvh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', color: '#f0eff8', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        <Link href="/messages" style={{ color: '#a9a8c0', fontSize: '18px', textDecoration: 'none', lineHeight: 1 }}>←</Link>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ fontWeight: '700', fontSize: '15px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {partnerName}
          </p>
          <p style={{ color: '#5c5b78', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.title}
          </p>
        </div>
        <Link href={`/orders/${order.id}`} style={{ color: '#c77dff', fontSize: '12px', textDecoration: 'none', flexShrink: 0 }}>
          依頼詳細 →
        </Link>
      </div>

      {/* チャット本体 */}
      <ChatThread
        projectId={order.id}
        currentUserId={user.id}
        initialMessages={messages ?? []}
      />
    </main>
  )
}
