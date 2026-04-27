'use client'

import { useState, useEffect } from 'react'

interface MeetEvent {
  id:          string
  title:       string
  start:       string
  hangoutLink: string
}

interface Props {
  calConnected: boolean
}

export default function UpcomingMeetBanner({ calConnected }: Props) {
  const [meets, setMeets] = useState<MeetEvent[]>([])

  useEffect(() => {
    if (!calConnected) return
    fetch('/api/calendar/upcoming-meets')
      .then((r) => r.json())
      .then((data) => setMeets(data.meets ?? []))
      .catch(() => {})
  }, [calConnected])

  if (meets.length === 0) return null

  return (
    <div style={{
      marginBottom: '24px', padding: '16px 20px', borderRadius: '14px',
      background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)',
    }}>
      <p style={{ margin: '0 0 10px', fontWeight: '700', fontSize: '14px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>📹</span>
        <span>12時間以内に Google Meet の予定があります</span>
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {meets.map((m) => {
          const timeLabel = new Date(m.start).toLocaleTimeString('ja-JP', {
            hour: '2-digit', minute: '2-digit',
          })
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '13px', color: '#a9a8c0', flexShrink: 0, minWidth: '40px' }}>
                {timeLabel}
              </span>
              <span style={{ fontSize: '14px', color: '#f0eff8', flex: 1 }}>
                {m.title}
              </span>
              <a
                href={m.hangoutLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                  background: 'rgba(74,222,128,0.18)', border: '1px solid rgba(74,222,128,0.35)',
                  color: '#4ade80', textDecoration: 'none', flexShrink: 0,
                }}
              >
                Meet に参加 →
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
