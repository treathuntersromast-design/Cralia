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
import Link from 'next/link'
import type { Creator } from '@/app/search/page'

import { CREATOR_TYPES, SKILL_SUGGESTIONS } from '@/lib/constants/lists'

const AVAIL_OPTIONS = [
  { value: 'open',     label: '受付中',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  { value: 'one_slot', label: '要相談',      color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { value: 'full',     label: '現在対応不可', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
]

const AVAIL_MAP: Record<string, { label: string; color: string; bg: string }> = {
  open:     { label: '受付中',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  one_slot: { label: '要相談',      color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  full:     { label: '現在対応不可', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const filterLabelStyle: React.CSSProperties = {
  color: 'var(--c-text-3)', fontSize: '12px', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.06em',
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

  const [query,         setQuery]         = useState(initialQ)
  const [idQuery,       setIdQuery]       = useState(initialId)
  const [searchMode,    setSearchMode]    = useState<'keyword' | 'id'>(initialId ? 'id' : 'keyword')
  const [selectedType,  setSelectedType]  = useState(initialType)
  const [selectedAvail, setSelectedAvail] = useState(initialAvailability)
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialSkills)
  const [page, setPage] = useState(1)

  // 現在の全フィルター状態を URL に書き込む
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

  // アンマウント時に debounce タイマーをクリア
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // フィルター変更時はページをリセット
  useEffect(() => { setPage(1) }, [query, idQuery, searchMode, selectedSkills])

  // テキスト入力はデバウンスして URL 更新
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

  // プロフィールリンクに付与する back URL（現在の検索状態を保存）
  // filtered.map 内で毎回生成せず1回だけ計算する
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
    // IDモード：display_id が完全一致するものだけ表示
    if (searchMode === 'id' && idQuery.trim()) {
      return creators.filter((c) => c.display_id === idQuery.trim())
    }
    return creators.filter((c) => {
      // キーワード検索（名前・スキル・タイプ・自己紹介）
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        const hit =
          (c.display_name ?? '').toLowerCase().includes(q) ||
          (c.skills ?? []).some((s) => s.toLowerCase().includes(q)) ||
          (c.creator_type ?? []).some((t) => t.toLowerCase().includes(q)) ||
          (c.bio ?? '').toLowerCase().includes(q)
        if (!hit) return false
      }
      // スキルフィルター
      if (selectedSkills.length > 0) {
        if (!selectedSkills.some((s) => (c.skills ?? []).includes(s))) return false
      }
      return true
    })
  }, [creators, query, idQuery, searchMode, selectedSkills])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>

      {/* タイトル */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px' }}>
          クリエイターを探す
        </h1>
        <p style={{ color: 'var(--c-text-3)', fontSize: '14px', margin: 0 }}>
          {filtered.length} 人のクリエイターが見つかりました
          {totalPages > 1 && <span style={{ marginLeft: '8px' }}>（{page} / {totalPages} ページ）</span>}
        </p>
      </div>

      {/* 検索モード切替 + 検索バー */}
      <div style={{ marginBottom: '28px' }}>
        {/* タブ */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
          {(['keyword', 'id'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSearchMode(mode)}
              style={{
                padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                border: searchMode === mode ? 'none' : '1px solid var(--c-border-2)',
                background: searchMode === mode ? 'var(--c-accent-a20)' : 'transparent',
                color: searchMode === mode ? 'var(--c-accent)' : 'var(--c-text-3)', cursor: 'pointer',
              }}
            >
              {mode === 'keyword' ? '🔍 キーワード検索' : '🔢 ID検索'}
            </button>
          ))}
        </div>

        {searchMode === 'keyword' ? (
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="名前・スキル・クリエイタータイプ・自己紹介で検索..."
              style={{
                width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px',
                border: '1px solid var(--c-accent-a25)', background: 'var(--c-input-bg)',
                color: 'var(--c-text)', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {query && (
              <button type="button" onClick={() => handleQueryChange('')}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--c-text-3)', cursor: 'pointer', fontSize: '18px' }}>
                ×
              </button>
            )}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', pointerEvents: 'none' }}>🔢</span>
            <input
              type="text"
              value={idQuery}
              onChange={(e) => handleIdChange(e.target.value)}
              placeholder="8桁のユーザーIDを入力（例: 00123456）"
              maxLength={8}
              style={{
                width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px',
                border: '1px solid var(--c-accent-a25)', background: 'var(--c-input-bg)',
                color: 'var(--c-text)', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                fontFamily: 'monospace', letterSpacing: '0.1em',
              }}
            />
            {idQuery && (
              <button type="button" onClick={() => { setIdQuery(''); pushUrl('', '', '', '', []) }}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--c-text-3)', cursor: 'pointer', fontSize: '18px' }}>
                ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* フィルターパネル */}
      <div style={{
        background: 'var(--c-surface-2)',
        border: '1px solid var(--c-accent-a12)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}>
        {/* 受付状況 */}
        <div>
          <p style={filterLabelStyle}>受付状況</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {AVAIL_OPTIONS.map((opt) => {
              const active = selectedAvail === opt.value
              return (
                <button key={opt.value} type="button" onClick={() => toggleAvail(opt.value)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                    border: active ? `2px solid ${opt.color}` : '1px solid rgba(255,255,255,0.12)',
                    background: active ? opt.bg : 'var(--c-input-bg-2)',
                    color: active ? opt.color : 'var(--c-text-2)', fontWeight: active ? '700' : '400',
                  }}>
                  ● {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* クリエイタータイプ */}
        <div>
          <p style={filterLabelStyle}>クリエイタータイプ</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {CREATOR_TYPES.map((t) => {
              const active = selectedType === t
              return (
                <button key={t} type="button" onClick={() => toggleType(t)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                    border: active ? '2px solid var(--c-accent)' : '1px solid var(--c-border-2)',
                    background: active ? 'var(--c-accent-a20)' : 'var(--c-input-bg-2)',
                    color: active ? 'var(--c-accent)' : 'var(--c-text-2)', fontWeight: active ? '700' : '400',
                  }}>
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* スキル */}
        <div>
          <p style={filterLabelStyle}>
            スキル
            {selectedSkills.length > 0 && (
              <button type="button" onClick={clearSkills}
                style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'var(--c-accent-alt)', fontSize: '11px', cursor: 'pointer', padding: 0 }}>
                クリア
              </button>
            )}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {SKILL_SUGGESTIONS.map((s) => {
              const active = selectedSkills.includes(s)
              return (
                <button key={s} type="button" onClick={() => toggleSkill(s)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                    border: active ? '2px solid var(--c-accent-alt)' : '1px solid var(--c-border-2)',
                    background: active ? 'var(--c-alt-a15)' : 'var(--c-input-bg-2)',
                    color: active ? 'var(--c-accent-alt)' : 'var(--c-text-2)', fontWeight: active ? '700' : '400',
                  }}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 結果グリッド */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--c-text-3)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <p style={{ fontSize: '16px', margin: 0 }}>条件に一致するクリエイターが見つかりませんでした</p>
          <p style={{ fontSize: '13px', margin: '8px 0 0', color: 'var(--c-text-4)' }}>検索ワードやフィルターを変えてみてください</p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {paged.map((c) => (
              <CreatorCard key={c.creator_id} creator={c} backUrl={backUrl} />
            ))}
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
                      border: page === p ? '2px solid var(--c-accent-a50)' : '1px solid var(--c-border-2)',
                      background: page === p ? 'var(--c-accent-a20)' : 'transparent',
                      color: page === p ? 'var(--c-accent)' : 'var(--c-text-2)', cursor: 'pointer',
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

function CreatorCard({ creator: c, backUrl }: { creator: Creator; backUrl: string }) {
  const avail = AVAIL_MAP[c.availability] ?? AVAIL_MAP.open
  const initial = c.display_name?.[0]?.toUpperCase() ?? '?'

  return (
    <Link href={`/profile/${c.creator_id}?back=${backUrl}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-accent-a15)',
          borderRadius: '20px',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--c-accent-a40)'
          el.style.background = 'var(--c-surface-r)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--c-accent-a15)'
          el.style.background = 'var(--c-surface)'
        }}
      >
        {/* ポートフォリオサムネ（最大2枚） */}
        {c.thumbnails.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: c.thumbnails.length >= 2 ? '1fr 1fr' : '1fr', gap: '2px' }}>
            {c.thumbnails.slice(0, 2).map((thumb, i) => (
              <img
                key={i}
                src={thumb}
                alt=""
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
              />
            ))}
          </div>
        )}

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {/* アバター + 名前 + 受付状況 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
              overflow: 'hidden',
              background: 'var(--c-grad-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '17px', fontWeight: '700', color: '#fff',
            }}>
              {c.avatar_url
                ? <img src={c.avatar_url} alt={c.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initial}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.display_name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--c-text-3)', marginTop: '1px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>{c.entity_type === 'corporate' ? '法人・団体' : '個人'}</span>
                {c.display_id && (
                  <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em', color: 'var(--c-text-4)' }}>
                    ID: {c.display_id}
                  </span>
                )}
              </div>
            </div>
            <span style={{
              padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
              color: avail.color, background: avail.bg, flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              ● {avail.label}
            </span>
          </div>

          {/* クリエイタータイプ */}
          {(c.creator_type ?? []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {(c.creator_type ?? []).slice(0, 3).map((t) => (
                <span key={t} style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '12px',
                  background: 'var(--c-accent-a15)', color: 'var(--c-accent)', fontWeight: '600',
                }}>
                  {t}
                </span>
              ))}
              {(c.creator_type ?? []).length > 3 && (
                <span style={{ color: 'var(--c-text-3)', fontSize: '12px', alignSelf: 'center' }}>+{(c.creator_type ?? []).length - 3}</span>
              )}
            </div>
          )}

          {/* スキル */}
          {(c.skills ?? []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {(c.skills ?? []).slice(0, 4).map((s) => (
                <span key={s} style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '12px',
                  border: '1px solid var(--c-border-2)', color: 'var(--c-text-2)',
                }}>
                  {s}
                </span>
              ))}
              {(c.skills ?? []).length > 4 && (
                <span style={{ color: 'var(--c-text-3)', fontSize: '12px', alignSelf: 'center' }}>+{(c.skills ?? []).length - 4}</span>
              )}
            </div>
          )}

          {/* bio */}
          {c.bio && (
            <p style={{
              color: 'var(--c-text-2)', fontSize: '13px', lineHeight: '1.6', margin: 0,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {c.bio}
            </p>
          )}

          {/* 価格 */}
          {c.price_min != null && c.price_min >= 0 && (
            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--c-border)', marginTop: 'auto' }}>
              <span style={{ color: 'var(--c-text-3)', fontSize: '12px' }}>希望単価 </span>
              <span style={{ color: 'var(--c-text)', fontSize: '14px', fontWeight: '600' }}>
                ¥{c.price_min.toLocaleString()} 〜
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
