'use client'

import { useState } from 'react'
import { Send, CheckCircle2 } from 'lucide-react'
import { VALIDATION } from '@/lib/constants/validation'
import PitchDraftAssistant from './PitchDraftAssistant'

interface Props {
  clientId:         string
  clientName:       string
  viewerDisplayName: string
  onClose:          () => void
  onSent:           () => void
}

export default function PitchModal({ clientId, clientName, viewerDisplayName, onClose, onSent }: Props) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [sent,    setSent]    = useState(false)
  const [showAi,  setShowAi]  = useState(false)

  const handleSend = async () => {
    if (!message.trim()) { setError('メッセージを入力してください'); return }
    setSending(true)
    setError(null)

    const res = await fetch('/api/pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, message: message.trim() }),
    })

    const data = await res.json()
    setSending(false)

    if (!res.ok) { setError(data.error ?? '送信に失敗しました'); return }

    setSent(true)
    onSent()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: '680px', maxHeight: '92vh', background: 'var(--c-surface-r)', border: '1px solid var(--c-border-2)', borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ヘッダー */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontWeight: '800', fontSize: '18px' }}>営業メッセージを送る</p>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--c-text-3)' }}>
              送信先：{clientName} さん
            </p>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--c-text-4)', fontSize: '22px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircle2 size={48} color="#4ade80" style={{ margin: '0 auto 16px' }} aria-hidden />
              <p style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px' }}>送信しました</p>
              <p style={{ fontSize: '14px', color: 'var(--c-text-3)', margin: '0 0 24px' }}>
                {clientName} さんへ営業メッセージを送りました。返信があれば通知でお知らせします。
              </p>
              <button type="button" onClick={onClose}
                style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: 'rgb(var(--brand-rgb))', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                閉じる
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* メッセージ入力 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--c-text-2)' }}>
                    メッセージ <span style={{ color: '#dc2626', fontSize: '11px' }}>必須</span>
                  </label>
                  <span style={{ fontSize: '12px', color: 'var(--c-text-4)' }}>
                    {message.length} / {VALIDATION.PITCH_MESSAGE_MAX}
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`${clientName} さんへのメッセージを入力してください。あなたのスキルや得意分野、なぜ連絡したかを伝えましょう。`}
                  maxLength={VALIDATION.PITCH_MESSAGE_MAX}
                  rows={8}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px', resize: 'vertical',
                    border: '1.5px solid var(--c-input-border)', background: 'var(--c-input-bg)',
                    color: 'var(--c-text)', fontSize: '14px', outline: 'none', lineHeight: '1.7',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* AI アシスタントトグル */}
              <button type="button" onClick={() => setShowAi((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '11px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  border: '1px solid var(--c-border-2)', background: 'var(--c-accent-a08)', color: 'rgb(var(--brand-rgb))',
                }}>
                ✨ AIで营業メッセージを作成・添削する {showAi ? '▲' : '▼'}
              </button>

              {showAi && (
                <div style={{ height: '440px' }}>
                  <PitchDraftAssistant
                    displayName={viewerDisplayName}
                    clientName={clientName}
                    existingDraft={message}
                    onApplyDraft={(draft) => setMessage(draft)}
                    sidebar
                  />
                </div>
              )}

              {error && (
                <p style={{ fontSize: '13px', color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '10px', padding: '12px 14px', margin: 0 }}>
                  {error}
                </p>
              )}

              {/* 送信ボタン */}
              <button type="button" onClick={handleSend} disabled={sending || !message.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px', borderRadius: '14px', border: 'none', cursor: sending || !message.trim() ? 'not-allowed' : 'pointer',
                  background: sending || !message.trim() ? 'var(--c-accent-a20)' : 'rgb(var(--brand-rgb))',
                  color: '#fff', fontSize: '15px', fontWeight: '800', opacity: !message.trim() ? 0.6 : 1,
                }}>
                <Send size={16} aria-hidden />
                {sending ? '送信中...' : '送信する'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
