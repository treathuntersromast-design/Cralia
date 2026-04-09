'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeadlineCheck {
  feasible:     boolean
  warningLevel: 'danger' | 'caution' | null
  message:      string | null
}

interface Action {
  label: string
  nextStatus: string
  style: 'primary' | 'secondary' | 'danger'
}

function getActions(status: string, isClient: boolean, isCreator: boolean): Action[] {
  const actions: Action[] = []

  if (status === 'pending') {
    if (isCreator) {
      actions.push({ label: '✅ 依頼を承認する',   nextStatus: 'accepted',  style: 'primary' })
      actions.push({ label: '❌ 依頼を辞退する',   nextStatus: 'cancelled', style: 'danger'  })
    }
    if (isClient) {
      actions.push({ label: '🚫 依頼を取り消す',   nextStatus: 'cancelled', style: 'danger'  })
    }
  }

  if (status === 'accepted') {
    if (isCreator) {
      actions.push({ label: '▶️ 制作を開始する',   nextStatus: 'in_progress', style: 'primary' })
    }
    actions.push({ label: '🚫 キャンセルする',     nextStatus: 'cancelled',   style: 'danger'  })
  }

  if (status === 'in_progress') {
    if (isCreator) {
      actions.push({ label: '📦 納品する',         nextStatus: 'delivered',   style: 'primary' })
    }
    actions.push({ label: '🚫 キャンセルする',     nextStatus: 'cancelled',   style: 'danger'  })
  }

  if (status === 'delivered') {
    if (isClient) {
      actions.push({ label: '🎉 完了にする',       nextStatus: 'completed',   style: 'primary' })
      actions.push({ label: '⚠️ 異議を申し立てる', nextStatus: 'disputed',    style: 'danger'  })
    }
    if (isCreator) {
      actions.push({ label: '🔄 修正対応（進行中に戻す）', nextStatus: 'in_progress', style: 'secondary' })
    }
  }

  return actions
}

const CONFIRM_MESSAGES: Record<string, string> = {
  cancelled:   '本当にキャンセルしますか？この操作は取り消せません。',
  disputed:    '異議を申し立てますか？運営が内容を確認します。',
  completed:   '依頼を完了にしますか？',
  accepted:    '依頼を承認しますか？',
  delivered:   '納品としてマークしますか？',
  in_progress: '制作を開始しますか？',
}

export default function OrderActions({
  orderId, status, isClient, isCreator, creatorId, deadline,
}: {
  orderId:   string
  status:    string
  isClient:  boolean
  isCreator: boolean
  creatorId: string
  deadline:  string | null
}) {
  const router = useRouter()
  const [loading,         setLoading]         = useState<string | null>(null)
  const [error,           setError]           = useState<string | null>(null)
  const [deadlineWarning, setDeadlineWarning] = useState<DeadlineCheck | null>(null)
  const [pendingStatus,   setPendingStatus]   = useState<string | null>(null)

  const actions = getActions(status, isClient, isCreator)
  if (actions.length === 0) return null

  const handleAction = async (nextStatus: string) => {
    // クリエイターが承認する前に納期チェック
    if (nextStatus === 'accepted' && isCreator && deadline) {
      const params = new URLSearchParams({ creatorId, deadline })
      const res  = await fetch(`/api/orders/check-deadline?${params}`)
      const data: DeadlineCheck = await res.json()

      if (data.warningLevel) {
        setDeadlineWarning(data)
        setPendingStatus(nextStatus)
        return // アラートを表示して一旦止める
      }
    }

    await executeAction(nextStatus)
  }

  const executeAction = async (nextStatus: string) => {
    const msg = CONFIRM_MESSAGES[nextStatus]
    if (msg && !window.confirm(msg)) return

    setLoading(nextStatus)
    setError(null)

    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '操作に失敗しました')
      setLoading(null)
      return
    }

    router.refresh()
    setLoading(null)
  }

  const btnStyles: Record<string, React.CSSProperties> = {
    primary: {
      flex: 1, padding: '14px 20px', borderRadius: '12px', border: 'none',
      background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
      color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
    },
    secondary: {
      flex: 1, padding: '14px 20px', borderRadius: '12px',
      border: '1px solid rgba(199,125,255,0.3)', background: 'transparent',
      color: '#c77dff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    },
    danger: {
      flex: 1, padding: '14px 20px', borderRadius: '12px',
      border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)',
      color: '#f87171', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    },
  }

  return (
    <div style={{ background: 'rgba(22,22,31,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' }}>
      <h2 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 16px' }}>アクション</h2>

      {/* 納期タイトネスアラート（クリエイター向け） */}
      {deadlineWarning?.warningLevel && (
        <div style={{
          display: 'flex', gap: '12px', alignItems: 'flex-start',
          padding: '14px 16px', borderRadius: '12px', marginBottom: '16px',
          background: deadlineWarning.warningLevel === 'danger'
            ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.08)',
          border: `1px solid ${deadlineWarning.warningLevel === 'danger'
            ? 'rgba(248,113,113,0.35)' : 'rgba(251,191,36,0.35)'}`,
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>
            {deadlineWarning.warningLevel === 'danger' ? '⚠️' : '💡'}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{
              margin: '0 0 4px', fontWeight: '700', fontSize: '13px',
              color: deadlineWarning.warningLevel === 'danger' ? '#f87171' : '#fbbf24',
            }}>
              {deadlineWarning.warningLevel === 'danger'
                ? '納期がタイトです — 承認前にご確認ください'
                : '納期の余裕がやや少ないです — 承認前にご確認ください'}
            </p>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#a9a8c0', lineHeight: '1.6' }}>
              {deadlineWarning.message}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setDeadlineWarning(null); setPendingStatus(null) }}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                  color: '#a9a8c0', cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => { setDeadlineWarning(null); if (pendingStatus) executeAction(pendingStatus) }}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                  border: 'none',
                  background: deadlineWarning.warningLevel === 'danger'
                    ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)',
                  color: deadlineWarning.warningLevel === 'danger' ? '#f87171' : '#fbbf24',
                  cursor: 'pointer',
                }}
              >
                それでも承認する
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: '#f87171', fontSize: '13px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
          {error}
        </p>
      )}

      {/* アラート表示中は通常ボタンを隠す */}
      {!deadlineWarning && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {actions.map((action) => (
            <button
              key={action.nextStatus}
              type="button"
              onClick={() => handleAction(action.nextStatus)}
              disabled={loading !== null}
              style={{ ...btnStyles[action.style], opacity: loading !== null ? 0.6 : 1 }}
            >
              {loading === action.nextStatus ? '処理中...' : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
