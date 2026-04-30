'use client'

import { useState } from 'react'
import { Wrench } from 'lucide-react'

type ReceiptRow = {
  id:         string
  type:       'receipt' | 'purchase_order'
  receipt_no: string
  amount:     number
  tax_amount: number
  memo:       string | null
  issued_at:  string
  issued_by:  string
}

const TYPE_LABEL: Record<string, string> = {
  receipt:        '領収書',
  purchase_order: '発注書',
}

export default function ReceiptClient({
  orderId, orderTitle, orderType, budget, status,
  isClient, isCreator, clientName, creatorName, createdAt,
  initialReceipts,
}: {
  orderId:          string
  orderTitle:       string
  orderType:        string
  budget:           number | null
  status:           string
  isClient:         boolean
  isCreator:        boolean
  clientName:       string
  creatorName:      string
  createdAt:        string
  initialReceipts:  ReceiptRow[]
}) {
  const [receipts, setReceipts] = useState<ReceiptRow[]>(initialReceipts)
  const [issuing,  setIssuing]  = useState<string | null>(null)
  const [memo,     setMemo]     = useState('')
  const [error,    setError]    = useState<string | null>(null)

  const isCompleted = status === 'completed'
  const isPaid      = orderType !== 'free'
  const amount      = isPaid && budget != null ? budget : 0
  const taxAmount   = Math.floor(amount * 0.1)

  const hasReceipt       = receipts.some((r) => r.type === 'receipt')
  const hasPurchaseOrder = receipts.some((r) => r.type === 'purchase_order')

  const issue = async (type: 'receipt' | 'purchase_order') => {
    setIssuing(type)
    setError(null)

    const res = await fetch(`/api/orders/${orderId}/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, memo: memo.trim() || null }),
    })
    const data = await res.json()
    setIssuing(null)

    if (!res.ok) {
      setError(data.error ?? '発行に失敗しました')
      return
    }
    if (data.receipt) {
      setReceipts((prev) => [data.receipt, ...prev])
    }
    setMemo('')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--c-border)', background: 'var(--c-input-bg)',
    color: 'var(--c-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  }

  if (!isCompleted) {
    return (
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--c-text-3)', fontSize: '14px', margin: 0 }}>
          領収書・発注書は依頼が完了してから発行できます
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 依頼概要 */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', padding: '20px 24px' }}>
        <h2 style={{ color: 'var(--c-text-3)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 14px' }}>依頼概要</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: '依頼者',     value: clientName },
            { label: 'クリエイター', value: creatorName },
            { label: '依頼タイトル', value: orderTitle },
            { label: '依頼日',     value: new Date(createdAt).toLocaleDateString('ja-JP') },
            { label: '金額（税抜）', value: isPaid ? `¥${amount.toLocaleString()}` : '無償' },
            { label: '消費税（10%）', value: isPaid ? `¥${taxAmount.toLocaleString()}` : '—' },
            { label: '合計',       value: isPaid ? `¥${(amount + taxAmount).toLocaleString()}` : '無償' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ color: 'var(--c-text-3)', fontSize: '11px', fontWeight: '700', margin: '0 0 2px', letterSpacing: '0.05em' }}>{label}</p>
              <p style={{ color: 'var(--c-text)', fontSize: '14px', fontWeight: '600', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 発行済み一覧 */}
      {receipts.length > 0 && (
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', padding: '20px 24px' }}>
          <h2 style={{ color: 'var(--c-text-3)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 14px' }}>発行済み書類</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {receipts.map((r) => (
              <div key={r.id} style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ color: '#4ade80', fontWeight: '700', fontSize: '14px', margin: '0 0 2px' }}>
                      {TYPE_LABEL[r.type] ?? r.type}
                    </p>
                    <p style={{ color: 'var(--c-text-3)', fontSize: '12px', margin: 0 }}>
                      No. {r.receipt_no} · {new Date(r.issued_at).toLocaleDateString('ja-JP')} 発行
                    </p>
                    {r.memo && <p style={{ color: 'var(--c-text-2)', fontSize: '12px', margin: '4px 0 0' }}>{r.memo}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: 'var(--c-text)', fontWeight: '700', fontSize: '15px', margin: 0 }}>
                      ¥{(r.amount + r.tax_amount).toLocaleString()}
                    </p>
                    <p style={{ color: 'var(--c-text-3)', fontSize: '11px', margin: '2px 0 0' }}>（税込）</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 発行フォーム */}
      {(isClient || isCreator) && (!hasReceipt || !hasPurchaseOrder) && (
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', padding: '20px 24px' }}>
          <h2 style={{ color: 'var(--c-text-3)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 16px' }}>新規発行</h2>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', color: 'var(--c-text-2)', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
              メモ（任意・500文字以内）
            </label>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="摘要・備考など"
              maxLength={500}
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {!hasReceipt && (
              <button
                type="button"
                onClick={() => issue('receipt')}
                disabled={issuing !== null}
                style={{
                  flex: 1, padding: '13px 20px', borderRadius: '10px', border: 'none',
                  background: issuing ? 'rgba(30,64,255,0.4)' : 'rgb(var(--brand-rgb))',
                  color: '#fff', fontSize: '14px', fontWeight: '700',
                  cursor: issuing ? 'not-allowed' : 'pointer', minWidth: '140px',
                }}
              >
                {issuing === 'receipt' ? '発行中...' : '領収書を発行'}
              </button>
            )}
            {!hasPurchaseOrder && (
              <button
                type="button"
                onClick={() => issue('purchase_order')}
                disabled={issuing !== null}
                style={{
                  flex: 1, padding: '13px 20px', borderRadius: '10px',
                  border: '1px solid var(--c-border-2)', background: 'var(--c-accent-a08)',
                  color: 'rgb(var(--brand-rgb))', fontSize: '14px', fontWeight: '600',
                  cursor: issuing ? 'not-allowed' : 'pointer', minWidth: '140px',
                }}
              >
                {issuing === 'purchase_order' ? '発行中...' : '発注書を発行'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 補償プレースホルダー */}
      <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '14px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ flexShrink: 0, color: '#fbbf24', marginTop: '2px' }}><Wrench size={18} aria-hidden /></span>
          <div>
            <p style={{ fontWeight: '700', fontSize: '13px', color: '#fbbf24', margin: '0 0 4px' }}>
              納期遅延補償（実装予定）
            </p>
            <p style={{ color: 'var(--c-text-3)', fontSize: '12px', margin: 0, lineHeight: '1.6' }}>
              納期を大きく過ぎても納品されなかった場合の補償申請機能は現在開発中です。
              トラブルが発生した場合はサポートまでお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
