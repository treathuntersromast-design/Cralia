'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CalendarDays, MapPin, Users, PartyPopper } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

interface Event {
  id: string
  title: string
  event_date: string
  location: string
  capacity: number
  applicants: number
  description: string | null
  tags: string[]
  status: 'open' | 'closed' | 'cancelled'
  isRegistered: boolean
}

export default function EventsPage() {
  const [events, setEvents]           = useState<Event[]>([])
  const [loading, setLoading]         = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)
  const [feedback, setFeedback]       = useState<{ id: string; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => { setEvents(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleRegister(event: Event) {
    setRegistering(event.id)
    const method = event.isRegistered ? 'DELETE' : 'POST'
    const res = await fetch(`/api/events/${event.id}`, { method })
    if (res.ok) {
      const msg = event.isRegistered ? '申込をキャンセルしました' : '申込が完了しました！'
      setFeedback({ id: event.id, msg })
      setEvents((prev) => prev.map((e) =>
        e.id !== event.id ? e : {
          ...e,
          isRegistered: !e.isRegistered,
          applicants: e.isRegistered ? e.applicants - 1 : e.applicants + 1,
        }
      ))
    }
    setRegistering(null)
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container className="py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--c-text-2)] bg-[var(--c-surface)] border border-[var(--c-border)] rounded-full px-3 py-1 mb-4">
            <PartyPopper size={14} aria-hidden />
            クリエイター交流会
          </div>
          <h1 className="text-[24px] font-bold mb-2">交流会への参加</h1>
          <p className="text-[15px] text-[var(--c-text-2)] leading-[1.7]">
            Cralia が企画するクリエイター交流会の一覧です。<br />
            参加申込は<strong>先着順</strong>となります。気になるイベントはお早めにお申し込みください。
          </p>
        </div>

        {loading && (
          <p className="text-center py-16 text-[var(--c-text-3)] text-[14px]">読み込み中...</p>
        )}

        {!loading && events.length > 0 && (
          <div className="flex flex-col gap-4">
            {events.map((event) => {
              const remaining = event.capacity - event.applicants
              const isFull = remaining <= 0
              const isCancelled = event.status === 'cancelled'
              const date = new Date(event.event_date)
              const fb = feedback?.id === event.id ? feedback.msg : null

              return (
                <Card key={event.id} bordered className={`p-6 ${isCancelled || isFull ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 flex-wrap mb-3">
                        {isCancelled && <Badge tone="danger" variant="soft">中止</Badge>}
                        {event.isRegistered && !isCancelled && <Badge tone="ok" variant="soft">申込済み</Badge>}
                        {event.tags.map((tag) => (
                          <Badge key={tag} tone="brand" variant="soft">{tag}</Badge>
                        ))}
                      </div>
                      <h2 className="text-[18px] font-bold mb-2">{event.title}</h2>
                      {event.description && (
                        <p className="text-[14px] text-[var(--c-text-2)] leading-[1.6] mb-4">{event.description}</p>
                      )}
                      <div className="flex gap-5 flex-wrap">
                        <span className="flex items-center gap-1.5 text-[13px] text-[var(--c-text-3)]">
                          <CalendarDays size={14} aria-hidden />
                          {date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                          {' '}{date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}〜
                        </span>
                        <span className="flex items-center gap-1.5 text-[13px] text-[var(--c-text-3)]">
                          <MapPin size={14} aria-hidden />
                          {event.location}
                        </span>
                      </div>
                    </div>

                    {!isCancelled && (
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-[12px] text-[var(--c-text-3)] mb-0.5">残り枠</p>
                          <p className={`text-[22px] font-bold ${remaining <= 3 ? 'text-[#dc2626]' : 'text-brand'}`}>
                            {isFull ? '満員' : `${remaining} 名`}
                          </p>
                          <p className="text-[11px] text-[var(--c-text-4)]">定員 {event.capacity} 名</p>
                        </div>
                        {isFull ? (
                          <Button variant="ghost" size="sm" disabled>申込締切</Button>
                        ) : event.isRegistered ? (
                          <button
                            type="button"
                            onClick={() => handleRegister(event)}
                            disabled={registering === event.id}
                            className="h-10 px-5 rounded-[8px] border border-[#dc2626]/30 bg-[#dc2626]/5 text-[#dc2626] text-[14px] font-semibold cursor-pointer disabled:cursor-not-allowed transition-colors hover:bg-[#dc2626]/10"
                          >
                            {registering === event.id ? '処理中...' : 'キャンセルする'}
                          </button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={registering === event.id}
                            onClick={() => handleRegister(event)}
                          >
                            参加申込
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {fb && (
                    <div className="mt-3 px-3.5 py-2.5 rounded-[8px] bg-[#4ade80]/8 border border-[#4ade80]/25 text-[13px] font-semibold text-[#16a34a]">
                      {fb}
                    </div>
                  )}

                  {!isFull && !isCancelled && remaining <= 5 && (
                    <div className="mt-4 px-3.5 py-2.5 rounded-[8px] bg-[#dc2626]/5 border border-[#dc2626]/20 text-[13px] font-semibold text-[#dc2626]">
                      残席わずか！お早めにお申し込みください。
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {!loading && events.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            title="近日開催予定"
            description="現在、交流会の情報を準備中です。開催が決まり次第こちらでご案内します。参加申込は先着順となりますので、通知をお見逃しなく！"
            action={
              <Link
                href="/notifications"
                className="inline-flex items-center h-9 px-4 rounded-[6px] bg-brand text-white text-[13px] font-medium no-underline hover:bg-brand-ink transition-colors"
              >
                通知を確認する
              </Link>
            }
          />
        )}

        <div className="mt-12 p-6 rounded-card border border-[var(--c-border)] bg-[var(--c-surface)]">
          <h3 className="text-[13px] font-bold text-[var(--c-text-3)] mb-3 flex items-center gap-2">
            <Users size={14} aria-hidden />
            参加について
          </h3>
          <ul className="text-[13px] text-[var(--c-text-2)] leading-[1.8] m-0 pl-5">
            <li>参加申込は先着順です。定員に達し次第、申込を締め切ります。</li>
            <li>申込後はマイページの通知にて詳細をご案内します。</li>
            <li>キャンセルの場合はお早めにご連絡ください。</li>
          </ul>
        </div>
      </Container>
    </div>
  )
}
