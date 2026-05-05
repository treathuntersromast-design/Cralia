'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { Inbox, FileText } from 'lucide-react'

interface PitchMessage {
  id:          string
  message:     string
  read_at:     string | null
  replied_at:  string | null
  reply_body:  string | null
  created_at:  string
  creator_id:  string
  users: { display_name: string | null; avatar_url: string | null } | null
}

export default function PitchInboxPage() {
  const router = useRouter()
  const [pitches,    setPitches]    = useState<PitchMessage[]>([])
  const [loading,    setLoading]    = useState(true)
  const [replyId,    setReplyId]    = useState<string | null>(null)
  const [replyBody,  setReplyBody]  = useState('')
  const [sending,    setSending]    = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pitch/inbox')
      .then((r) => {
        if (r.status === 401) { router.push('/login?next=/pitch/inbox'); return null }
        return r.json()
      })
      .then((data) => { if (data) setPitches(data.data ?? []) })
      .finally(() => setLoading(false))
  }, [router])

  const handleReply = async (pitchId: string) => {
    if (!replyBody.trim()) { setReplyError('返信内容を入力してください'); return }
    setSending(true)
    setReplyError(null)

    const res = await fetch(`/api/pitch/${pitchId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyBody: replyBody.trim() }),
    })

    const data = await res.json()
    setSending(false)

    if (!res.ok) { setReplyError(data.error ?? '返信に失敗しました'); return }

    setPitches((prev) => prev.map((p) => p.id === pitchId
      ? { ...p, replied_at: new Date().toISOString(), reply_body: replyBody.trim() }
      : p
    ))
    setReplyId(null)
    setReplyBody('')
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <div className="mb-8">
          <h1 className="text-[24px] font-bold mb-1.5">受信した営業メッセージ</h1>
          <p className="text-[14px] text-[var(--c-text-3)]">クリエイターからの売り込みメッセージを確認できます</p>
        </div>

        {loading ? (
          <p className="text-center text-[var(--c-text-3)] py-20">読み込み中...</p>
        ) : pitches.length === 0 ? (
          <EmptyState icon={Inbox} title="受信した営業メッセージはありません" description="クリエイターがあなたのプロフィールから送ったメッセージがここに届きます" />
        ) : (
          <div className="flex flex-col gap-3">
            {pitches.map((p) => {
              const creator = p.users as { display_name: string | null; avatar_url: string | null } | null
              const isReplying = replyId === p.id
              return (
                <div key={p.id} className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {creator?.avatar_url
                        ? <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-[14px]">🎨</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px] mb-0.5">{creator?.display_name ?? '不明'}</p>
                      <p className="text-[12px] text-[var(--c-text-4)]">
                        {new Date(p.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {p.replied_at && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--c-surface-2)] text-[var(--c-text-3)]">返信済み</span>
                    )}
                  </div>

                  <p className="text-[13px] text-[var(--c-text-2)] leading-[1.7] whitespace-pre-wrap mb-3">
                    {p.message}
                  </p>

                  {p.replied_at && p.reply_body ? (
                    <div className="mt-2 pt-3 border-t border-[var(--c-border)]">
                      <p className="text-[11px] font-bold text-[var(--c-text-4)] mb-1.5">あなたの返信：</p>
                      <p className="text-[13px] text-[var(--c-text-2)] leading-[1.7] whitespace-pre-wrap mb-3">{p.reply_body}</p>
                      <Link
                        href={`/orders/new?creator=${p.creator_id}&creatorName=${encodeURIComponent(creator?.display_name ?? 'クリエイター')}&from_pitch=${p.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold border border-[#4ade80]/30 bg-[#4ade80]/8 text-[#16a34a] hover:bg-[#4ade80]/15 no-underline transition-colors"
                      >
                        <FileText size={13} aria-hidden />
                        この営業から依頼を作成する
                      </Link>
                    </div>
                  ) : (
                    <>
                      {!isReplying ? (
                        <div className="flex flex-wrap gap-2">
                          <button type="button"
                            onClick={() => { setReplyId(p.id); setReplyBody(''); setReplyError(null) }}
                            className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border border-brand/20 bg-brand-soft text-brand hover:bg-brand/10 transition-colors">
                            返信する
                          </button>
                          <Link
                            href={`/orders/new?creator=${p.creator_id}&creatorName=${encodeURIComponent(creator?.display_name ?? 'クリエイター')}&from_pitch=${p.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold border border-[#4ade80]/30 bg-[#4ade80]/8 text-[#16a34a] hover:bg-[#4ade80]/15 no-underline transition-colors"
                          >
                            <FileText size={13} aria-hidden />
                            依頼を作成する
                          </Link>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-[var(--c-border)]">
                          <textarea
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                            placeholder={`${creator?.display_name ?? 'クリエイター'} さんへの返信を入力...`}
                            rows={4}
                            maxLength={1000}
                            className="w-full px-3.5 py-2.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition resize-y leading-[1.7]"
                          />
                          {replyError && <p className="text-[13px] text-[#dc2626]">{replyError}</p>}
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleReply(p.id)} disabled={sending}
                              className="px-5 py-2 rounded-[10px] text-[13px] font-bold bg-brand text-white hover:bg-brand/90 transition-colors disabled:opacity-60">
                              {sending ? '送信中...' : '返信を送る'}
                            </button>
                            <button type="button" onClick={() => { setReplyId(null); setReplyError(null) }}
                              className="px-5 py-2 rounded-[10px] text-[13px] border border-[var(--c-border)] text-[var(--c-text-3)] hover:bg-[var(--c-surface-2)] transition-colors">
                              キャンセル
                            </button>
                          </div>
                        </div>
                      )}
                    </>
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
