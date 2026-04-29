'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { ORDER_STATUS_MAP } from '@/lib/constants/statuses'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

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

const ACTIVE_CHIP_CLS: Record<string, string> = {
  '':          'bg-brand text-white border-brand',
  pending:     'bg-[#fbbf24]/10 text-[#d97706] border-[#fbbf24]/40',
  accepted:    'bg-[#4ade80]/10 text-[#16a34a] border-[#4ade80]/40',
  in_progress: 'bg-brand-soft text-brand border-brand/40',
  delivered:   'bg-[#60a5fa]/10 text-[#60a5fa] border-[#60a5fa]/40',
  completed:   'bg-[var(--c-surface-2)] text-[var(--c-text-2)] border-[var(--c-border)]',
  cancelled:   'bg-[#dc2626]/8 text-[#dc2626] border-[#dc2626]/30',
  disputed:    'bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/40',
}

function orderTone(status: string): 'brand' | 'ok' | 'warn' | 'danger' | 'neutral' {
  const map: Record<string, 'brand' | 'ok' | 'warn' | 'danger' | 'neutral'> = {
    pending: 'warn', accepted: 'ok', in_progress: 'brand', delivered: 'brand',
    completed: 'neutral', cancelled: 'neutral', disputed: 'danger',
  }
  return map[status] ?? 'neutral'
}

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
  const [tab,          setTab]        = useState<'received' | 'sent'>('received')
  const [statusFilter, setStatus]     = useState('')
  const [sortKey,      setSortKey]    = useState<SortKey>('created_at')
  const [sortAsc,      setSortAsc]    = useState(false)

  const orders = tab === 'received' ? received : sent
  const filtered = useMemo(
    () => filterAndSort(orders, statusFilter, sortKey, sortAsc),
    [orders, statusFilter, sortKey, sortAsc]
  )

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container className="py-10">
        <div className="mb-6">
          <h1 className="text-[26px] font-bold mb-1">依頼管理</h1>
          <p className="text-[14px] text-[var(--c-text-3)]">受け取った依頼・送った依頼を管理します</p>
        </div>

        {/* タブ */}
        <div className="flex gap-1 border-b border-[var(--c-border)] mb-5">
          {([['received', '受け取った依頼', received.length], ['sent', '送った依頼', sent.length]] as const).map(([t, label, count]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-[14px] font-bold border-b-2 -mb-px transition-colors ${tab === t ? 'text-brand border-brand' : 'text-[var(--c-text-3)] border-transparent hover:text-[var(--c-text-2)]'}`}
            >
              {label}
              <span className={`ml-2 text-[12px] px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-brand-soft text-brand' : 'bg-[var(--c-surface-2)] text-[var(--c-text-4)]'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* フィルター + ソート */}
        <div className="flex gap-3 items-center flex-wrap mb-5">
          <div className="flex gap-1.5 flex-wrap flex-1">
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const active = statusFilter === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1 rounded-full text-[12px] border transition-colors ${active ? ACTIVE_CHIP_CLS[opt.value] ?? ACTIVE_CHIP_CLS[''] : 'border-[var(--c-border)] text-[var(--c-text-3)] hover:bg-[var(--c-surface)]'}`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <div className="flex gap-1 items-center border-l border-[var(--c-border)] pl-3">
            <span className="text-[12px] text-[var(--c-text-4)] mr-1">並び替え:</span>
            {(['created_at', 'deadline', 'status'] as const).map((key) => {
              const labels: Record<SortKey, string> = { created_at: '作成日', deadline: '納期', status: 'ステータス' }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSort(key)}
                  className={`flex items-center gap-0.5 text-[12px] px-2 py-1 rounded-[6px] transition-colors ${sortKey === key ? 'text-brand font-bold' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-2)]'}`}
                >
                  {labels[key]}{sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                </button>
              )
            })}
          </div>
        </div>

        {/* 一覧 */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={statusFilter ? `「${STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}」の依頼はありません` : 'まだ依頼はありません'}
            action={!statusFilter ? (
              <Link
                href="/search"
                className="inline-flex items-center h-9 px-4 rounded-[6px] bg-brand text-white text-[13px] font-medium no-underline hover:bg-brand-ink transition-colors"
              >
                クリエイターを探す
              </Link>
            ) : undefined}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </Container>
    </div>
  )
}

function OrderCard({ order: o }: { order: Order }) {
  const st = ORDER_STATUS_MAP[o.status] ?? ORDER_STATUS_MAP.pending
  const isPaid = o.order_type !== 'free'

  return (
    <Link href={`/orders/${o.id}`} className="no-underline text-[var(--c-text)] block">
      <Card bordered className="px-5 py-4 flex items-center justify-between gap-4 hover:border-brand transition-colors">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] truncate mb-1.5">{o.title}</p>
          <div className="flex gap-2 flex-wrap items-center">
            <Badge tone={isPaid ? 'brand' : 'neutral'} variant="soft">{isPaid ? '有償' : '無償'}</Badge>
            {isPaid && o.budget != null && (
              <span className="text-[12px] text-[var(--c-text-3)]">¥{o.budget.toLocaleString()}</span>
            )}
            {o.deadline && (
              <span className="text-[12px] text-[var(--c-text-3)]">
                納期: {new Date(o.deadline).toLocaleDateString('ja-JP')}
              </span>
            )}
            <span className="text-[12px] text-[var(--c-text-4)]">
              {new Date(o.created_at).toLocaleDateString('ja-JP')} 作成
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={orderTone(o.status)} variant="soft">{st.label}</Badge>
          <ChevronRight size={16} className="text-[var(--c-text-4)]" aria-hidden />
        </div>
      </Card>
    </Link>
  )
}
