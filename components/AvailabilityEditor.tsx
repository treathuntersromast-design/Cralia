'use client'

import { useState } from 'react'

const OPTIONS = [
  { value: 'open',     label: '受付中',     desc: '新しい依頼を受け付けています',                color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  { value: 'one_slot', label: '要相談',     desc: '納期等によっては受注できる場合があります',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { value: 'full',     label: '現在対応不可', desc: '現在新規の依頼は受け付けていません',         color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
] as const

type Availability = 'open' | 'one_slot' | 'full'

interface Props {
  current: Availability
  isOwner: boolean
  lastSeen: string
}

export default function AvailabilityEditor({ current, isOwner, lastSeen }: Props) {
  const [value, setValue] = useState<Availability>(current)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]

  const handleSave = async (next: Availability) => {
    if (next === value) { setEditing(false); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '更新に失敗しました')
      setValue(next)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => handleSave(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: opt.value === value ? `2px solid ${opt.color}` : '1px solid rgba(255,255,255,0.1)',
                  background: opt.value === value ? opt.bg : 'rgba(255,255,255,0.03)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <span style={{ color: opt.color, fontWeight: '700', fontSize: '14px' }}>● {opt.label}</span>
                <span style={{ color: '#7c7b99', fontSize: '12px' }}>{opt.desc}</span>
                {opt.value === value && <span style={{ color: opt.color, marginLeft: 'auto' }}>✓</span>}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setEditing(false); setError(null) }}
              style={{ background: 'none', border: 'none', color: '#7c7b99', fontSize: '13px', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}
            >
              キャンセル
            </button>
            {error && <p style={{ color: '#ff6b9d', fontSize: '12px', margin: 0 }}>{error}</p>}
          </div>
        ) : (
          <>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', borderRadius: '20px', fontSize: '15px', fontWeight: '700',
              color: selected.color, background: selected.bg, border: `1px solid ${selected.color}40`,
            }}>
              ● {selected.label}
            </span>
            <span style={{ color: '#7c7b99', fontSize: '13px' }}>{selected.desc}</span>
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{
                  padding: '4px 12px', borderRadius: '20px',
                  border: '1px solid rgba(199,125,255,0.3)',
                  background: 'rgba(199,125,255,0.08)',
                  color: '#c77dff', fontSize: '12px', cursor: 'pointer',
                }}
              >
                変更
              </button>
            )}
          </>
        )}
      </div>
      <span style={{ color: '#7c7b99', fontSize: '12px', flexShrink: 0 }}>
        最終ログイン: {lastSeen}
      </span>
    </div>
  )
}
