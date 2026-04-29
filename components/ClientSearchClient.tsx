'use client'

import { useState, useMemo, useTransition, useCallback, useRef, useEffect } from 'react'

const PAGE_SIZE = 100

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}
import { useRouter, usePathname } from 'next/navigation'
import type { Client } from '@/app/clients/page'

const ENTITY_OPTIONS = [
  { value: 'individual', label: '個人' },
  { value: 'corporate', label: '法人・団体' },
]

const SNS_ICONS: Record<string, string> = {
  'X (Twitter)': '𝕏',
  Instagram: '📷',
  TikTok: '🎵',
  Twitch: '🟣',
  Bluesky: '🦋',
  ホームページ: '🌐',
}

const SNS_BASE_URLS: Record<string, string> = {
  'X (Twitter)': 'https://x.com/',
  Instagram: 'https://instagram.com/',
  TikTok: 'https://tiktok.com/@',
  Twitch: 'https://twitch.tv/',
  Bluesky: 'https://bsky.app/profile/',
  ホームページ: '',
}

const filterLabelStyle: React.CSSProperties = {
  color: 'var(--c-text-3)', fontSize: '12px', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.06em',
}

function formatJoined(dateStr: string): string {
  const ms = new Date(dateStr).getTime()
  if (isNaN(ms)) return '登録日不明'
  const diff = Math.floor((Date.now() - ms) / 86400000)
  if (diff <= 0) return '今日登録'
  if (diff < 7) return `${diff}日前に登録`
  if (diff < 30) return `${Math.floor(diff / 7)}週間前に登録`
  if (diff < 365) return `${Math.floor(diff / 30)}ヶ月前に登録`
  return `${Math.floor(diff / 365)}年以上前に登録`
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

interface Props {
  clients: Client[]
  initialEntity: string
  initialQ: string
}

export default function ClientSearchClient({ clients, initialEntity, initialQ }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const [query, setQuery] = useState(initialQ)
  const [selectedEntity, setSelectedEntity] = useState(initialEntity)
  const [page, setPage] = useState(1)

  const pushUrl = useCallback((entity: string, q: string) => {
    const params = new URLSearchParams()
    if (entity) params.set('entity', entity)
    if (q.trim()) params.set('q', q.trim())
    const qs = params.toString()
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }, [pathname, router])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  useEffect(() => { setPage(1) }, [query])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushUrl(selectedEntity, value)
    }, 400)
  }

  const toggleEntity = (e: string) => {
    const next = selectedEntity === e ? '' : e
    setSelectedEntity(next)
    pushUrl(next, query)
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return clients
    const q = query.trim().toLowerCase()
    return clients.filter((c) =>
      (c.display_name ?? '').toLowerCase().includes(q)
    )
  }, [clients, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>

      {/* タイトル */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px' }}>
          お仕事募集中の依頼者
        </h1>
        <p style={{ color: 'var(--c-text-3)', fontSize: '14px', margin: 0 }}>
          {filtered.length} 人の依頼者が見つかりました
          {totalPages > 1 && <span style={{ marginLeft: '8px' }}>（{page} / {totalPages} ページ）</span>}
        </p>
      </div>

      {/* 検索バー */}
      <div style={{ position: 'relative', marginBottom: '28px' }}>
        <span style={{
          position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '18px', pointerEvents: 'none',
        }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="名前で検索..."
          style={{
            width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px',
            border: '1px solid var(--c-alt-a25)',
            background: 'var(--c-input-bg)',
            color: 'var(--c-text)', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {query && (
          <button type="button" onClick={() => handleQueryChange('')}
            style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--c-text-3)', cursor: 'pointer', fontSize: '18px',
            }}>×</button>
        )}
      </div>

      {/* フィルターパネル */}
      <div style={{
        background: 'var(--c-surface-2)',
        border: '1px solid var(--c-alt-a12)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '32px',
      }}>
        <p style={filterLabelStyle}>活動形態</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ENTITY_OPTIONS.map((opt) => {
            const active = selectedEntity === opt.value
            return (
              <button key={opt.value} type="button" onClick={() => toggleEntity(opt.value)}
                style={{
                  padding: '6px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                  border: active ? '2px solid var(--c-accent-alt)' : '1px solid var(--c-border-2)',
                  background: active ? 'var(--c-alt-a15)' : 'var(--c-accent-a04)',
                  color: active ? 'var(--c-accent-alt)' : 'var(--c-text-2)', fontWeight: active ? '700' : '400',
                }}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 結果グリッド */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--c-text-3)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <p style={{ fontSize: '16px', margin: 0 }}>条件に一致する依頼者がいませんでした</p>
          <p style={{ fontSize: '13px', margin: '8px 0 0', color: 'var(--c-text-4)' }}>検索ワードやフィルターを変えてみてください</p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {paged.map((c) => <ClientCard key={c.id} client={c} />)}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '40px', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{
                  padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                  border: '1px solid var(--c-border-2)', background: 'transparent',
                  color: page === 1 ? 'var(--c-text-4)' : 'var(--c-text-2)', cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >← 前へ</button>

              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`el-${i}`} style={{ color: 'var(--c-text-4)', padding: '0 4px', fontSize: '13px' }}>…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setPage(p as number); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    style={{
                      width: '38px', height: '38px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                      border: page === p ? '2px solid var(--c-alt-a25)' : '1px solid var(--c-border-2)',
                      background: page === p ? 'var(--c-alt-a15)' : 'transparent',
                      color: page === p ? 'var(--c-accent-alt)' : 'var(--c-text-2)', cursor: 'pointer',
                    }}
                  >{p}</button>
                )
              )}

              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{
                  padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                  border: '1px solid var(--c-border-2)', background: 'transparent',
                  color: page === totalPages ? 'var(--c-text-4)' : 'var(--c-text-2)', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >次へ →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ClientCard({ client: c }: { client: Client }) {
  const initial = c.display_name?.[0]?.toUpperCase() ?? '?'
  const entityLabel = c.entity_type === 'corporate' ? '法人・団体' : '個人'
  const snsList = (Array.isArray(c.sns_links) ? c.sns_links : []).filter((s) => s?.id?.trim())

  return (
    <div style={{
      background: 'var(--c-surface)',
      border: '1px solid var(--c-alt-a15)',
      borderRadius: '20px',
      padding: '22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {/* アバター + 名前 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
          overflow: 'hidden',
          background: 'var(--c-grad-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: '700', color: '#fff',
        }}>
          {c.avatar_url
            ? <img src={c.avatar_url} alt={c.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initial}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: '700', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.display_name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--c-text-3)', marginTop: '2px' }}>
            {formatJoined(c.created_at)}
          </div>
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
          background: c.entity_type === 'corporate' ? 'rgba(251,191,36,0.15)' : 'var(--c-border)',
          color: c.entity_type === 'corporate' ? '#fbbf24' : 'var(--c-text-2)',
          flexShrink: 0,
        }}>
          {entityLabel}
        </span>
      </div>

      {/* 依頼者タイプバッジ */}
      {(c.client_type ?? []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(c.client_type ?? []).slice(0, 4).map((t) => (
            <span key={t} style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
              background: 'var(--c-alt-a12)', color: 'var(--c-accent-alt)',
              border: '1px solid var(--c-alt-a25)',
            }}>
              {t}
            </span>
          ))}
          {(c.client_type ?? []).length > 4 && (
            <span style={{ color: 'var(--c-text-3)', fontSize: '11px', alignSelf: 'center' }}>
              +{(c.client_type ?? []).length - 4}
            </span>
          )}
        </div>
      )}

      {/* SNS リンク */}
      {snsList.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {snsList.map((s, i) => {
            const base = SNS_BASE_URLS[s.platform] ?? ''
            const rawHref = base ? `${base}${s.id}` : s.id
            // base が空（ホームページ or 未知 platform）は生 URL なので常に検証する
            const href = base ? rawHref : (isSafeUrl(rawHref) ? rawHref : '#')
            return (
              <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
                  border: '1px solid var(--c-border-2)',
                  background: 'var(--c-input-bg)',
                  color: 'var(--c-text-2)', textDecoration: 'none',
                }}>
                <span>{SNS_ICONS[s.platform] ?? '🔗'}</span>
                <span>{s.platform}</span>
              </a>
            )
          })}
        </div>
      ) : (
        <p style={{ color: 'var(--c-text-4)', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>
          SNS未登録
        </p>
      )}

      {/* アクションボタン */}
      <button type="button" disabled style={{
        width: '100%', padding: '10px', borderRadius: '12px',
        border: '1px solid var(--c-alt-a20)',
        background: 'var(--c-alt-a06)',
        color: 'var(--c-accent-alt)', fontSize: '13px', fontWeight: '700',
        cursor: 'not-allowed', opacity: 0.6, marginTop: 'auto',
      }}>
        📩 依頼を提案する（準備中）
      </button>
    </div>
  )
}
