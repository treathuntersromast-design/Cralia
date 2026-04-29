import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ArrowLeft } from 'lucide-react'
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
    <main className="h-dvh bg-[var(--c-bg)] text-[var(--c-text)] flex flex-col">
      {/* チャットヘッダー */}
      <div className="border-b border-[var(--c-border)] px-5 py-3.5 flex items-center gap-3.5 shrink-0 bg-[var(--c-surface)]">
        <Link href="/messages" className="text-[var(--c-text-2)] no-underline flex items-center">
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] truncate">{partnerName}</p>
          <p className="text-[12px] text-[var(--c-text-4)] truncate">{order.title}</p>
        </div>
        <Link href={`/orders/${order.id}`} className="text-brand text-[12px] no-underline hover:underline shrink-0">
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
