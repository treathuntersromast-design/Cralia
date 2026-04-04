'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  orderId, status, isClient, isCreator,
}: {
  orderId: string
  status: string
  isClient: boolean
  isCreator: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const actions = getActions(status, isClient, isCreator)
  if (actions.length === 0) return null

  const handleAction = async (nextStatus: string) => {
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

      {error && (
        <p style={{ color: '#f87171', fontSize: '13px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {actions.map((action) => (
          <button
            key={action.nextStatus}
            onClick={() => handleAction(action.nextStatus)}
            disabled={loading !== null}
            style={{ ...btnStyles[action.style], opacity: loading !== null ? 0.6 : 1 }}
          >
            {loading === action.nextStatus ? '処理中...' : action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
