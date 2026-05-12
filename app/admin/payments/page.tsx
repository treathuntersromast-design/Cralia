'use client'

import { useEffect, useState, useCallback } from 'react'
import { PAYMENT_STATUS, PAYMENT_STATUS_MAP } from '@/lib/constants/statuses'

type Payment = {
  id: string
  project_id: string
  amount: number
  fee: number
  status: string
  refunded_amount: number
  currency: string
  paid_at: string | null
  admin_note: string | null
  created_at: string
  projects?: {
    title?: string
    client?: { display_name?: string }
    creator?: { display_name?: string }
  }
}

type ModalState =
  | { type: 'confirm-payout'; paymentId: string }
  | { type: 'cancel-payout'; paymentId: string }
  | { type: 'register-payout'; paymentId: string; bankInfo: string }
  | { type: 'refund'; paymentId: string; amount: string; maxAmount: number }
  | { type: 'adjustment'; paymentId: string; amount: string; reason: string }
  | null

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [modal, setModal]       = useState<ModalState>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError]     = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/payments')
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'データ取得に失敗しました'); return }
      setPayments(data.payments ?? [])
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  async function callAction(url: string, body?: object) {
    setActionLoading(true)
    setActionError(null)
    try {
      const res  = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error ?? 'エラーが発生しました')
        return false
      }
      setModal(null)
      await fetchPayments()
      return true
    } catch {
      setActionError('ネットワークエラーが発生しました')
      return false
    } finally {
      setActionLoading(false)
    }
  }

  function payoutAmount(p: Payment) {
    return p.amount - (p.fee ?? 0) - (p.refunded_amount ?? 0)
  }

  function maxRefundable(p: Payment) {
    return p.amount - (p.refunded_amount ?? 0)
  }

  function statusBadge(status: string) {
    const info = PAYMENT_STATUS_MAP[status]
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
        style={{ color: info?.color, background: info?.bg, borderColor: info?.border }}
      >
        {info?.label ?? status}
      </span>
    )
  }

  if (loading) return <div className="p-8 text-center text-[var(--c-text-4)]">読み込み中...</div>
  if (error)   return <div className="p-8 text-center text-red-500">{error}</div>

  return (
    <div className="min-h-screen bg-[var(--c-bg)] p-6">
      <h1 className="text-xl font-bold text-[var(--c-text)] mb-6">決済管理</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--c-border)] text-[var(--c-text-3)]">
              <th className="text-left py-3 px-3 font-medium">依頼</th>
              <th className="text-left py-3 px-3 font-medium">依頼者</th>
              <th className="text-left py-3 px-3 font-medium">クリエイター</th>
              <th className="text-right py-3 px-3 font-medium">金額</th>
              <th className="text-right py-3 px-3 font-medium">手数料</th>
              <th className="text-right py-3 px-3 font-medium">返金額</th>
              <th className="text-right py-3 px-3 font-medium">支払額</th>
              <th className="text-left py-3 px-3 font-medium">状態</th>
              <th className="text-left py-3 px-3 font-medium">入金日</th>
              <th className="text-left py-3 px-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} className="border-b border-[var(--c-border)] hover:bg-[var(--c-surface-2)]">
                <td className="py-3 px-3 text-[var(--c-text-2)] max-w-[160px] truncate">
                  {p.projects?.title ?? '-'}
                </td>
                <td className="py-3 px-3 text-[var(--c-text-3)]">{p.projects?.client?.display_name ?? '-'}</td>
                <td className="py-3 px-3 text-[var(--c-text-3)]">{p.projects?.creator?.display_name ?? '-'}</td>
                <td className="py-3 px-3 text-right text-[var(--c-text)]">¥{p.amount.toLocaleString()}</td>
                <td className="py-3 px-3 text-right text-[var(--c-text-3)]">¥{(p.fee ?? 0).toLocaleString()}</td>
                <td className="py-3 px-3 text-right text-[var(--c-text-3)]">¥{(p.refunded_amount ?? 0).toLocaleString()}</td>
                <td className="py-3 px-3 text-right font-medium text-[var(--c-text)]">
                  ¥{Math.max(0, payoutAmount(p)).toLocaleString()}
                </td>
                <td className="py-3 px-3">{statusBadge(p.status)}</td>
                <td className="py-3 px-3 text-[var(--c-text-4)] text-xs whitespace-nowrap">
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString('ja-JP') : '-'}
                </td>
                <td className="py-3 px-3">
                  <div className="flex gap-1 flex-wrap">
                    {/* 支払確定 */}
                    {(p.status === PAYMENT_STATUS.HELD || p.status === PAYMENT_STATUS.PARTIALLY_REFUNDED) && (
                      <ActionButton onClick={() => { setActionError(null); setModal({ type: 'confirm-payout', paymentId: p.id }) }}>
                        支払確定
                      </ActionButton>
                    )}
                    {/* 支払確定取消 */}
                    {p.status === PAYMENT_STATUS.PAYOUT_PENDING && (
                      <ActionButton onClick={() => { setActionError(null); setModal({ type: 'cancel-payout', paymentId: p.id }) }} variant="ghost">
                        確定取消
                      </ActionButton>
                    )}
                    {/* 振込済み登録 */}
                    {p.status === PAYMENT_STATUS.PAYOUT_PENDING && (
                      <ActionButton onClick={() => { setActionError(null); setModal({ type: 'register-payout', paymentId: p.id, bankInfo: '' }) }}>
                        振込済み登録
                      </ActionButton>
                    )}
                    {/* 返金 */}
                    {(p.status === PAYMENT_STATUS.HELD || p.status === PAYMENT_STATUS.PARTIALLY_REFUNDED) && (
                      <ActionButton onClick={() => { setActionError(null); setModal({ type: 'refund', paymentId: p.id, amount: String(maxRefundable(p)), maxAmount: maxRefundable(p) }) }} variant="danger">
                        返金
                      </ActionButton>
                    )}
                    {/* 返金処理中 */}
                    {p.status === PAYMENT_STATUS.REFUND_PENDING && (
                      <span className="text-xs text-[var(--c-text-4)] px-2 py-1">返金処理中</span>
                    )}
                    {/* 手動調整（常時） */}
                    <ActionButton onClick={() => { setActionError(null); setModal({ type: 'adjustment', paymentId: p.id, amount: '0', reason: '' }) }} variant="ghost">
                      調整記録
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payments.length === 0 && (
        <p className="text-center text-[var(--c-text-4)] py-12">決済記録はありません</p>
      )}

      {/* モーダル */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--c-surface)] border border-[var(--c-border-2)] rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">

            {/* 支払確定 */}
            {modal.type === 'confirm-payout' && (
              <>
                <h2 className="text-lg font-bold text-[var(--c-text)]">支払確定</h2>
                <p className="text-sm text-[var(--c-text-3)]">
                  この決済をクリエイターへの支払確定としてよいですか？
                  確定後は「振込済み登録」を行い、クリエイターに連絡してください。
                </p>
                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                <ModalFooter
                  onCancel={() => setModal(null)}
                  onConfirm={() => callAction(`/api/admin/payments/${modal.paymentId}/confirm-payout`)}
                  loading={actionLoading}
                  confirmLabel="支払確定する"
                />
              </>
            )}

            {/* 支払確定取消 */}
            {modal.type === 'cancel-payout' && (
              <>
                <h2 className="text-lg font-bold text-[var(--c-text)]">支払確定取消</h2>
                <p className="text-sm text-[var(--c-text-3)]">
                  支払確定を取消し、「保留中」または「部分返金済み」に戻します。取消後に返金が可能になります。
                </p>
                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                <ModalFooter
                  onCancel={() => setModal(null)}
                  onConfirm={() => callAction(`/api/admin/payments/${modal.paymentId}/cancel-payout`)}
                  loading={actionLoading}
                  confirmLabel="取消する"
                />
              </>
            )}

            {/* 振込済み登録 */}
            {modal.type === 'register-payout' && (
              <>
                <h2 className="text-lg font-bold text-[var(--c-text)]">振込済み登録</h2>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--c-text-3)]">振込先メモ（任意・クリエイターには非公開）</label>
                  <textarea
                    value={modal.bankInfo}
                    onChange={e => setModal({ ...modal, bankInfo: e.target.value })}
                    rows={3}
                    placeholder="例：〇〇銀行 〇〇支店 普通 1234567"
                    className="w-full c-input rounded-lg p-3 text-sm resize-none"
                  />
                </div>
                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                <ModalFooter
                  onCancel={() => setModal(null)}
                  onConfirm={() => callAction(`/api/admin/payments/${modal.paymentId}/register-payout`, { bank_info: modal.bankInfo })}
                  loading={actionLoading}
                  confirmLabel="振込済みとして登録"
                />
              </>
            )}

            {/* 返金 */}
            {modal.type === 'refund' && (
              <>
                <h2 className="text-lg font-bold text-[var(--c-text)]">返金</h2>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--c-text-3)]">
                    返金額（最大 ¥{modal.maxAmount.toLocaleString()}）
                  </label>
                  <input
                    type="number"
                    value={modal.amount}
                    onChange={e => setModal({ ...modal, amount: e.target.value })}
                    min={1}
                    max={modal.maxAmount}
                    className="w-full c-input rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-[var(--c-text-4)]">省略すると全額返金（¥{modal.maxAmount.toLocaleString()}）になります</p>
                </div>
                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                <ModalFooter
                  onCancel={() => setModal(null)}
                  onConfirm={() => {
                    const amt = Number(modal.amount)
                    return callAction(`/api/admin/payments/${modal.paymentId}/refund`, {
                      amount: isNaN(amt) || amt <= 0 ? undefined : amt,
                    })
                  }}
                  loading={actionLoading}
                  confirmLabel="返金を実行"
                  confirmClass="bg-red-500 hover:bg-red-600"
                />
              </>
            )}

            {/* 調整記録 */}
            {modal.type === 'adjustment' && (
              <>
                <h2 className="text-lg font-bold text-[var(--c-text)]">手動調整記録</h2>
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠ この調整は支払額の計算に影響しません（記録のみ）
                </p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--c-text-3)]">調整額（正: 追加、負: 減算）</label>
                    <input
                      type="number"
                      value={modal.amount}
                      onChange={e => setModal({ ...modal, amount: e.target.value })}
                      className="w-full c-input rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--c-text-3)]">理由</label>
                    <textarea
                      value={modal.reason}
                      onChange={e => setModal({ ...modal, reason: e.target.value })}
                      rows={2}
                      maxLength={500}
                      className="w-full c-input rounded-lg p-3 text-sm resize-none"
                    />
                  </div>
                </div>
                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                <ModalFooter
                  onCancel={() => setModal(null)}
                  onConfirm={() => callAction(`/api/admin/payments/${modal.paymentId}/adjustment`, {
                    amount: Number(modal.amount),
                    reason: modal.reason,
                  })}
                  loading={actionLoading}
                  confirmLabel="記録する"
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionButton({ children, onClick, variant = 'primary' }: {
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'ghost' | 'danger'
}) {
  const cls = {
    primary: 'bg-[var(--c-accent)] text-white hover:opacity-90',
    ghost:   'border border-[var(--c-border-2)] text-[var(--c-text-3)] hover:bg-[var(--c-surface-2)]',
    danger:  'bg-red-500 text-white hover:bg-red-600',
  }[variant]

  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${cls}`}
    >
      {children}
    </button>
  )
}

function ModalFooter({ onCancel, onConfirm, loading, confirmLabel, confirmClass = 'bg-[var(--c-accent)] hover:opacity-90' }: {
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
  confirmLabel: string
  confirmClass?: string
}) {
  return (
    <div className="flex gap-3 justify-end pt-2">
      <button
        onClick={onCancel}
        disabled={loading}
        className="px-4 py-2 rounded-lg border border-[var(--c-border-2)] text-sm text-[var(--c-text-3)] hover:bg-[var(--c-surface-2)] disabled:opacity-50"
      >
        キャンセル
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-sm text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${confirmClass}`}
      >
        {loading ? '処理中...' : confirmLabel}
      </button>
    </div>
  )
}
