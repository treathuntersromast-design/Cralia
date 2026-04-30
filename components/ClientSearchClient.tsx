'use client'

import { useState, useMemo, useTransition, useCallback, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, X, Mail } from 'lucide-react'
import type { Client } from '@/app/clients/page'
import { EmptyState } from '@/components/ui/EmptyState'

const PAGE_SIZE = 100

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const ENTITY_OPTIONS = [
  { value: 'individual', label: '個人' },
  { value: 'corporate',  label: '法人・団体' },
]

const SNS_LABELS: Record<string, string> = {
  'X (Twitter)': 'X',
  Instagram: 'Instagram',
  TikTok: 'TikTok',
  Twitch: 'Twitch',
  Bluesky: 'Bluesky',
  ホームページ: 'Web',
}

const SNS_BASE_URLS: Record<string, string> = {
  'X (Twitter)': 'https://x.com/',
  Instagram: 'https://instagram.com/',
  TikTok: 'https://tiktok.com/@',
  Twitch: 'https://twitch.tv/',
  Bluesky: 'https://bsky.app/profile/',
  ホームページ: '',
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
    <div className="max-w-[1000px] mx-auto px-6 py-10">

      {/* タイトル */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold mb-1.5">お仕事募集中の依頼者</h1>
        <p className="text-[14px] text-[var(--c-text-3)]">
          {filtered.length} 人の依頼者が見つかりました
          {totalPages > 1 && <span className="ml-2">（{page} / {totalPages} ページ）</span>}
        </p>
      </div>

      {/* 検索バー */}
      <div className="relative mb-7">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--c-text-3)] pointer-events-none" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="名前で検索..."
          className="w-full h-12 pl-12 pr-11 rounded-[14px] border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[15px] outline-none focus:border-brand transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => handleQueryChange('')}
            title="クリア"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-0 text-[var(--c-text-3)] cursor-pointer hover:text-[var(--c-text-2)] transition-colors"
          >
            <X size={18} aria-hidden />
          </button>
        )}
      </div>

      {/* フィルターパネル */}
      <div className="bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-[16px] px-6 py-5 mb-8">
        <p className="text-[12px] text-[var(--c-text-3)] font-semibold tracking-wider uppercase mb-2">活動形態</p>
        <div className="inline-flex p-1 bg-[var(--c-surface-3)] rounded-lg gap-1">
          {ENTITY_OPTIONS.map((opt) => {
            const active = selectedEntity === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleEntity(opt.value)}
                className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
                  active
                    ? 'bg-white shadow-sm text-[rgb(var(--brand-rgb))]'
                    : 'text-[var(--c-text-3)] hover:text-[var(--c-text-2)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 結果グリッド */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="条件に一致する依頼者がいませんでした"
          description="検索ワードやフィルターを変えてみてください"
        />
      ) : (
        <>
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {paged.map((c) => <ClientCard key={c.id} client={c} />)}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 mt-10 flex-wrap">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border border-[var(--c-border-2)] bg-transparent text-[var(--c-text-2)] disabled:text-[var(--c-text-4)] disabled:cursor-not-allowed hover:bg-[var(--c-surface)] transition-colors"
              >
                ← 前へ
              </button>

              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`el-${i}`} className="text-[var(--c-text-4)] px-1 text-[13px]">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setPage(p as number); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className={`w-[38px] h-[38px] rounded-[10px] text-[13px] font-bold transition-colors ${
                      page === p
                        ? 'border-2 border-brand/50 bg-brand-soft text-brand'
                        : 'border border-[var(--c-border-2)] bg-transparent text-[var(--c-text-2)] hover:bg-[var(--c-surface)]'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border border-[var(--c-border-2)] bg-transparent text-[var(--c-text-2)] disabled:text-[var(--c-text-4)] disabled:cursor-not-allowed hover:bg-[var(--c-surface)] transition-colors"
              >
                次へ →
              </button>
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
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-[20px] p-5.5 flex flex-col gap-3.5">
      {/* アバター + 名前 */}
      <div className="flex items-center gap-3">
        <div className="w-[52px] h-[52px] rounded-full shrink-0 overflow-hidden bg-brand flex items-center justify-center text-[20px] font-bold text-white">
          {c.avatar_url
            ? <img src={c.avatar_url} alt={c.display_name} className="w-full h-full object-cover" />
            : initial}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="font-bold text-[15px] overflow-hidden text-ellipsis whitespace-nowrap">
            {c.display_name}
          </div>
          <div className="text-[11px] text-[var(--c-text-3)] mt-0.5">
            {formatJoined(c.created_at)}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-[12px] font-bold shrink-0 ${
          c.entity_type === 'corporate'
            ? 'bg-[#fbbf24]/15 text-[#d97706]'
            : 'bg-[var(--c-surface-2)] text-[var(--c-text-2)]'
        }`}>
          {entityLabel}
        </span>
      </div>

      {/* 依頼者タイプバッジ */}
      {(c.client_type ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(c.client_type ?? []).slice(0, 4).map((t) => (
            <span
              key={t}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-soft text-brand border border-brand/25"
            >
              {t}
            </span>
          ))}
          {(c.client_type ?? []).length > 4 && (
            <span className="text-[var(--c-text-3)] text-[11px] self-center">
              +{(c.client_type ?? []).length - 4}
            </span>
          )}
        </div>
      )}

      {/* SNS リンク */}
      {snsList.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {snsList.map((s, i) => {
            const base = SNS_BASE_URLS[s.platform] ?? ''
            const rawHref = base ? `${base}${s.id}` : s.id
            const href = base ? rawHref : (isSafeUrl(rawHref) ? rawHref : '#')
            return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border border-[var(--c-border-2)] bg-[var(--c-input-bg)] text-[var(--c-text-2)] no-underline hover:border-brand hover:text-brand transition-colors"
              >
                {SNS_LABELS[s.platform] ?? s.platform}
              </a>
            )
          })}
        </div>
      ) : (
        <p className="text-[var(--c-text-4)] text-[13px] italic m-0">SNS未登録</p>
      )}

      {/* アクションボタン */}
      <button
        type="button"
        disabled
        className="w-full py-2.5 rounded-[12px] border border-brand/20 bg-brand-soft text-brand text-[13px] font-bold cursor-not-allowed opacity-60 mt-auto flex items-center justify-center gap-1.5"
      >
        <Mail size={14} aria-hidden />
        依頼を提案する（準備中）
      </button>
    </div>
  )
}
