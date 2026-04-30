'use client'

import { useState, useMemo, useTransition, useCallback, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, Hash, X, CheckCircle, AlertCircle, XCircle, ImageIcon, type LucideIcon } from 'lucide-react'
import type { Creator } from '@/app/search/page'
import { CREATOR_TYPES, SKILL_SUGGESTIONS } from '@/lib/constants/lists'
import { EmptyState } from '@/components/ui/EmptyState'

const PAGE_SIZE = 100

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const AVAIL_OPTIONS = [
  { value: 'open',     label: '受付中',       icon: CheckCircle, color: 'text-[#16a34a]', bg: 'bg-[#4ade80]/12', border: 'border-[#4ade80]/50' },
  { value: 'one_slot', label: '要相談',       icon: AlertCircle, color: 'text-[#d97706]', bg: 'bg-[#fbbf24]/12', border: 'border-[#fbbf24]/50' },
  { value: 'full',     label: '現在対応不可', icon: XCircle,     color: 'text-[#dc2626]', bg: 'bg-[#f87171]/12', border: 'border-[#f87171]/50' },
]

const AVAIL_MAP: Record<string, { label: string; colorCls: string; bgCls: string; Icon: LucideIcon }> = {
  open:     { label: '受付中',       colorCls: 'text-[#16a34a]', bgCls: 'bg-[#4ade80]/12', Icon: CheckCircle },
  one_slot: { label: '要相談',       colorCls: 'text-[#d97706]', bgCls: 'bg-[#fbbf24]/12', Icon: AlertCircle },
  full:     { label: '現在対応不可', colorCls: 'text-[#dc2626]', bgCls: 'bg-[#f87171]/12', Icon: XCircle     },
}

interface Props {
  creators: Creator[]
  initialType: string
  initialAvailability: string
  initialQ: string
  initialId: string
  initialSkills: string[]
  from?: string
}

