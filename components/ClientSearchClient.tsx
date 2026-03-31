'use client'

import { useState, useMemo, useTransition, useCallback, useRef, useEffect } from 'react'
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
  color: '#7c7b99', fontSize: '12px', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.06em',
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

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>

      {/* タイトル */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px' }}>
          発注者を探す
        </h1>
        <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>
          {filtered.length} 人の発注者が見つかりました
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
            border: '1px solid rgba(255,107,157,0.25)',
            background: 'rgba(255,255,255,0.05)',
            color: '#f0eff8', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {query && (
          <button type="button" onClick={() => handleQueryChange('')}
            style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#7c7b99', cursor: 'pointer', fontSize: '18px',
            }}>×</button>
        )}
      </div>

      {/* フィルターパネル */}
      <div style={{
        background: 'rgba(22,22,31,0.8)',
        border: '1px solid rgba(255,107,157,0.12)',
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
                  border: active ? '2px solid #ff6b9d' : '1px solid rgba(255,255,255,0.12)',
                  background: active ? 'rgba(255,107,157,0.15)' : 'rgba(255,255,255,0.03)',
                  color: active ? '#ff6b9d' : '#a9a8c0', fontWeight: active ? '700' : '400',
                }}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 結果グリッド */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#7c7b99' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <p style={{ fontSize: '16px', margin: 0 }}>条件に一致する発注者が見つかりませんでした</p>
          <p style={{ fontSize: '13px', margin: '8px 0 0', color: '#5c5b78' }}>検索ワードやフィルターを変えてみてください</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {filtered.map((c) => <ClientCard key={c.id} client={c} />)}
        </div>
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
      background: 'rgba(22,22,31,0.9)',
      border: '1px solid rgba(255,107,157,0.15)',
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
          background: 'linear-gradient(135deg, #ff6b9d, #fbbf24)',
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
          <div style={{ fontSize: '11px', color: '#7c7b99', marginTop: '2px' }}>
            {formatJoined(c.created_at)}
          </div>
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
          background: c.entity_type === 'corporate' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.07)',
          color: c.entity_type === 'corporate' ? '#fbbf24' : '#a9a8c0',
          flexShrink: 0,
        }}>
          {entityLabel}
        </span>
      </div>

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
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#d0cfea', textDecoration: 'none',
                }}>
                <span>{SNS_ICONS[s.platform] ?? '🔗'}</span>
                <span>{s.platform}</span>
              </a>
            )
          })}
        </div>
      ) : (
        <p style={{ color: '#5c5b78', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>
          SNS未登録
        </p>
      )}

      {/* アクションボタン */}
      <button disabled style={{
        width: '100%', padding: '10px', borderRadius: '12px',
        border: '1px solid rgba(255,107,157,0.2)',
        background: 'rgba(255,107,157,0.06)',
        color: '#ff6b9d', fontSize: '13px', fontWeight: '700',
        cursor: 'not-allowed', opacity: 0.6, marginTop: 'auto',
      }}>
        📩 依頼を提案する（準備中）
      </button>
    </div>
  )
}
