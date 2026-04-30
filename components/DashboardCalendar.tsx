'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface CalendarEvent {
  id:      string
  title:   string
  start:   string
  end:     string
  allDay:  boolean
  colorId: string | null
}

const GCAL_COLORS: Record<string, string> = {
  '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c',
  '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1',
  '9': '#5484ed', '10': '#51b749', '11': '#dc2127',
}
const DEFAULT_EVENT_COLOR = '#1e40ff'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const first = new Date(year, month - 1, 1)
  const last  = new Date(year, month,     0)
  for (let i = 0; i < first.getDay(); i++) {
    days.push(new Date(year, month - 1, -first.getDay() + i + 1))
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month - 1, d))
  }
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
  const [year,        setYear]        = useState(now.getFullYear())
  const [month,       setMonth]       = useState(now.getMonth() + 1)
  const [events,      setEvents]      = useState<CalendarEvent[]>([])
  const [loading,     setLoading]     = useState(false)
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

  const eventsByDate: Record<string, CalendarEvent[]> = {}
  for (const ev of events) {
    const dateStr = ev.start.slice(0, 10)
    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = []
    eventsByDate[dateStr].push(ev)
  }

  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : []

  return (
    <div className="mb-8">
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-[11px] font-bold tracking-[0.08em] text-[var(--c-text-3)] uppercase m-0">
          カレンダー
        </h3>
        {calConnected && (
          <span className="text-[11px] text-[#16a34a] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] inline-block" />
            Googleカレンダーより取得
          </span>
        )}
      </div>

      <div className="bg-white border border-[var(--c-border)] rounded-[20px] overflow-hidden">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)]">
          <button
            type="button"
            onClick={prevMonth}
            className="bg-transparent border-0 text-[var(--c-text-3)] text-[18px] cursor-pointer px-2 py-1 rounded-lg hover:bg-[var(--c-surface-3)] transition-colors"
          >
            ‹
          </button>
          <span className="font-bold text-[15px] text-[var(--c-text)]">
            {year}年 {month}月
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="bg-transparent border-0 text-[var(--c-text-3)] text-[18px] cursor-pointer px-2 py-1 rounded-lg hover:bg-[var(--c-surface-3)] transition-colors"
          >
            ›
          </button>
        </div>

        {calConnected ? (
          /* ── 連携済み：カレンダーグリッド ── */
          <div className="px-5 py-4">
            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((wd, i) => (
                <div
                  key={wd}
                  className={`text-center text-[11px] font-bold py-1 ${
                    i === 0 ? 'text-[#ef4444]' : i === 6 ? 'text-[#3b82f6]' : 'text-[var(--c-text-4)]'
                  }`}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* 日付グリッド */}
            {loading ? (
              <div className="text-center py-8 text-[var(--c-text-4)] text-[13px]">
                読み込み中...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-0.5">
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
                      className={[
                        'relative rounded-lg p-1.5 pb-1 cursor-pointer flex flex-col items-center gap-0.5 min-h-[44px] transition-colors border',
                        isSelected
                          ? 'bg-[rgba(30,64,255,0.12)] border-[rgba(30,64,255,0.4)]'
                          : isToday
                          ? 'bg-[rgba(30,64,255,0.06)] border-[rgba(30,64,255,0.2)]'
                          : 'bg-transparent border-transparent hover:bg-[var(--c-surface-3)]',
                        isThisMonth ? 'opacity-100' : 'opacity-30',
                      ].join(' ')}
                    >
                      <span className={`text-[12px] ${
                        isToday
                          ? 'font-extrabold text-[rgb(var(--brand-rgb))]'
                          : isWeekend === 'sun'
                          ? 'font-normal text-[#ef4444]'
                          : isWeekend === 'sat'
                          ? 'font-normal text-[#3b82f6]'
                          : 'font-normal text-[var(--c-text)]'
                      }`}>
                        {d.getDate()}
                      </span>
                      {/* イベントドット（最大3件） */}
                      <div className="flex gap-0.5 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className="w-[5px] h-[5px] rounded-full shrink-0 inline-block"
                            style={{ background: ev.colorId ? (GCAL_COLORS[ev.colorId] ?? DEFAULT_EVENT_COLOR) : DEFAULT_EVENT_COLOR }}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] text-[var(--c-text-4)] leading-[5px]">+</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* 選択日のイベント一覧 */}
            {selectedDay && (
              <div className="mt-3 pt-3 border-t border-[var(--c-border)]">
                <p className="text-[12px] text-[var(--c-text-3)] m-0 mb-2">
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                </p>
                {selectedEvents.length === 0 ? (
                  <p className="text-[13px] text-[var(--c-text-4)] m-0">予定はありません</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {selectedEvents.map((ev) => {
                      const color = ev.colorId ? (GCAL_COLORS[ev.colorId] ?? DEFAULT_EVENT_COLOR) : DEFAULT_EVENT_COLOR
                      const timeLabel = ev.allDay
                        ? '終日'
                        : new Date(ev.start).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                          style={{ background: `${color}18`, borderLeft: `3px solid ${color}` }}
                        >
                          <span className="text-[11px] text-[var(--c-text-3)] shrink-0 min-w-[32px]">
                            {timeLabel}
                          </span>
                          <span className="text-[13px] text-[var(--c-text)] overflow-hidden text-ellipsis whitespace-nowrap">
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
            <div className="px-5 py-4 blur-[3px] opacity-25 pointer-events-none select-none">
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {WEEKDAYS.map((wd) => (
                  <div key={wd} className="text-center text-[11px] text-[var(--c-text-4)] py-1">{wd}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: 35 }, (_, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-1.5 min-h-[44px] flex flex-col items-center gap-0.5 ${
                      i === 10 ? 'bg-[rgba(30,64,255,0.06)]' : ''
                    }`}
                  >
                    <span className="text-[12px] text-[var(--c-text)]">{(i % 31) + 1}</span>
                    {[3, 8, 15, 22].includes(i) && (
                      <span className="w-[5px] h-[5px] rounded-full bg-[rgb(var(--brand-rgb))] inline-block" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 連携促進オーバーレイ */}
            <div className="flex flex-col items-center justify-center px-5 pb-7 text-center relative -mt-[160px]">
              <div className="w-12 h-12 rounded-[14px] mb-3 bg-[var(--c-surface-3)] border border-[var(--c-border-2)] flex items-center justify-center">
                <CalendarIcon size={22} className="text-[rgb(var(--brand-rgb))]" aria-hidden />
              </div>
              <p className="font-bold text-[14px] text-[var(--c-text)] m-0 mb-1.5">
                Googleカレンダーと連携しましょう
              </p>
              <p className="text-[12px] text-[var(--c-text-3)] m-0 mb-4 leading-[1.6] max-w-[280px]">
                連携すると、ダッシュボードで予定を確認できます。依頼時の納期提案にも活用されます。
              </p>
              <Link href="/settings/calendar" className="no-underline">
                <Button variant="primary" size="sm">連携する</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