export default function CreatorSearchClient({
  creators, initialType, initialAvailability, initialQ, initialId, initialSkills, from,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const [query,          setQuery]         = useState(initialQ)
  const [idQuery,        setIdQuery]       = useState(initialId)
  const [searchMode,     setSearchMode]    = useState<'keyword' | 'id'>(initialId ? 'id' : 'keyword')
  const [selectedType,   setSelectedType]  = useState(initialType)
  const [selectedAvail,  setSelectedAvail] = useState(initialAvailability)
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialSkills)
  const [page, setPage] = useState(1)
  const [showAllSkills, setShowAllSkills] = useState(false)

  const pushUrl = useCallback((type: string, avail: string, q: string, id: string, skills: string[]) => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (avail) params.set('availability', avail)
    if (q.trim()) params.set('q', q.trim())
    if (id.trim()) params.set('id', id.trim())
    if (skills.length > 0) params.set('skills', skills.join(','))
    const qs = params.toString()
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }, [pathname, router])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  useEffect(() => { setPage(1) }, [query, idQuery, searchMode, selectedSkills])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushUrl(selectedType, selectedAvail, value, '', selectedSkills)
    }, 400)
  }

  const handleIdChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    setIdQuery(digits)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushUrl('', '', '', digits, [])
    }, 400)
  }

  const toggleType = (t: string) => {
    const next = selectedType === t ? '' : t
    setSelectedType(next)
    pushUrl(next, selectedAvail, query, '', selectedSkills)
  }

  const toggleAvail = (a: string) => {
    const next = selectedAvail === a ? '' : a
    setSelectedAvail(next)
    pushUrl(selectedType, next, query, '', selectedSkills)
  }

  const toggleSkill = (s: string) => {
    const next = selectedSkills.includes(s)
      ? selectedSkills.filter((x) => x !== s)
      : [...selectedSkills, s]
    setSelectedSkills(next)
    pushUrl(selectedType, selectedAvail, query, '', next)
  }

  const clearSkills = () => {
    setSelectedSkills([])
    pushUrl(selectedType, selectedAvail, query, '', [])
  }

  const backUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedType) params.set('type', selectedType)
    if (selectedAvail) params.set('availability', selectedAvail)
    if (query.trim()) params.set('q', query.trim())
    if (selectedSkills.length > 0) params.set('skills', selectedSkills.join(','))
    if (from) params.set('from', from)
    const qs = params.toString()
    return encodeURIComponent(`${pathname}${qs ? `?${qs}` : ''}`)
  }, [selectedType, selectedAvail, query, selectedSkills, pathname, from])

  const filtered = useMemo(() => {
    if (searchMode === 'id' && idQuery.trim()) {
      return creators.filter((c) => c.display_id === idQuery.trim())
    }
    return creators.filter((c) => {
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        const hit =
          (c.display_name ?? '').toLowerCase().includes(q) ||
          (c.skills ?? []).some((s) => s.toLowerCase().includes(q)) ||
          (c.creator_type ?? []).some((t) => t.toLowerCase().includes(q)) ||
          (c.bio ?? '').toLowerCase().includes(q)
        if (!hit) return false
      }
      if (selectedSkills.length > 0) {
        if (!selectedSkills.some((s) => (c.skills ?? []).includes(s))) return false
      }
      return true
    })
  }, [creators, query, idQuery, searchMode, selectedSkills])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-10">

      {/* タイトル */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold mb-1.5">クリエイターを探す</h1>
        <p className="text-[14px] text-[var(--c-text-3)]">
          {filtered.length} 人のクリエイターが見つかりました
          {totalPages > 1 && <span className="ml-2">（{page} / {totalPages} ページ）</span>}
        </p>
      </div>

      {/* 検索モード切替 + 検索バー */}
      <div className="mb-7">
        <div className="flex gap-1 mb-2.5">
          {(['keyword', 'id'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSearchMode(mode)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                searchMode === mode
                  ? 'bg-brand-soft text-brand border-0'
                  : 'border border-[var(--c-border-2)] text-[var(--c-text-3)] bg-transparent hover:bg-[var(--c-surface)]'
              }`}
            >
              {mode === 'keyword' ? <><Search size={13} aria-hidden /> キーワード検索</> : <><Hash size={13} aria-hidden /> ID検索</>}
            </button>
          ))}
        </div>

        {searchMode === 'keyword' ? (
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--c-text-3)] pointer-events-none" aria-hidden />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="名前・スキル・クリエイタータイプ・自己紹介で検索..."
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
        ) : (
          <div className="relative">
            <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--c-text-3)] pointer-events-none" aria-hidden />
            <input
              type="text"
              value={idQuery}
              onChange={(e) => handleIdChange(e.target.value)}
              placeholder="8桁のユーザーIDを入力（例: 00123456）"
              maxLength={8}
              className="w-full h-12 pl-12 pr-11 rounded-[14px] border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[15px] outline-none focus:border-brand transition font-mono tracking-wider"
            />
            {idQuery && (
              <button
                type="button"
                onClick={() => { setIdQuery(''); pushUrl('', '', '', '', []) }}
                title="クリア"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-0 text-[var(--c-text-3)] cursor-pointer hover:text-[var(--c-text-2)] transition-colors"
              >
                <X size={18} aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>

      {/* フィルターパネル */}
      <div className="bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-[16px] px-6 py-5 mb-8 flex flex-col gap-4.5">
        {/* 受付状況 */}
        <div>
          <p className="text-[12px] text-[var(--c-text-3)] font-semibold tracking-wider uppercase mb-2">受付状況</p>
          <div className="inline-flex p-1 bg-[var(--c-surface-3)] rounded-lg gap-1">
            {AVAIL_OPTIONS.map((opt) => {
              const active = selectedAvail === opt.value
              const IconComp = opt.icon
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleAvail(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
                    active
                      ? `bg-white shadow-sm ${opt.color}`
                      : 'text-[var(--c-text-3)] hover:text-[var(--c-text-2)]'
                  }`}
                >
                  <IconComp size={13} aria-hidden />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* クリエイタータイプ */}
        <div>
          <p className="text-[12px] text-[var(--c-text-3)] font-semibold tracking-wider uppercase mb-2">クリエイタータイプ</p>
          <div className="flex flex-wrap gap-2">
            {CREATOR_TYPES.map((t) => {
              const active = selectedType === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors ${
                    active
                      ? 'border-2 border-brand bg-brand-soft text-brand font-bold'
                      : 'border border-[var(--c-border-2)] bg-[var(--c-input-bg)] text-[var(--c-text-2)]'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* スキル */}
        <div>
          <p className="text-[12px] text-[var(--c-text-3)] font-semibold tracking-wider uppercase mb-2">
            スキル
            {selectedSkills.length > 0 && (
              <button
                type="button"
                onClick={clearSkills}
                className="ml-2.5 bg-transparent border-0 text-brand text-[11px] cursor-pointer hover:underline p-0"
              >
                クリア
              </button>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {(showAllSkills ? SKILL_SUGGESTIONS : SKILL_SUGGESTIONS.slice(0, 8)).map((s) => {
              const active = selectedSkills.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSkill(s)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors ${
                    active
                      ? 'border-2 border-brand bg-brand-soft text-brand font-bold'
                      : 'border border-[var(--c-border-2)] bg-[var(--c-input-bg)] text-[var(--c-text-2)]'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
          {SKILL_SUGGESTIONS.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllSkills(!showAllSkills)}
              className="mt-2 text-[12px] text-[rgb(var(--brand-rgb))] hover:underline bg-transparent border-0 cursor-pointer p-0"
            >
              {showAllSkills ? '閉じる' : `+ もっと見る (残り ${SKILL_SUGGESTIONS.length - 8} 個)`}
            </button>
          )}
        </div>
      </div>

      {/* 結果グリッド */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="条件に一致するクリエイターが見つかりませんでした"
          description="検索ワードやフィルターを変えてみてください"
        />
      ) : (
        <>
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {paged.map((c) => (
              <CreatorCard key={c.creator_id} creator={c} backUrl={backUrl} />
            ))}
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

function CreatorCard({ creator: c, backUrl }: { creator: Creator; backUrl: string }) {
  const avail = AVAIL_MAP[c.availability] ?? AVAIL_MAP.open
  const AvailIcon = avail.Icon
  const initial = c.display_name?.[0]?.toUpperCase() ?? '?'

  return (
    <Link href={`/profile/${c.creator_id}?back=${backUrl}`} className="no-underline text-[var(--c-text)] block">
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-[20px] overflow-hidden flex flex-col hover:border-brand transition-colors">
        {/* ポートフォリオサムネ */}
        <div className={`grid gap-0.5 ${c.thumbnails.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {c.thumbnails.length > 0
            ? c.thumbnails.slice(0, 2).map((thumb, i) => (
                <img
                  key={i}
                  src={thumb}
                  alt=""
                  className="w-full aspect-video object-cover block"
                />
              ))
            : (
                <div className="w-full aspect-video bg-[var(--c-surface-3)] flex items-center justify-center">
                  <ImageIcon size={24} className="text-[var(--c-text-4)]" aria-hidden />
                </div>
              )
          }
        </div>

        <div className="p-4.5 flex flex-col gap-3 flex-1">
          {/* アバター + 名前 + 受付状況 */}
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-full shrink-0 overflow-hidden bg-brand flex items-center justify-center text-[17px] font-bold text-white">
              {c.avatar_url
                ? <img src={c.avatar_url} alt={c.display_name} className="w-full h-full object-cover" />
                : initial}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="font-bold text-[15px] overflow-hidden text-ellipsis whitespace-nowrap">
                {c.display_name}
              </div>
              <div className="text-[11px] text-[var(--c-text-3)] mt-px flex gap-1.5 items-center">
                <span>{c.entity_type === 'corporate' ? '法人・団体' : '個人'}</span>
                {c.display_id && (
                  <span className="font-mono tracking-wider text-[var(--c-text-4)]">
                    ID: {c.display_id}
                  </span>
                )}
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 whitespace-nowrap flex items-center gap-1 ${avail.colorCls} ${avail.bgCls}`}>
              <AvailIcon size={11} aria-hidden />
              {avail.label}
            </span>
          </div>

          {/* クリエイタータイプ */}
          {(c.creator_type ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(c.creator_type ?? []).slice(0, 3).map((t) => (
                <span key={t} className="px-2.5 py-0.5 rounded-full text-[12px] bg-brand-soft text-brand font-semibold">
                  {t}
                </span>
              ))}
              {(c.creator_type ?? []).length > 3 && (
                <span className="text-[var(--c-text-3)] text-[12px] self-center">
                  +{(c.creator_type ?? []).length - 3}
                </span>
              )}
            </div>
          )}

          {/* スキル */}
          {(c.skills ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(c.skills ?? []).slice(0, 4).map((s) => (
                <span key={s} className="px-2.5 py-0.5 rounded-full text-[12px] border border-[var(--c-border-2)] text-[var(--c-text-2)]">
                  {s}
                </span>
              ))}
              {(c.skills ?? []).length > 4 && (
                <span className="text-[var(--c-text-3)] text-[12px] self-center">
                  +{(c.skills ?? []).length - 4}
                </span>
              )}
            </div>
          )}

          {/* bio */}
          {c.bio && (
            <p className="text-[var(--c-text-2)] text-[13px] leading-[1.6] m-0 line-clamp-2">
              {c.bio}
            </p>
          )}

          {/* 価格 */}
          {c.price_min != null && c.price_min >= 0 && (
            <div className="pt-2 border-t border-[var(--c-border)] mt-auto">
              <span className="text-[var(--c-text-3)] text-[12px]">希望単価 </span>
              <span className="text-[var(--c-text)] text-[14px] font-semibold">
                ¥{c.price_min.toLocaleString()} 〜
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
