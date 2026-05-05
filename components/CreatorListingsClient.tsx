'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { CREATOR_TYPES } from '@/lib/constants/lists'
import { CheckCircle2 } from 'lucide-react'

interface CreatorListing {
  id: string
  title: string
  description: string | null
  creator_types: string[]
  order_type: 'paid' | 'free'
  price_min: number | null
  price_max: number | null
  created_at: string
  creator_id: string
  users: {
    display_name: string | null
    avatar_url: string | null
    entity_type: string | null
  } | null
}

interface Props {
  listings: CreatorListing[]
  currentUserId: string
  postedSuccess: boolean
}

const filterBtnStyle = (active: boolean, color = 'rgb(var(--brand-rgb))'): React.CSSProperties => ({
  padding: '6px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
  border: active ? `2px solid ${color}` : '1px solid var(--c-border-2)',
  background: active ? 'var(--c-accent-a12)' : 'var(--c-surface-2)',
  color: active ? color : 'var(--c-text-2)',
  fontWeight: active ? '700' : '400',
})

export default function CreatorListingsClient({ listings, currentUserId, postedSuccess }: Props) {
  const [selectedType,  setSelectedType]  = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<'all' | 'paid' | 'free'>('all')
  const [expandedId,    setExpandedId]    = useState<string | null>(null)

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (selectedType && !l.creator_types.includes(selectedType)) return false
      if (selectedOrder !== 'all' && l.order_type !== selectedOrder) return false
      return true
    })
  }, [listings, selectedType, selectedOrder])

  const formatPrice = (min: number | null, max: number | null) => {
    if (min === null && max === null) return null
    if (min !== null && max !== null) return `¥${min.toLocaleString()} 〜 ¥${max.toLocaleString()}`
    if (min !== null) return `¥${min.toLocaleString()} 〜`
    return `〜 ¥${max!.toLocaleString()}`
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>

      {/* 投稿成功バナー */}
      {postedSuccess && (
        <div style={{
          background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
          borderRadius: '14px', padding: '14px 20px', marginBottom: '28px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <CheckCircle2 size={18} color="#4ade80" aria-hidden />
          <p style={{ margin: 0, fontSize: '14px', color: '#4ade80' }}>仕事募集を投稿しました。依頼者からの連絡をお待ちください。</p>
        </div>
      )}

      {/* タイトル */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px' }}>クリエイターを探す</h1>
          <p style={{ color: 'var(--c-text-3)', fontSize: '14px', margin: 0 }}>
            {filtered.length} 件の仕事募集が見つかりました
          </p>
        </div>
        <Link
          href="/creator-listings/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 22px', borderRadius: '14px',
            background: 'rgb(var(--brand-rgb))',
            color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          ＋ 仕事募集を投稿する
        </Link>
      </div>

      {/* フィルター */}
      <div style={{
        background: 'var(--c-surface)', border: '1px solid var(--c-border)',
        borderRadius: '16px', padding: '20px 24px', marginBottom: '32px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <div>
          <p style={{ color: 'var(--c-text-3)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 10px' }}>
            クリエイタータイプ
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button type="button" onClick={() => setSelectedType(null)} style={filterBtnStyle(selectedType === null)}>
              すべて
            </button>
            {CREATOR_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setSelectedType(selectedType === t ? null : t)} style={filterBtnStyle(selectedType === t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ color: 'var(--c-text-3)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 10px' }}>
            報酬
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {([['all', 'すべて'], ['paid', '有償'], ['free', '無償']] as const).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setSelectedOrder(v)} style={filterBtnStyle(selectedOrder === v, '#4ade80')}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 一覧 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--c-text-3)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
          <p style={{ fontSize: '16px', margin: '0 0 8px' }}>条件に一致する仕事募集がありませんでした</p>
          <p style={{ fontSize: '13px', color: 'var(--c-text-3)' }}>フィルターを変えてみてください</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((listing) => {
            const isOwn    = listing.creator_id === currentUserId
            const expanded = expandedId === listing.id
            const price    = formatPrice(listing.price_min, listing.price_max)

            return (
              <div
                key={listing.id}
                style={{
                  background: 'var(--c-surface)', border: `1px solid ${isOwn ? 'rgba(30,64,255,0.3)' : 'var(--c-border)'}`,
                  borderRadius: '18px', padding: '22px 24px', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onClick={() => setExpandedId(expanded ? null : listing.id)}
              >
                {/* ヘッダー行 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: listing.users?.avatar_url ? 'transparent' : 'rgb(var(--brand-rgb))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {listing.users?.avatar_url
                      ? <img src={listing.users.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '16px', color: '#fff' }}>🎨</span>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <p style={{ fontWeight: '800', fontSize: '16px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {listing.title}
                      </p>
                      {isOwn && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'var(--c-accent-a15)', color: 'rgb(var(--brand-rgb))', fontWeight: '700', flexShrink: 0 }}>
                          自分の投稿
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'var(--c-text-3)', fontSize: '12px', margin: 0 }}>
                      {listing.users?.display_name ?? '名前なし'} · {new Date(listing.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>

                  <span style={{ color: 'var(--c-text-3)', fontSize: '14px', flexShrink: 0, alignSelf: 'center' }}>
                    {expanded ? '▲' : '▼'}
                  </span>
                </div>

                {/* タグ行 */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: expanded ? '16px' : 0 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: listing.order_type === 'paid' ? 'rgba(74,222,128,0.12)' : 'rgba(169,168,192,0.1)',
                    color: listing.order_type === 'paid' ? '#4ade80' : 'var(--c-text-2)',
                    border: `1px solid ${listing.order_type === 'paid' ? 'rgba(74,222,128,0.25)' : 'rgba(169,168,192,0.2)'}`,
                  }}>
                    {listing.order_type === 'paid' ? '有償' : '無償'}
                  </span>
                  {listing.creator_types.map((t) => (
                    <span key={t} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', background: 'var(--c-accent-a12)', color: 'rgb(var(--brand-rgb))', border: '1px solid var(--c-border)' }}>
                      {t}
                    </span>
                  ))}
                  {price && (
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                      {price}
                    </span>
                  )}
                </div>

                {/* 展開時: 詳細 */}
                {expanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                    {listing.description ? (
                      <p style={{ color: '#c0bdd8', fontSize: '14px', lineHeight: '1.8', margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>
                        {listing.description}
                      </p>
                    ) : (
                      <p style={{ color: 'var(--c-text-3)', fontSize: '13px', margin: '0 0 16px' }}>詳細説明なし</p>
                    )}

                    {!isOwn ? (
                      <Link
                        href={`/orders/new?creator=${listing.creator_id}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '10px 22px', borderRadius: '12px',
                          background: 'rgb(var(--brand-rgb))',
                          color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none',
                        }}
                      >
                        このクリエイターに依頼する →
                      </Link>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', color: 'var(--c-text-3)', alignSelf: 'center' }}>自分が投稿した仕事募集です</span>
                        <CloseButton listingId={listing.id} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CloseButton({ listingId }: { listingId: string }) {
  const [closing, setClosing] = useState(false)
  const [done,    setDone]    = useState(false)

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('この仕事募集を締め切りますか？')) return
    setClosing(true)
    const res = await fetch(`/api/creator-listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    })
    if (res.ok) { setDone(true); window.location.reload() }
    setClosing(false)
  }

  if (done) return <span style={{ color: '#4ade80', fontSize: '13px' }}>締め切りました</span>

  return (
    <button type="button" onClick={handleClose} disabled={closing}
      style={{
        padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(255,107,157,0.3)',
        background: 'rgba(255,107,157,0.08)', color: 'rgb(var(--brand-rgb))',
        fontSize: '13px', cursor: closing ? 'not-allowed' : 'pointer', fontWeight: '600',
      }}>
      {closing ? '処理中...' : '募集を締め切る'}
    </button>
  )
}
