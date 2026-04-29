import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  MessageCircle, Target, Inbox, CheckCircle2,
  XCircle, Star, Bell, type LucideIcon,
} from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

const TYPE_META: Record<string, { icon: LucideIcon; cls: string }> = {
  message:        { icon: MessageCircle, cls: 'bg-[#60a5fa]/10 text-[#60a5fa]'   },
  project_invite: { icon: Target,        cls: 'bg-brand/10 text-brand'             },
  order_received: { icon: Inbox,         cls: 'bg-[#4ade80]/10 text-[#16a34a]'   },
  order_accepted: { icon: CheckCircle2,  cls: 'bg-[#4ade80]/10 text-[#16a34a]'   },
  order_declined: { icon: XCircle,       cls: 'bg-[#f87171]/10 text-[#dc2626]'   },
  review:         { icon: Star,          cls: 'bg-[#fbbf24]/10 text-[#d97706]'   },
  system:         { icon: Bell,          cls: 'bg-[var(--c-surface-3)] text-[var(--c-text-3)]' },
}

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/notifications')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const unreadIds = new Set((notifications ?? []).filter((n) => !n.read_at).map((n) => n.id))
  if (unreadIds.size > 0) {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', Array.from(unreadIds))
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <h1 className="text-[24px] font-bold mb-8">通知</h1>
        {(!notifications || notifications.length === 0) ? (
          <EmptyState icon={Bell} title="通知はありません" description="依頼やメッセージが届くとここに表示されます" />
        ) : (
          <div className="flex flex-col gap-1.5">
            {notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.system
              const IconComp = meta.icon
              const isUnread = unreadIds.has(n.id)
              return (
                <div key={n.id} className={`flex gap-4 items-start p-4 rounded-card border transition-colors ${isUnread ? 'bg-brand/5 border-brand/15' : 'bg-[var(--c-surface)] border-[var(--c-border)]'}`}>
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${meta.cls}`}>
                    <IconComp size={18} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] mb-1 ${isUnread ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                    {n.body && <p className="text-[13px] text-[var(--c-text-2)] mb-1.5 leading-snug">{n.body}</p>}
                    <p className="text-[12px] text-[var(--c-text-4)]">
                      {new Date(n.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {isUnread && <div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-2" />}
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </div>
  )
}
