import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MessageCircle, ChevronRight } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/messages')

  const { data: orders } = await supabase
    .from('projects')
    .select('id, title, status, created_at, client_id, creator_id')
    .or(`client_id.eq.${user.id},creator_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container className="py-10">
        <div className="mb-8">
          <h1 className="text-[24px] font-bold mb-1">メッセージ</h1>
          <p className="text-[14px] text-[var(--c-text-3)]">依頼に紐づいたチャットスレッド</p>
        </div>

        {(!orders || orders.length === 0) ? (
          <EmptyState
            icon={MessageCircle}
            title="まだメッセージはありません"
            description="依頼が成立するとチャットスレッドがここに表示されます"
            action={
              <div className="flex gap-3 justify-center flex-wrap mt-2">
                <Link href="/search" className="inline-flex items-center h-9 px-4 rounded-[6px] bg-brand text-white text-[13px] font-medium no-underline hover:bg-brand-ink transition-colors">
                  クリエイターを探す
                </Link>
                <Link href="/clients" className="inline-flex items-center h-9 px-4 rounded-[6px] border border-brand/25 text-brand text-[13px] font-medium no-underline hover:bg-brand/5 transition-colors">
                  お仕事募集中の依頼者
                </Link>
              </div>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {orders.map((o) => (
              <Link key={o.id} href={`/messages/${o.id}`} className="no-underline text-[var(--c-text)]">
                <Card bordered className="p-4 flex items-center gap-4 hover:border-brand transition-colors">
                  <div className="w-11 h-11 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
                    <MessageCircle size={20} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] truncate mb-0.5">{o.title}</p>
                    <p className="text-[12px] text-[var(--c-text-3)]">
                      {o.client_id === user.id ? '依頼者として' : 'クリエイターとして'} · {new Date(o.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-[var(--c-text-4)] shrink-0" aria-hidden />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}
