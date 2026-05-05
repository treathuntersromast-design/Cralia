import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { Send } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PitchSentPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/pitch')

  const { data: pitches } = await supabase
    .from('pitch_messages')
    .select(`
      id, message, read_at, replied_at, reply_body, created_at,
      client_id,
      users!pitch_messages_client_id_fkey (
        display_name, avatar_url
      )
    `)
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <div className="mb-8">
          <h1 className="text-[24px] font-bold mb-1.5">送信した営業メッセージ</h1>
          <p className="text-[14px] text-[var(--c-text-3)]">依頼者からの返信をここで確認できます</p>
        </div>

        {(!pitches || pitches.length === 0) ? (
          <EmptyState icon={Send} title="送信した営業メッセージはありません" description="依頼者のプロフィールページから営業メッセージを送ることができます" />
        ) : (
          <div className="flex flex-col gap-3">
            {pitches.map((p) => {
              const rawUsers = p.users
              const client = (Array.isArray(rawUsers) ? rawUsers[0] ?? null : rawUsers) as { display_name: string | null; avatar_url: string | null } | null
              return (
                <div key={p.id} className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {client?.avatar_url
                        ? <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-[14px]">👤</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px] mb-0.5">{client?.display_name ?? '不明'}</p>
                      <p className="text-[12px] text-[var(--c-text-4)]">
                        {new Date(p.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {p.read_at ? ' · 既読' : ' · 未読'}
                      </p>
                    </div>
                    {p.replied_at && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#4ade80]/12 text-[#16a34a]">返信あり</span>
                    )}
                  </div>

                  <p className="text-[13px] text-[var(--c-text-2)] leading-[1.7] whitespace-pre-wrap mb-0">
                    {p.message}
                  </p>

                  {p.replied_at && p.reply_body && (
                    <div className="mt-3 pt-3 border-t border-[var(--c-border)]">
                      <p className="text-[11px] font-bold text-[var(--c-text-4)] mb-1.5">返信：</p>
                      <p className="text-[13px] text-[var(--c-text-2)] leading-[1.7] whitespace-pre-wrap">
                        {p.reply_body}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </div>
  )
}
