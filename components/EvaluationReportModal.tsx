'use client'

import { useState } from 'react'
import { VALIDATION } from '@/lib/constants/validation'
import { CheckCircle2 } from 'lucide-react'

export default function EvaluationReportModal({
  reviewId,
  onClose,
}: {
  reviewId: string
  onClose: () => void
}) {
  const [reason,    setReason]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) { setError('報告理由を入力してください'); return }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/reviews/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, reason: reason.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '報告の送信に失敗しました')
      setLoading(false)
      return
    }
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--c-surface)', border: '1px solid var(--c-border-2)',
        borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '100%',
        color: 'var(--c-text)',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px' }}>
          評価の報告
        </h2>

        {submitted ? (
          <>
            <div style={{
              background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
              borderRadius: '12px', padding: '16px', marginBottom: '20px',
            }}>
              <p style={{ color: '#4ade80', fontWeight: '700', fontSize: '14px', margin: '0 0 6px' }}>
                <CheckCircle2 size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} aria-hidden /> 報告を受け付けました
              </p>
              <p style={{ color: 'var(--c-text-2)', fontSize: '13px', margin: 0, lineHeight: '1.7' }}>
                内容を確認のうえ、対応いたします。<br />
                <strong style={{ color: 'var(--c-text)' }}>報告への対応には 1〜2 週間程度かかる場合があります。</strong><br />
                ご了承ください。
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                background: 'var(--c-surface-3)', color: 'var(--c-text)',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              閉じる
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--c-text-2)', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.7' }}>
              不適切な評価・事実と異なる評価についてサイトオーナーに報告できます。<br />
              <strong style={{ color: '#fbbf24' }}>報告への対応には 1〜2 週間程度かかる場合があります。</strong>
            </p>

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', color: 'var(--c-text-3)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '8px' }}>
                報告理由 <span style={{ color: '#f87171' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="なぜこの評価が不適切だと思うか、具体的にご記入ください"
                maxLength={VALIDATION.REPORT_REASON_MAX}
                rows={5}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid var(--c-border)', background: 'var(--c-input-bg)',
                  color: 'var(--c-text)', fontSize: '14px', lineHeight: '1.6', resize: 'vertical',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <p style={{ color: 'var(--c-text-3)', fontSize: '12px', margin: '4px 0 16px', textAlign: 'right' }}>
                {reason.length}/{VALIDATION.REPORT_REASON_MAX}
              </p>

              {error && (
                <p style={{
                  color: '#f87171', fontSize: '13px',
                  background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
                }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '10px',
                    border: '1px solid var(--c-border-2)', background: 'transparent',
                    color: 'var(--c-text-2)', fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason.trim()}
                  style={{
                    flex: 2, padding: '11px', borderRadius: '10px', border: 'none',
                    background: loading || !reason.trim()
                      ? 'rgba(248,113,113,0.3)'
                      : 'rgb(var(--brand-rgb))',
                    color: '#fff', fontSize: '14px', fontWeight: '700',
                    cursor: loading || !reason.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? '送信中...' : '報告を送信する'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

