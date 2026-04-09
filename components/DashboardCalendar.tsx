'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface CalendarEvent {
  id:      string
  title:   string
  start:   string
  end:     string
  allDay:  boolean
  colorId: string | null
}

// Google Calendar のカラーID → 表示色
const GCAL_COLORS: Record<string, string> = {
  '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c',
  '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1',
  '9': '#5484ed', '10': '#51b749', '11': '#dc2127',
}
const DEFAULT_EVENT_COLOR = '#c77dff'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const first = new Date(year, month - 1, 1)
  const last  = new Date(year, month,     0)
  // 月初の曜日分だけ前月の日を埋める
  for (let i = 0; i < first.getDay(); i++) {
    days.push(new Date(year, month - 1, -first.getDay() + i + 1))
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month - 1, d))
  }
  // 6行になるよう末尾を埋める
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month, days.length - last.getDate() - first.getDay() + 1))
  }
  return days
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  calConnected: boolean
}

export default function DashboardCalendar({ calConnected }: Props) {
  const now = new Date()
  const [year,   setYear]   = useState(now.getFullYear())
  const [month,  setMonth]  = useState(now.getMonth() + 1)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const fetchEvents = useCallback(async (y: number, m: number) => {
    if (!calConnected) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/calendar/events?year=${y}&month=${m}`)
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [calConnected])

  useEffect(() => {
    fetchEvents(year, month)
  }, [fetchEvents, year, month])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const days = getDaysInMonth(year, month)
  const todayStr = toDateStr(now)

  // 日付ごとのイベントマップ
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  for (const ev of events) {
    const dateStr = ev.start.slice(0, 10)
    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = []
    eventsByDate[dateStr].push(ev)
  }

  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : []

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* セクションヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: 0 }}>
          カレンダー
        </h3>
        {calConnected && (
          <span style={{ fontSize: '11px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            Googleカレンダーより取得
          </span>
        )}
      </div>

      <div style={{
        background: 'rgba(22,22,31,0.9)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        {/* 月ナビゲーション */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{ background: 'none', border: 'none', color: '#a9a8c0', fontSize: '18px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}
          >
            ‹
          </button>
          <span style={{ fontWeight: '700', fontSize: '15px', color: '#f0eff8' }}>
            {year}年 {month}月
          </span>
          <button
            type="button"
            onClick={nextMonth}
            style={{ background: 'none', border: 'none', color: '#a9a8c0', fontSize: '18px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}
          >
            ›
          </button>
        </div>

        {calConnected ? (
          /* ── 連携済み：カレンダーグリッド ── */
          <div style={{ padding: '16px 20px' }}>
            {/* 曜日ヘッダー */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {WEEKDAYS.map((wd, i) => (
                <div key={wd} style={{
                  textAlign: 'center', fontSize: '11px', fontWeight: '700', padding: '4px 0',
                  color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : '#5c5b78',
                }}>
                  {wd}
                </div>
              ))}
            </div>

            {/* 日付グリッド */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#5c5b78', fontSize: '13px' }}>
                読み込み中...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {days.map((d, idx) => {
                  const dateStr     = toDateStr(d)
                  const isThisMonth = d.getMonth() + 1 === month
                  const isToday     = dateStr === todayStr
                  const isSelected  = dateStr === selectedDay
                  const dayEvents   = eventsByDate[dateStr] ?? []
                  const isWeekend   = idx % 7 === 0 ? 'sun' : idx % 7 === 6 ? 'sat' : null

                  return (
                    <button
                      key={dateStr + idx}
                      type="button"
                      onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                      style={{
                        position: 'relative',
                        background: isSelected
                          ? 'rgba(199,125,255,0.2)'
                          : isToday
                          ? 'rgba(199,125,255,0.1)'
                          : 'transparent',
                        border: isSelected
                          ? '1px solid rgba(199,125,255,0.5)'
                          : isToday
                          ? '1px solid rgba(199,125,255,0.3)'
                          : '1px solid transparent',
                        borderRadius: '8px',
                        padding: '6px 2px 4px',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                        minHeight: '44px',
                        opacity: isThisMonth ? 1 : 0.3,
                      }}
                    >
                      <span style={{
                        fontSize: '12px', fontWeight: isToday ? '800' : '400',
                        color: isToday
                          ? '#c77dff'
                          : isWeekend === 'sun'
                          ? '#f87171'
                          : isWeekend === 'sat'
                          ? '#60a5fa'
                          : '#f0eff8',
                      }}>
                        {d.getDate()}
                      </span>
                      {/* イベントドット（最大3件） */}
                      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            style={{
                              width: '5px', height: '5px', borderRadius: '50%',
                              background: ev.colorId ? (GCAL_COLORS[ev.colorId] ?? DEFAULT_EVENT_COLOR) : DEFAULT_EVENT_COLOR,
                              flexShrink: 0,
                            }}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span style={{ fontSize: '8px', color: '#7c7b99', lineHeight: '5px' }}>+</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* 選択日のイベント一覧 */}
            {selectedDay && (
              <div style={{
                marginTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '12px',
              }}>
                <p style={{ fontSize: '12px', color: '#7c7b99', margin: '0 0 8px' }}>
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                </p>
                {selectedEvents.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#5c5b78', margin: 0 }}>予定はありません</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedEvents.map((ev) => {
                      const color = ev.colorId ? (GCAL_COLORS[ev.colorId] ?? DEFAULT_EVENT_COLOR) : DEFAULT_EVENT_COLOR
                      const timeLabel = ev.allDay
                        ? '終日'
                        : new Date(ev.start).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                      return (
                        <div key={ev.id} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '6px 10px', borderRadius: '8px',
                          background: `${color}18`, borderLeft: `3px solid ${color}`,
                        }}>
                          <span style={{ fontSize: '11px', color: '#7c7b99', flexShrink: 0, minWidth: '32px' }}>
                            {timeLabel}
                          </span>
                          <span style={{ fontSize: '13px', color: '#f0eff8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.title}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── 未連携：グレーアウトカレンダー＋連携促進 ── */
          <div>
            {/* ぼかしたカレンダー（ダミー） */}
            <div style={{ padding: '16px 20px', filter: 'blur(3px)', opacity: 0.25, pointerEvents: 'none', userSelect: 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                {WEEKDAYS.map((wd) => (
                  <div key={wd} style={{ textAlign: 'center', fontSize: '11px', color: '#5c5b78', padding: '4px 0' }}>{wd}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {Array.from({ length: 35 }, (_, i) => (
                  <div key={i} style={{
                    borderRadius: '8px', padding: '6px 2px', minHeight: '44px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                    background: i === 10 ? 'rgba(199,125,255,0.1)' : 'transparent',
                  }}>
                    <span style={{ fontSize: '12px', color: '#f0eff8' }}>{(i % 31) + 1}</span>
                    {[3, 8, 15, 22].includes(i) && (
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#c77dff' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 連携促進オーバーレイ */}
            <div style={{
              margin: '-160px 0 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px 20px 28px',
              textAlign: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px', marginBottom: '12px',
                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
              }}>
                📅
              </div>
              <p style={{ fontWeight: '700', fontSize: '14px', color: '#f0eff8', margin: '0 0 6px' }}>
                Googleカレンダーと連携しましょう
              </p>
              <p style={{ fontSize: '12px', color: '#7c7b99', margin: '0 0 16px', lineHeight: '1.6', maxWidth: '280px' }}>
                連携すると、ダッシュボードで予定を確認できます。依頼時の納期提案にも活用されます。
              </p>
              <Link
                href="/settings/calendar"
                style={{
                  padding: '10px 24px', borderRadius: '10px',
                  background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)',
                  color: '#4ade80', fontSize: '13px', fontWeight: '700', textDecoration: 'none',
                }}
              >
                連携する →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
