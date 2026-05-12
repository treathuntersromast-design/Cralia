'use client'

import { useState } from 'react'
import { PAYMENT_STATUS, PAYMENT_STATUS_MAP } from '@/lib/constants/statuses'

type PaymentInfo = {
  id: string
  status: string
  stripe_checkout_session_id?: string | null
} | null

interface Props {
  projectId: string
  payment: PaymentInfo
}

const BADGE_STATUSES = [
  PAYMENT_STATUS.HELD,
  PAYMENT_STATUS.PAYOUT_PENDING,
  PAYMENT_STATUS.PAYOUT_PAID,
  PAYMENT_STATUS.REFUNDED,
  PAYMENT_STATUS.PARTIALLY_REFUNDED,
  PAYMENT_STATUS.REFUND_PENDING,
  PAYMENT_STATUS.PAYMENT_MISMATCH,
  PAYMENT_STATUS.DISPUTED,
]

export default function PaymentButton({ projectId, payment }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const status = payment?.status ?? null

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました')
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // バッジ表示ステータス
  if (status && BADGE_STATUSES.includes(status as typeof BADGE_STATUSES[number])) {
    const info = PAYMENT_STATUS_MAP[status]
    return (
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
          style={{ color: info?.color, background: info?.bg, borderColor: info?.border }}
        >
          {info?.label ?? status}
        </span>
        {status === PAYMENT_STATUS.PAYMENT_MISMATCH && (
          <span className="text-xs text-[var(--c-text-4)]">管理者に連絡中</span>
        )}
      </div>
    )
  }

  // 決済ボタン（null / expired / failed / pending）
  const buttonLabel = status === PAYMENT_STATUS.PENDING ? '決済を続ける' : 'プラットフォーム預かりで決済する'

  return (
    <div className="space-y-1">
      <button
        onClick={handlePay}
        disabled={loading}
        className={[
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
          'text-white transition-opacity',
          'bg-[var(--c-accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
        ].join(' ')}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            処理中...
          </>
        ) : buttonLabel}
      </button>

      {status === PAYMENT_STATUS.PENDING && (
        <p className="text-xs text-[var(--c-text-4)]">
          以前の決済セッションが残っています。「決済を続ける」で Stripe Checkout に戻れます。
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <p className="text-xs text-[var(--c-text-5)]">
        検収後にクリエイターへ支払いが確定されます（プラットフォーム預かり決済）
      </p>
    </div>
  )
}
