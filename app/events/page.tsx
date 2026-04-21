'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
  const [events, setEvents]       = useState<Event[]>([])
  const [loading, setLoading]     = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)
  const [feedback, setFeedback]   = useState<{ id: string; msg: string } | null>(null)

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
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* ヘッダー */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/dashboard" style={{
          fontSize: '24px', fontWeight: '800',
          background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textDecoration: 'none',
        }}>
          Cralia
        </Link>
        <Link href="/dashboard" style={{
          color: '#7c7b99', fontSize: '13px', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          ← ダッシュボードに戻る
        </Link>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>

        {/* ページタイトル */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '5px 14px', borderRadius: '20px',
            background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
            marginBottom: '16px',
          }}>
            <span style={{ color: '#34d399', fontSize: '13px', fontWeight: '600' }}>🎉 クリエイター交流会</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 10px' }}>
            交流会への参加
          </h1>
          <p style={{ color: '#a9a8c0', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
            Cralia が企画するクリエイター交流会の一覧です。<br />
            参加申込は<strong style={{ color: '#34d399' }}>先着順</strong>となります。気になるイベントはお早めにお申し込みください。
          </p>
        </div>

        {/* ローディング */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#7c7b99' }}>
            読み込み中...
          </div>
        )}

        {/* イベント一覧 or 空状態 */}
        {!loading && events.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {events.map((event) => {
              const remaining = event.capacity - event.applicants
              const isFull = remaining <= 0
              const isCancelled = event.status === 'cancelled'
              const date = new Date(event.event_date)
              const fb = feedback?.id === event.id ? feedback.msg : null

              return (
                <div key={event.id} style={{
                  background: 'rgba(22,22,31,0.9)',
                  border: `1px solid ${isCancelled ? 'rgba(255,255,255,0.06)' : isFull ? 'rgba(255,255,255,0.06)' : 'rgba(52,211,153,0.2)'}`,
                  borderRadius: '20px', padding: '28px',
                  opacity: isCancelled || isFull ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      {/* タグ + 申込済みバッジ + 中止バッジ */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {isCancelled && (
                          <span style={{
                            fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px',
                            background: 'rgba(248,113,113,0.15)', color: '#f87171',
                          }}>中止</span>
                        )}
                        {event.isRegistered && !isCancelled && (
                          <span style={{
                            fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px',
                            background: 'rgba(52,211,153,0.15)', color: '#34d399',
                          }}>✓ 申込済み</span>
                        )}
                        {event.tags.map((tag) => (
                          <span key={tag} style={{
                            fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px',
                            background: 'rgba(199,125,255,0.12)', color: '#c77dff',
                          }}>{tag}</span>
                        ))}
                      </div>
                      <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px' }}>{event.title}</h2>
                      {event.description && (
                        <p style={{ color: '#a9a8c0', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px' }}>
                          {event.description}
                        </p>
                      )}
                      {/* 日時・場所 */}
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#7c7b99', fontSize: '13px' }}>
                          📅 {date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                          {' '}{date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}〜
                        </span>
                        <span style={{ color: '#7c7b99', fontSize: '13px' }}>📍 {event.location}</span>
                      </div>
                    </div>

                    {/* 定員・申込ボタン */}
                    {!isCancelled && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#7c7b99' }}>残り枠</p>
                          <p style={{
                            margin: 0, fontSize: '22px', fontWeight: '800',
                            color: remaining <= 3 ? '#f87171' : '#34d399',
                          }}>
                            {isFull ? '満員' : `${remaining} 名`}
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#5c5b78' }}>定員 {event.capacity} 名</p>
                        </div>
                        {isFull ? (
                          <button disabled style={{
                            padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'not-allowed',
                            background: 'rgba(255,255,255,0.06)', color: '#5c5b78',
                            fontSize: '14px', fontWeight: '700',
                          }}>申込締切</button>
                        ) : (
                          <button
                            onClick={() => handleRegister(event)}
                            disabled={registering === event.id}
                            style={{
                              padding: '12px 24px', borderRadius: '12px', border: 'none',
                              cursor: registering === event.id ? 'not-allowed' : 'pointer',
                              background: event.isRegistered
                                ? 'rgba(248,113,113,0.15)'
                                : 'linear-gradient(135deg, #34d399, #059669)',
                              color: event.isRegistered ? '#f87171' : '#fff',
                              fontSize: '14px', fontWeight: '700',
                            }}
                          >
                            {registering === event.id ? '処理中...' : event.isRegistered ? 'キャンセルする' : '参加申込'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* フィードバック */}
                  {fb && (
                    <div style={{
                      marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
                      background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
                      color: '#34d399', fontSize: '13px', fontWeight: '600',
                    }}>{fb}</div>
                  )}

                  {/* 残席少ない場合の警告 */}
                  {!isFull && !isCancelled && remaining <= 5 && (
                    <div style={{
                      marginTop: '16px', padding: '10px 14px', borderRadius: '10px',
                      background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                      color: '#f87171', fontSize: '13px', fontWeight: '600',
                    }}>
                      ⚠️ 残席わずか！お早めにお申し込みください。
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div style={{
            background: 'rgba(22,22,31,0.8)',
            border: '1px solid rgba(52,211,153,0.15)',
            borderRadius: '24px', padding: '64px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 12px' }}>
              近日開催予定
            </h2>
            <p style={{ color: '#a9a8c0', fontSize: '14px', lineHeight: '1.8', margin: '0 0 28px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              現在、交流会の情報を準備中です。<br />
              開催が決まり次第こちらでご案内します。<br />
              参加申込は<strong style={{ color: '#34d399' }}>先着順</strong>となりますので、通知をお見逃しなく！
            </p>
            <Link href="/notifications" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 28px', borderRadius: '12px',
              background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
              color: '#34d399', fontSize: '14px', fontWeight: '700', textDecoration: 'none',
            }}>
              🔔 通知を確認する
            </Link>
          </div>
        )}

        {/* 参加について */}
        <div style={{ marginTop: '48px', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <h3 style={{ color: '#5c5b78', fontSize: '13px', fontWeight: '700', margin: '0 0 8px' }}>ℹ️ 参加について</h3>
          <ul style={{ color: '#7c7b99', fontSize: '13px', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
            <li>参加申込は先着順です。定員に達し次第、申込を締め切ります。</li>
            <li>申込後はマイページの通知にて詳細をご案内します。</li>
            <li>キャンセルの場合はお早めにご連絡ください。</li>
          </ul>
        </div>

      </div>
    </main>
  )
}
