'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Mail, ExternalLink } from 'lucide-react'
import { PAYMENT_STATUS, PAYMENT_STATUS_MAP } from '@/lib/constants/statuses'

type Adjustment = {
  id: string
  amount: number
  reason: string
  created_at: string
  admin_email: string
}

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
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  client_email: string | null
  creator_email: string | null
  adjustments: Adjustment[]
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
  | { type: 'dispute'; paymentId: string; note: string }
  | null

export default function AdminPaymentsPage() {
  const [payments, setPayments]           = useState<Payment[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [modal, setModal]                 = useState<ModalState>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError]     = useState<string | null>(null)
  const [expandedId, setExpandedId]       = useState<string | null>(null)
  const [editingNote, setEditingNote]     = useState<{ id: string; value: string } | null>(null)

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
      if (!res.ok) { setActionError(data.error ?? 'エラーが発生しました'); return false }
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

  async function saveNote(paymentId: string, note: string) {
    await fetch(`/api/admin/payments/${paymentId}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_note: note }),
    })
    setEditingNote(null)
    await fetchPayments()
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
  if (error) return (
    <div className="p-8 space-y-3">
      <div className="text-red-500">{error}</div>
      <button type="button" onClick={fetchPayments} className="text-sm px-3 py-1 border border-[var(--c-border-2)] rounded-lg text-[var(--c-text-3)] hover:bg-[var(--c-surface-2)]">
        再試行
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--c-bg)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[var(--c-text)]">決済管理</h1>
        <button type="button" onClick={fetchPayments} className="text-sm px-3 py-1.5 border border-[var(--c-border-2)] rounded-lg text-[var(--c-text-3)] hover:bg-[var(--c-surface-2)] transition-colors">
          更新
        </button>
      </div>

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
              <th className="py-3 px-3" aria-label="詳細"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <>
                <tr key={p.id} className="border-b border-[var(--c-border)] hover:bg-[var(--c-surface-2)]">
                  <td className="py-3 px-3 max-w-[160px]">
                    <div className="truncate text-[var(--c-text-2)]">{p.projects?.title ?? '-'}</div>
                    <Link href={`/projects/${p.project_id}`} className="text-[10px] text-brand hover:underline flex items-center gap-0.5" target="_blank">
                      <ExternalLink size={10} />詳細
                    </Link>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-[var(--c-text-3)] text-xs">{p.projects?.client?.display_name ?? '-'}</div>
                    {p.client_email && (
                      <a href={`mailto:${p.client_email}`} className="text-[10px] text-brand hover:underline flex items-center gap-0.5">
                        <Mail size={10} />{p.client_email}
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-[var(--c-text-3)] text-xs">{p.projects?.creator?.display_name ?? '-'}</div>
                    {p.creator_email && (
                      <a href={`mailto:${p.creator_email}`} className="text-[10px] text-brand hover:underline flex items-center gap-0.5">
                        <Mail size={10} />{p.creator_email}
                      </a>
                    )}
                  </td>
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
                      {(p.status === PAYMENT_STATUS.HELD || p.status === PAYMENT_STATUS.PARTIALLY_REFUNDED) && (
                        <ActionButton onClick={() => { setActionError(null); setModal({ type: 'confirm-payout', paymentId: p.id }) }}>
                          支払確定
                        </ActionButton>
                      )}
                      {p.status === PAYMENT_STATUS.PAYOUT_PENDING && (
                        <ActionButton onClick={() => { setActionError(null); setModal({ type: 'cancel-payout', paymentId: p.id }) }} variant="ghost">
                          確定取消
                        </ActionButton>
                      )}
                      {p.status === PAYMENT_STATUS.PAYOUT_PENDING && (
                        <ActionButton onClick={() => { setActionError(null); setModal({ type: 'register-payout', paymentId: p.id, bankInfo: '' }) }}>
                          振込済み登録
                        </ActionButton>
                      )}
                      {(p.status === PAYMENT_STATUS.HELD || p.status === PAYMENT_STATUS.PARTIALLY_REFUNDED) && (
                        <ActionButton onClick={() => { setActionError(null); setModal({ type: 'refund', paymentId: p.id, amount: String(maxRefundable(p)), maxAmount: maxRefundable(p) }) }} variant="danger">
                          返金
                        </ActionButton>
                      )}
                      {p.status === PAYMENT_STATUS.REFUND_PENDING && (
                        <span className="text-xs text-[var(--c-text-4)] px-2 py-1">返金処理中</span>
                      )}
                      {p.status !== PAYMENT_STATUS.DISPUTED && p.status !== PAYMENT_STATUS.PAYOUT_PAID && (
                        <ActionButton onClick={() => { setActionError(null); setModal({ type: 'dispute', paymentId: p.id, note: p.admin_note ?? '' }) }} variant="warn">
                          要確認
                        </ActionButton>
                      )}
                      <ActionButton onClick={() => { setActionError(null); setModal({ type: 'adjustment', paymentId: p.id, amount: '0', reason: '' }) }} variant="ghost">
                        調整記録
                      </ActionButton>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="text-[var(--c-text-4)] hover:text-[var(--c-text-3)] transition-colors"
                      aria-label="詳細を展開"
                    >
                      {expandedId === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </td>
                </tr>

                {/* 展開パネル */}
                {expandedId === p.id && (
                  <tr key={`${p.id}-detail`} className="bg-[var(--c-surface-2)]">
                    <td colSpan={11} className="px-6 py-4 space-y-4">

                      {/* 管理者メモ */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-[var(--c-text-3)]">管理者メモ（社内用・ユーザーには非公開）</div>
                        {editingNote?.id === p.id ? (
                          <div className="flex gap-2">
                            <textarea
                              value={editingNote.value}
                              onChange={e => setEditingNote({ id: p.id, value: e.target.value })}
                              rows={3}
                              title="管理者メモ"
                              placeholder="社内メモを入力…（ユーザーには非公開）"
                              className="flex-1 c-input rounded-lg p-2 text-sm resize-none"
                            />
                            <div className="flex flex-col gap-1">
                              <button type="button" onClick={() => saveNote(p.id, editingNote.value)} className="px-3 py-1 rounded-lg bg-[var(--c-accent)] text-white text-xs hover:opacity-90">保存</button>
                              <button type="button" onClick={() => setEditingNote(null)} className="px-3 py-1 rounded-lg border border-[var(--c-border-2)] text-xs text-[var(--c-text-3)] hover:bg-[var(--c-surface-3)]">取消</button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingNote({ id: p.id, value: p.admin_note ?? '' })}
                            className="min-h-[40px] text-sm text-[var(--c-text-2)] bg-[var(--c-surface)] border border-[var(--c-border-2)] rounded-lg px-3 py-2 cursor-pointer hover:border-brand transition-colors whitespace-pre-wrap"
                          >
                            {p.admin_note || <span className="text-[var(--c-text-4)]">クリックして編集…</span>}
                          </div>
                        )}
                      </div>

                      {/* 調整履歴 */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-[var(--c-text-3)]">
                          調整履歴（記録のみ・支払額には非反映）{p.adjustments.length > 0 && ` — ${p.adjustments.length}件`}
                        </div>
                        {p.adjustments.length === 0 ? (
                          <div className="text-xs text-[var(--c-text-4)]">調整履歴なし</div>
                        ) : (
                          <div className="space-y-1">
                            {p.adjustments.map(a => (
                              <div key={a.id} className="flex items-center gap-3 text-xs text-[var(--c-text-3)] bg-[var(--c-surface)] rounded-lg px-3 py-2">
                                <span className={`font-medium ${a.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {a.amount >= 0 ? '+' : ''}{a.amount.toLocaleString()}円
                                </span>
                                <span className="flex-1">{a.reason}</span>
                                <span className="text-[var(--c-text-4)]">{a.admin_email}</span>
                                <span className="text-[var(--c-text-4)]">{new Date(a.created_at).toLocaleDateString('ja-JP')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Stripe情報 */}
                      <div className="text-xs text-[var(--c-text-4)] space-y-0.5">
                        <div>Payment Intent: {p.stripe_payment_intent_id ?? '未決済'}</div>
                        <div>Checkout Session: {p.stripe_checkout_session_id ?? '-'}</div>
                        <div>決済ID: {p.id}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
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

            {modal.type === 'confirm-payout' && (
              <>
                <h2 className="text-lg font-bold text-[var(--c-text)]">支払確定</h2>
                <p className="text-sm text-[var(--c-text-3)]">この決済をクリエイターへの支払確定としてよいですか？確定後は「振込済み登録」を行い、クリエイターに連絡してください。</p>
                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                <ModalFooter onCancel={() => setModal(null)} onConfirm={() => callAction(`/api/admin/payments/${modal.paymentId}/confirm-payout`)} loading={actionLoading} confirmLabel="支払確定する" />
              </>
            )}

            {modal.type === 'cancel-payout' && (
              <>
                <h2 className="text-lg font-bold text-[var(--c-text)]">支払確定取消</h2>
                <p className="text-sm text-[var(--c-text-3)]">支払確定を取消し、「保留中」または「部分返金済み」に戻します。取消後に返金が可能になります。</p>
                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                <ModalFooter onCancel={() => setModal(null)} onConfirm={() => callAction(`/api/admin/payments/${modal.paymentId}/cancel-payout`)} loading={actionLoading} confirmLabel="取消する" />
              </>
            )}

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
                <ModalFooter onCancel={() => setModal(null)} onConfirm={() => callAction(`/api/admin/payments/${modal.paymentId}/register-payout`, { bank_info: modal.bankInfo })} loading={actionLoading} confirmLabel="振込済みとして登録" />
              </>
            )}

            {modal.type === 'refund' && (
              <>
                <h2 className="text-lg font-bold text-[var(--c-text)]">返金</h2>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--c-text-3)]">返金額（最大 ¥{modal.maxAmount.toLocaleString()}）</label>
                  <input
                    type="number"
                    value={modal.amount}
                    onChange={e => setModal({ ...modal, amount: e.target.value })}
                    min={1}
                    max={modal.maxAmount}
                    title="返金額"
                    placeholder="返金額を入力"
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

            {modal.type === 'dispute' && (
              <>
                <h2 className="text-lg font-bold text-[var(--c-text)]">要確認（紛争・問い合わせ）</h2>
                <p className="text-sm text-[var(--c-text-3)]">ステータスを「異議申し立て中」に変更します。返金・支払確定の操作は一時保留となります。</p>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--c-text-3)]">管理者メモ（任意）</label>
                  <textarea
                    value={modal.note}
                    onChange={e => setModal({ ...modal, note: e.target.value })}
                    rows={3}
                    placeholder="例：依頼者から「納品物が仕様と異なる」との申し立て。調査中。"
                    className="w-full c-input rounded-lg p-3 text-sm resize-none"
                  />
                </div>
                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                <ModalFooter
                  onCancel={() => setModal(null)}
                  onConfirm={() => callAction(`/api/admin/payments/${modal.paymentId}/dispute`, { admin_note: modal.note })}
                  loading={actionLoading}
                  confirmLabel="要確認にする"
                  confirmClass="bg-amber-500 hover:bg-amber-600"
                />
              </>
            )}

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
                      title="調整額"
                      placeholder="例: 1000 または -500"
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
  variant?: 'primary' | 'ghost' | 'danger' | 'warn'
}) {
  const cls = {
    primary: 'bg-[var(--c-accent)] text-white hover:opacity-90',
    ghost:   'border border-[var(--c-border-2)] text-[var(--c-text-3)] hover:bg-[var(--c-surface-2)]',
    danger:  'bg-red-500 text-white hover:bg-red-600',
    warn:    'bg-amber-500 text-white hover:bg-amber-600',
  }[variant]

  return (
    <button
      type="button"
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
      <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 rounded-lg border border-[var(--c-border-2)] text-sm text-[var(--c-text-3)] hover:bg-[var(--c-surface-2)] disabled:opacity-50">
        キャンセル
      </button>
      <button type="button" onClick={onConfirm} disabled={loading} className={`px-4 py-2 rounded-lg text-sm text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${confirmClass}`}>
        {loading ? '処理中...' : confirmLabel}
      </button>
    </div>
  )
}
