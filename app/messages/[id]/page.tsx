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
    <main style={{ height: '100dvh', background: 'var(--c-bg)', color: 'var(--c-text)', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid var(--c-border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        <Link href="/messages" style={{ color: 'var(--c-text-2)', fontSize: '18px', textDecoration: 'none', lineHeight: 1 }}>←</Link>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ fontWeight: '700', fontSize: '15px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {partnerName}
          </p>
          <p style={{ color: 'var(--c-text-4)', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.title}
          </p>
        </div>
        <Link href={`/orders/${order.id}`} style={{ color: 'var(--c-accent)', fontSize: '12px', textDecoration: 'none', flexShrink: 0 }}>
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
