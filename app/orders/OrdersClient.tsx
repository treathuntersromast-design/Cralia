'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ORDER_STATUS_MAP } from '@/lib/constants/statuses'

type Order = {
  id: string
  title: string
  status: string
  order_type?: string
  budget: number | null
  deadline: string | null
  created_at: string
}

type SortKey = 'created_at' | 'deadline' | 'status'

const STATUS_FILTER_OPTIONS = [
  { value: '',           label: 'すべて' },
  { value: 'pending',    label: '提案中' },
  { value: 'accepted',   label: '承認済み' },
  { value: 'in_progress', label: '進行中' },
  { value: 'delivered',  label: '納品済み' },
  { value: 'completed',  label: '完了' },
  { value: 'cancelled',  label: 'キャンセル' },
  { value: 'disputed',   label: '異議申立' },
]

function filterAndSort(orders: Order[], status: string, sort: SortKey, asc: boolean): Order[] {
  let list = status ? orders.filter((o) => o.status === status) : [...orders]
  list.sort((a, b) => {
    let va: string | number = a[sort] ?? ''
    let vb: string | number = b[sort] ?? ''
    if (sort === 'status') {
      const order = ['pending','accepted','in_progress','delivered','completed','cancelled','disputed']
      va = order.indexOf(a.status)
      vb = order.indexOf(b.status)
    }
    if (va < vb) return asc ? -1 : 1
    if (va > vb) return asc ? 1 : -1
    return 0
  })
  return list
}

export default function OrdersClient({
  received, sent, userId,
}: {
  received: Order[]
  sent: Order[]
  userId: string
}) {
  const [tab,        setTab]        = useState<'received' | 'sent'>('received')
  const [statusFilter, setStatus]   = useState('')
  const [sortKey,    setSortKey]    = useState<SortKey>('created_at')
  const [sortAsc,    setSortAsc]    = useState(false)

  const orders = tab === 'received' ? received : sent

  const filtered = useMemo(
    () => filterAndSort(orders, statusFilter, sortKey, sortAsc),
    [orders, statusFilter, sortKey, sortAsc]
  )

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  const sortLabel = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px',
        fontWeight: sortKey === key ? '700' : '400',
        color: sortKey === key ? '#c77dff' : '#7c7b99',
        display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px',
        borderRadius: '6px',
        outline: 'none',
      }}
    >
      {label}
      {sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', color: '#f0eff8' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
        </Link>
        <Link href="/dashboard" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← ダッシュボードへ</Link>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px' }}>依頼管理</h1>
          <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>受け取った依頼・送った依頼を管理します</p>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0' }}>
          {([['received', '受け取った依頼', received.length], ['sent', '送った依頼', sent.length]] as const).map(([t, label, count]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700',
                background: 'none',
                color: tab === t ? '#c77dff' : '#7c7b99',
                borderBottom: tab === t ? '2px solid #c77dff' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {label}
              <span style={{
                marginLeft: '8px', fontSize: '12px', padding: '2px 7px', borderRadius: '10px',
                background: tab === t ? 'rgba(199,125,255,0.15)' : 'rgba(255,255,255,0.06)',
                color: tab === t ? '#c77dff' : '#5c5b78',
              }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* フィルター + ソート */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          {/* ステータスフィルター */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const st = opt.value ? ORDER_STATUS_MAP[opt.value] : null
              const active = statusFilter === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                    border: active ? `1px solid ${st?.border ?? 'rgba(199,125,255,0.5)'}` : '1px solid rgba(255,255,255,0.1)',
                    background: active ? (st?.bg ?? 'rgba(199,125,255,0.12)') : 'transparent',
                    color: active ? (st?.color ?? '#c77dff') : '#7c7b99',
                    fontWeight: active ? '700' : '400',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* ソートボタン */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: '12px' }}>
            <span style={{ fontSize: '12px', color: '#5c5b78', marginRight: '4px' }}>並び替え:</span>
            {sortLabel('created_at', '作成日')}
            {sortLabel('deadline',   '納期')}
            {sortLabel('status',     'ステータス')}
          </div>
        </div>

        {/* 一覧 */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(22,22,31,0.8)', borderRadius: '20px', border: '1px dashed rgba(199,125,255,0.2)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '16px', margin: '0 0 8px', fontWeight: '700' }}>
              {statusFilter ? `「${STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}」の依頼はありません` : 'まだ依頼はありません'}
            </p>
            {!statusFilter && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                <Link href="/search" style={{ padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
                  クリエイターを探す
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order: o }: { order: Order }) {
  const st = ORDER_STATUS_MAP[o.status] ?? ORDER_STATUS_MAP.pending
  const isPaid = o.order_type !== 'free'

  return (
    <Link href={`/orders/${o.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div
        style={{
          background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(199,125,255,0.12)',
          borderRadius: '16px', padding: '18px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(199,125,255,0.35)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(199,125,255,0.12)')}
      >
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <p style={{ fontWeight: '700', fontSize: '15px', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {o.title}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px',
              color: isPaid ? '#c77dff' : '#60a5fa',
              background: isPaid ? 'rgba(199,125,255,0.12)' : 'rgba(96,165,250,0.12)',
            }}>
              {isPaid ? '有償' : '無償'}
            </span>
            {isPaid && o.budget != null && (
              <span style={{ color: '#a9a8c0', fontSize: '12px' }}>¥{o.budget.toLocaleString()}</span>
            )}
            {o.deadline && (
              <span style={{ color: '#a9a8c0', fontSize: '12px' }}>
                納期: {new Date(o.deadline).toLocaleDateString('ja-JP')}
              </span>
            )}
            <span style={{ color: '#5c5b78', fontSize: '12px' }}>
              {new Date(o.created_at).toLocaleDateString('ja-JP')} 作成
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: st.color, background: st.bg }}>
            {st.label}
          </span>
          <span style={{ color: '#5c5b78', fontSize: '16px' }}>›</span>
        </div>
      </div>
    </Link>
  )
}
