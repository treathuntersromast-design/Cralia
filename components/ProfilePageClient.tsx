'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { Pencil, X, Plus, Star, ExternalLink, Globe, AlertTriangle, Mail } from 'lucide-react'
import AvatarUpload from './AvatarUpload'
import AvailabilityEditor from './AvailabilityEditor'
import EvaluationReportModal from './EvaluationReportModal'
import { Button } from '@/components/ui/Button'
import {
  CREATOR_TYPES, SKILL_SUGGESTIONS,
  SNS_PLATFORMS, SNS_BASE_URLS,
  PORTFOLIO_PLATFORMS,
} from '@/lib/constants/lists'
import { VALIDATION } from '@/lib/constants/validation'

const PLATFORMS             = PORTFOLIO_PLATFORMS.map((p) => p.label)
const PLATFORM_PLACEHOLDERS = Object.fromEntries(PORTFOLIO_PLATFORMS.map((p) => [p.label, p.placeholder]))

interface Portfolio { platform: string; url: string; title: string; thumbnail_url?: string }
interface SnsEntry  { platform: string; id: string }

interface Props {
  profileId: string
  isOwner: boolean
  avatarUrl: string | null
  displayName: string
  entityType: string
  creatorTypes: string[]
  bio: string | null
  availability: 'open' | 'one_slot' | 'full'
  skills: string[]
  priceMin: number | null
  priceNote: string | null
  deliveryDays: string | null
  portfolios: Portfolio[]
  snsLinks: SnsEntry[]
  roles: string[]
  companyName: string | null
  hasCorporateNumber: boolean
  invoiceNumber: string | null
  hasActiveReceivedOrders: boolean
  hasActiveSentOrders: boolean
  lastSeen: string
  evalAsCreator: { count: number; avg: number | null }
  evalAsClient:  { count: number; avg: number | null }
  evalAsMember:  { count: number; avg: number | null }
  recentReviews: { id: string; rating: number; comment: string | null; created_at: string; review_type: string }[]
}

const inputCls    = 'w-full h-10 px-3.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] placeholder:text-[var(--c-text-4)] focus-visible:border-brand outline-none transition-colors'
const textareaCls = 'w-full px-3.5 py-2.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] placeholder:text-[var(--c-text-4)] focus-visible:border-brand outline-none transition-colors resize-vertical'
const selectCls   = 'h-10 px-3 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus-visible:border-brand transition-colors'

const AVAIL_MAP: Record<string, { label: string; cls: string }> = {
  open:     { label: '受付中',       cls: 'text-[#16a34a] bg-[#4ade80]/12' },
  one_slot: { label: '要相談',       cls: 'text-[#d97706] bg-[#fbbf24]/12' },
  full:     { label: '現在対応不可', cls: 'text-[#dc2626] bg-[#f87171]/12' },
}

type Section = 'header' | 'roles' | 'skills' | 'pricing' | 'portfolios' | 'sns' | 'homepage' | null

export default function ProfilePageClient(props: Props) {
  const [editing, setEditing] = useState<Section>(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [displayName, setDisplayName] = useState(props.displayName)
  const [creatorTypes, setCreatorTypes] = useState<string[]>(props.creatorTypes)
  const [otherType, setOtherType] = useState(() => {
    const o = props.creatorTypes.find((t) => t.startsWith('その他（'))
    return o ? o.replace(/^その他（(.+)）$/, '$1') : ''
  })
  const [bio, setBio] = useState(props.bio ?? '')

  const [skills, setSkills]         = useState<string[]>(props.skills)
  const [skillInput, setSkillInput] = useState('')

  const [priceMin, setPriceMin]       = useState(props.priceMin != null ? String(props.priceMin) : '')
  const [priceNote, setPriceNote]     = useState(props.priceNote ?? '')
  const [deliveryDays, setDeliveryDays] = useState(props.deliveryDays ?? '')

  const [portfolios, setPortfolios]   = useState<Portfolio[]>(props.portfolios)
  const [fetchingIdx, setFetchingIdx] = useState<number | null>(null)

  const [roles, setRoles] = useState<string[]>(props.roles)

  const [homepageUrl, setHomepageUrl] = useState(() =>
    props.snsLinks.find((s) => s.platform === 'ホームページ')?.id ?? ''
  )
  const [snsLinks, setSnsLinks] = useState<SnsEntry[]>(
    props.snsLinks.filter((s) => s.platform !== 'ホームページ')
  )

  const committed = useRef({
    displayName: props.displayName,
    creatorTypes: props.creatorTypes,
    roles: props.roles,
    otherType: (() => {
      const o = props.creatorTypes.find((t) => t.startsWith('その他（'))
      return o ? o.replace(/^その他（(.+)）$/, '$1') : ''
    })(),
    bio: props.bio ?? '',
    skills: props.skills,
    priceMin: props.priceMin != null ? String(props.priceMin) : '',
    priceNote: props.priceNote ?? '',
    deliveryDays: props.deliveryDays ?? '',
    portfolios: props.portfolios,
    homepageUrl: props.snsLinks.find((s) => s.platform === 'ホームページ')?.id ?? '',
    snsLinks: props.snsLinks.filter((s) => s.platform !== 'ホームページ'),
  })

  const startEdit = (section: Section) => {
    if (editing && editing !== section) cancelEdit()
    setEditing(section)
    setError(null)
  }
  const cancelEdit = () => {
    if (saving) return
    const c = committed.current
    setDisplayName(c.displayName)
    setCreatorTypes(c.creatorTypes)
    setOtherType(c.otherType)
    setBio(c.bio)
    setRoles(c.roles)
    setSkills(c.skills)
    setSkillInput('')
    setPriceMin(c.priceMin)
    setPriceNote(c.priceNote)
    setDeliveryDays(c.deliveryDays)
    setPortfolios(c.portfolios)
    setHomepageUrl(c.homepageUrl)
    setSnsLinks(c.snsLinks)
    setEditing(null)
    setError(null)
  }

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/profile/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? '更新に失敗しました')
  }

  const saveHeader = async () => {
    setSaving(true); setError(null)
    try {
      const normalizedTypes = creatorTypes.map((t) =>
        t === 'その他' && otherType.trim() ? `その他（${otherType.trim()}）` : t
      )
      const rolesChanged =
        JSON.stringify([...roles].sort()) !== JSON.stringify([...committed.current.roles].sort())

      if (rolesChanged) {
        const removingCreator = committed.current.roles.includes('creator') && !roles.includes('creator')
        const removingClient  = committed.current.roles.includes('client')  && !roles.includes('client')

        if (removingCreator && props.hasActiveReceivedOrders) {
          setError('未完了の受注依頼があるため、クリエイターの役割を外せません。受注依頼をすべて完了してから変更してください。')
          setSaving(false); return
        }
        if (removingClient && props.hasActiveSentOrders) {
          setError('未完了の発注依頼があるため、依頼者の役割を外せません。発注依頼をすべて完了してから変更してください。')
          setSaving(false); return
        }

        const confirmed = window.confirm(
          '活動スタイルを変更します。\n\n変更後はプロフィールの表示や機能が変わることがあります。\n続けてもよろしいですか？'
        )
        if (!confirmed) { setSaving(false); return }
      }

      await patch({ displayName, creatorTypes: normalizedTypes, bio })

      if (rolesChanged) {
        const res = await fetch('/api/profile/roles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roles, previousRoles: committed.current.roles }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? '活動スタイルの更新に失敗しました')
      }

      committed.current = {
        ...committed.current,
        displayName, creatorTypes: normalizedTypes, otherType: otherType.trim(), bio, roles,
      }
      setEditing(null)
    } catch (e) { setError(e instanceof Error ? e.message : '更新に失敗しました') }
    finally { setSaving(false) }
  }

  const addSkill = (s: string) => {
    const t = s.trim()
    if (!t || t.length > VALIDATION.SKILL_TAG_MAX || skills.length >= VALIDATION.SKILLS_MAX) return
    if (skills.some((x) => x.toLowerCase() === t.toLowerCase())) return
    setSkills((prev) => [...prev, t])
    setSkillInput('')
  }
  const saveSkills = async () => {
    setSaving(true); setError(null)
    try {
      await patch({ skills })
      committed.current = { ...committed.current, skills }
      setEditing(null)
    }
    catch (e) { setError(e instanceof Error ? e.message : '更新に失敗しました') }
    finally { setSaving(false) }
  }

  const savePricing = async () => {
    setSaving(true); setError(null)
    try {
      await patch({ priceMin, priceNote, deliveryDays })
      committed.current = { ...committed.current, priceMin, priceNote, deliveryDays }
      setEditing(null)
    }
    catch (e) { setError(e instanceof Error ? e.message : '更新に失敗しました') }
    finally { setSaving(false) }
  }

  const fetchOEmbed = async (index: number, url: string) => {
    const supported = ['youtube.com', 'youtu.be', 'nicovideo.jp', 'pixiv.net', 'x.com', 'twitter.com', 'instagram.com']
    if (!supported.some((d) => url.includes(d))) return
    setFetchingIdx(index)
    try {
      const res = await fetch(`/api/portfolio/oembed?url=${encodeURIComponent(url)}`)
      if (!res.ok) return
      const data = await res.json()
      setPortfolios((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], title: data.title ?? next[index].title, thumbnail_url: data.thumbnail_url ?? undefined }
        return next
      })
    } catch { /* ネットワークエラーはサイレント無視 */ }
    finally { setFetchingIdx(null) }
  }
  const savePortfolios = async () => {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/profile/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolios }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '更新に失敗しました')
      committed.current = { ...committed.current, portfolios }
      setEditing(null)
    } catch (e) { setError(e instanceof Error ? e.message : '更新に失敗しました') }
    finally { setSaving(false) }
  }

  const saveHomepage = async () => {
    setSaving(true); setError(null)
    try {
      const combined = [
        ...snsLinks,
        ...(homepageUrl.trim() ? [{ platform: 'ホームページ', id: homepageUrl.trim() }] : []),
      ]
      await patch({ snsLinks: combined })
      committed.current = { ...committed.current, homepageUrl: homepageUrl.trim() }
      setEditing(null)
    } catch (e) { setError(e instanceof Error ? e.message : '更新に失敗しました') }
    finally { setSaving(false) }
  }

  const saveSns = async () => {
    setSaving(true); setError(null)
    try {
      const combined = [
        ...snsLinks,
        ...(homepageUrl.trim() ? [{ platform: 'ホームページ', id: homepageUrl.trim() }] : []),
      ]
      await patch({ snsLinks: combined })
      committed.current = { ...committed.current, snsLinks }
      setEditing(null)
    } catch (e) { setError(e instanceof Error ? e.message : '更新に失敗しました') }
    finally { setSaving(false) }
  }

  const avail = AVAIL_MAP[props.availability] ?? AVAIL_MAP.open

  return (
    <div className="max-w-[720px] mx-auto px-6 py-10">

      {/* ===== プロフィールヘッダー ===== */}
      <div className="rounded-card border border-[var(--c-border)] bg-[var(--c-surface)] p-6 mb-5">
        {editing === 'header' ? (
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <AvatarUpload currentUrl={props.avatarUrl} displayName={displayName} size={80} />
            </div>

            {/* 表示名 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--c-text-2)]">表示名</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={30}
                className={inputCls}
              />
              <p className="text-[12px] text-[var(--c-text-3)]">{displayName.length}/30</p>
            </div>

            {/* 活動スタイル */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[var(--c-text-2)]">活動スタイル</label>
              <div className="flex gap-2">
                {([
                  { value: 'creator', label: 'クリエイター', desc: '依頼を受ける' },
                  { value: 'client',  label: '依頼者',       desc: '依頼を送る'  },
                ] as const).map(({ value, label, desc }) => {
                  const active = roles.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRoles((prev) =>
                        prev.includes(value)
                          ? prev.length > 1 ? prev.filter((r) => r !== value) : prev
                          : [...prev, value]
                      )}
                      className={clsx(
                        'flex-1 p-3 rounded-[10px] text-left transition-colors border-2',
                        active
                          ? 'border-brand bg-brand-soft'
                          : 'border-[var(--c-border)] bg-transparent hover:bg-[var(--c-surface-2)]',
                      )}
                    >
                      <p className={clsx('font-bold text-[13px] mb-0.5', active ? 'text-brand' : 'text-[var(--c-text)]')}>{label}</p>
                      <p className="text-[11px] text-[var(--c-text-3)]">{desc}</p>
                    </button>
                  )
                })}
              </div>
              <p className="flex items-center gap-1.5 text-[12px] text-[#d97706]">
                <AlertTriangle size={13} aria-hidden="true" />
                ロールの変更は保存時に確認ダイアログを表示します
              </p>
            </div>

            {/* クリエイタータイプ */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[var(--c-text-2)]">クリエイタータイプ</label>
              <div className="flex flex-wrap gap-2">
                {CREATOR_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCreatorTypes((prev) =>
                      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                    )}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-full text-[13px] transition-colors border',
                      creatorTypes.includes(t)
                        ? 'border-brand bg-brand-soft text-brand font-semibold'
                        : 'border-[var(--c-border)] text-[var(--c-text-2)] hover:border-brand/50',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {creatorTypes.includes('その他') && (
                <input
                  value={otherType}
                  onChange={(e) => setOtherType(e.target.value)}
                  maxLength={50}
                  placeholder="具体的な活動内容（例: 作詞家、声優）"
                  className={inputCls}
                />
              )}
            </div>

            {/* 自己紹介 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--c-text-2)]">自己紹介（400文字以内）</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={400}
                rows={5}
                placeholder="あなたの活動やスタイルを紹介してください。"
                className={textareaCls}
              />
              <p className="text-[12px] text-[var(--c-text-3)]">{bio.length}/400</p>
            </div>

            <EditActions onSave={saveHeader} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <AvatarUpload currentUrl={props.avatarUrl} displayName={displayName} size={80} readonly />
            <div className="flex-1 min-w-0">

              <span className={clsx('inline-block px-3 py-1 rounded-full text-[12px] font-bold mb-3', avail.cls)}>
                {avail.label}
              </span>
              <h1 className="text-[26px] font-extrabold text-[var(--c-text)] mb-4">{displayName}</h1>

              <div className="flex flex-col gap-2.5 mb-5">

                {/* 個人 / 法人 */}
                <div className="flex items-start gap-3">
                  <span className="text-[11px] font-bold text-[var(--c-text-3)] tracking-wider min-w-[88px] shrink-0 pt-1">個人 / 法人</span>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-0.5 rounded-full text-[12px] bg-[var(--c-surface-2)] border border-[var(--c-border)] text-[var(--c-text-2)]">
                        {props.entityType}
                      </span>
                      {props.hasCorporateNumber && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eff6ff] text-brand border border-brand/25">
                          ✓ 法人番号登録済み
                        </span>
                      )}
                    </div>
                    {props.companyName && (
                      <span className="text-[12px] text-[var(--c-text-2)] pl-0.5">{props.companyName}</span>
                    )}
                  </div>
                </div>

                {/* インボイス */}
                {props.invoiceNumber && (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-[var(--c-text-3)] tracking-wider min-w-[88px] shrink-0">インボイス</span>
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[12px] bg-[#f0fdf4] text-[#16a34a] border border-[#4ade80]/40 font-mono tracking-wide">
                      ✓ {props.invoiceNumber}
                    </span>
                  </div>
                )}

                {/* 活動スタイル */}
                {roles.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] font-bold text-[var(--c-text-3)] tracking-wider min-w-[88px] shrink-0">活動スタイル</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {roles.includes('creator') && (
                        <span className="px-3 py-0.5 rounded-full text-[12px] font-semibold bg-brand-soft text-brand border border-brand/25">
                          クリエイター
                        </span>
                      )}
                      {roles.includes('client') && (
                        <span className="px-3 py-0.5 rounded-full text-[12px] font-semibold bg-[var(--c-surface-2)] text-[var(--c-text-2)] border border-[var(--c-border)]">
                          依頼者
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* クリエイタータイプ */}
                {creatorTypes.length > 0 && (
                  <div className="flex items-start gap-3 flex-wrap">
                    <span className="text-[11px] font-bold text-[var(--c-text-3)] tracking-wider min-w-[88px] shrink-0 pt-1">タイプ</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {creatorTypes
                        .filter((t) => !t.startsWith('その他（'))
                        .concat(creatorTypes.filter((t) => t.startsWith('その他（')))
                        .map((type) => (
                          <span key={type} className="px-3 py-0.5 rounded-full text-[12px] bg-brand/6 text-brand border border-brand/20">
                            {type}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

              </div>

              {bio ? (
                <div className="border-t border-[var(--c-border)] pt-4">
                  <p className="text-[11px] font-bold text-[var(--c-text-3)] tracking-wider mb-2">自己紹介</p>
                  <p className="text-[14px] text-[var(--c-text)] leading-relaxed whitespace-pre-wrap">{bio}</p>
                </div>
              ) : props.isOwner ? (
                <p className="text-[14px] text-[var(--c-text-3)] italic">自己紹介が未入力です</p>
              ) : null}

            </div>

            <div className="shrink-0 flex flex-col gap-2 items-end">
              {props.isOwner ? (
                <button
                  type="button"
                  onClick={() => startEdit('header')}
                  className="inline-flex items-center gap-1 text-[12px] text-brand border border-brand/30 px-3 py-1 rounded-full hover:bg-brand/5 transition-colors"
                >
                  <Pencil size={12} aria-hidden="true" /> 編集
                </button>
              ) : (
                <Link
                  href={`/orders/new?creator=${props.profileId}&creatorName=${encodeURIComponent(props.displayName)}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-brand text-white text-[14px] font-bold hover:bg-brand-ink transition-colors no-underline"
                >
                  <Mail size={15} aria-hidden="true" />
                  依頼する
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== 依頼受付状況 ===== */}
      <SectionCard title="依頼受付状況">
        <AvailabilityEditor current={props.availability} isOwner={props.isOwner} lastSeen={props.lastSeen} />
      </SectionCard>

      {/* ===== スキル ===== */}
      <SectionCard title="スキル" onEdit={props.isOwner ? () => startEdit('skills') : undefined} isEditing={editing === 'skills'}>
        {editing === 'skills' ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] min-h-[48px]">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[13px]">
                  {s}
                  <button
                    type="button"
                    onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                    className="text-brand/70 hover:text-brand leading-none"
                    aria-label={`${s}を削除`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {skills.length < VALIDATION.SKILLS_MAX && (
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) }
                    if (e.key === 'Backspace' && skillInput === '' && skills.length > 0) setSkills((prev) => prev.slice(0, -1))
                  }}
                  placeholder={skills.length === 0 ? 'スキルを入力して Enter' : ''}
                  className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-[var(--c-text)] text-[14px] px-1 py-0.5"
                />
              )}
            </div>
            <p className="text-[12px] text-[var(--c-text-3)]">{skills.length}/{VALIDATION.SKILLS_MAX}個</p>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_SUGGESTIONS
                .filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase()))
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSkill(s)}
                    className="inline-flex items-center gap-0.5 px-3 py-1 rounded-full border border-dashed border-[var(--c-border)] text-[var(--c-text-3)] text-[12px] hover:border-brand hover:text-brand transition-colors"
                  >
                    <Plus size={11} aria-hidden="true" />{s}
                  </button>
                ))}
            </div>
            <EditActions onSave={saveSkills} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="px-3.5 py-1.5 rounded-full text-[13px] border border-brand/25 text-brand bg-brand/6">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-[var(--c-text-3)] italic">スキルが未登録です</p>
        )}
      </SectionCard>

      {/* ===== 希望条件 ===== */}
      <SectionCard title="希望条件" onEdit={props.isOwner ? () => startEdit('pricing') : undefined} isEditing={editing === 'pricing'}>
        {editing === 'pricing' ? (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--c-text-2)]">希望単価（目安）</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceMin}
                  onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setPriceMin(v) }}
                  placeholder="5000"
                  className={clsx(inputCls, 'pr-8')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text-3)] text-[13px]">円</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--c-text-2)]">単価の補足</label>
              <textarea
                value={priceNote}
                onChange={(e) => setPriceNote(e.target.value)}
                rows={3}
                placeholder="例）10分を超える動画の場合10,000円加算　など"
                className={textareaCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--c-text-2)]">納品にかかる期間</label>
              <input
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                maxLength={30}
                placeholder="例: 2〜4週間"
                className={inputCls}
              />
            </div>
            <EditActions onSave={savePricing} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : (priceMin !== '' || priceNote || deliveryDays) ? (
          <div className="flex flex-col gap-3">
            {priceMin !== '' && (
              <Row label="希望単価">
                <span className="text-[var(--c-text)] text-[15px] font-semibold">¥{parseInt(priceMin).toLocaleString()} 〜</span>
              </Row>
            )}
            {priceNote && (
              <Row label="単価補足">
                <span className="text-[var(--c-text)] text-[14px] leading-relaxed whitespace-pre-wrap">{priceNote}</span>
              </Row>
            )}
            {deliveryDays && (
              <Row label="納品期間">
                <span className="text-[var(--c-text)] text-[14px]">{deliveryDays}</span>
              </Row>
            )}
          </div>
        ) : (
          <p className="text-[14px] text-[var(--c-text-3)] italic">希望条件が未設定です</p>
        )}
      </SectionCard>

      {/* ===== ポートフォリオ ===== */}
      <SectionCard title="ポートフォリオ" onEdit={props.isOwner ? () => startEdit('portfolios') : undefined} isEditing={editing === 'portfolios'}>
        {editing === 'portfolios' ? (
          <div className="flex flex-col gap-3">
            {portfolios.map((p, i) => (
              <div key={i} className="p-3.5 rounded-[10px] border border-[var(--c-border)] bg-[var(--c-surface-2)]">
                <div className="flex gap-2 mb-2">
                  <select
                    value={p.platform}
                    title="プラットフォーム"
                    onChange={(e) => setPortfolios((prev) => {
                      const next = [...prev]
                      next[i] = { platform: e.target.value, url: '', title: '', thumbnail_url: undefined }
                      return next
                    })}
                    className={clsx(selectCls, 'flex-none w-[130px]')}
                  >
                    {PLATFORMS.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setPortfolios((prev) => prev.filter((_, j) => j !== i))}
                    className="p-2 text-[#dc2626] hover:bg-[#fef2f2] rounded-[6px] transition-colors"
                    aria-label="削除"
                  >
                    <X size={16} />
                  </button>
                </div>
                <input
                  type="url"
                  value={p.url}
                  onChange={(e) => setPortfolios((prev) => {
                    const next = [...prev]
                    next[i] = { ...next[i], url: e.target.value, title: '', thumbnail_url: undefined }
                    return next
                  })}
                  onBlur={(e) => fetchOEmbed(i, e.target.value)}
                  placeholder={PLATFORM_PLACEHOLDERS[p.platform] ?? 'https://...'}
                  className={clsx(inputCls, 'mb-2')}
                />
                {fetchingIdx === i && (
                  <p className="text-[12px] text-[var(--c-text-3)] mb-2">取得中...</p>
                )}
                {p.thumbnail_url && fetchingIdx !== i && (
                  <div className="flex items-center gap-2.5 mb-2">
                    <img src={p.thumbnail_url} alt="" className="w-20 h-[45px] object-cover rounded-[4px]" />
                    <span className="text-[12px] text-[var(--c-text-3)]">サムネイル取得済み</span>
                  </div>
                )}
                <input
                  type="text"
                  value={p.title}
                  onChange={(e) => setPortfolios((prev) => {
                    const next = [...prev]
                    next[i] = { ...next[i], title: e.target.value }
                    return next
                  })}
                  placeholder="タイトル"
                  maxLength={100}
                  className={inputCls}
                />
              </div>
            ))}
            {portfolios.length < VALIDATION.PORTFOLIOS_MAX && (
              <button
                type="button"
                onClick={() => setPortfolios((prev) => [...prev, { platform: 'YouTube', url: '', title: '' }])}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] border border-dashed border-brand/30 text-brand text-[13px] hover:bg-brand/5 transition-colors"
              >
                <Plus size={14} aria-hidden="true" /> ポートフォリオを追加
              </button>
            )}
            <EditActions onSave={savePortfolios} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : portfolios.length > 0 ? (
          <div className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {portfolios.map((p, i) => {
              let safeUrl = '#'
              try { const u = new URL(p.url); if (u.protocol === 'https:' || u.protocol === 'http:') safeUrl = p.url } catch { /* invalid */ }
              return (
                <a
                  key={i}
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-[10px] border border-[var(--c-border)] bg-[var(--c-surface)] hover:border-brand transition-colors no-underline overflow-hidden"
                  aria-label={`${p.title || p.platform}を開く`}
                >
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt={p.title || p.platform} className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="w-full aspect-video bg-brand-soft flex items-center justify-center">
                      <ExternalLink size={28} className="text-brand/40" aria-hidden="true" />
                    </div>
                  )}
                  <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="overflow-hidden">
                      <div className="text-[13px] font-semibold text-[var(--c-text)] truncate">{p.title || p.url}</div>
                      <div className="text-[11px] text-[var(--c-text-3)] mt-0.5">{p.platform}</div>
                    </div>
                    <ExternalLink size={13} className="text-[var(--c-text-4)] shrink-0" aria-hidden="true" />
                  </div>
                </a>
              )
            })}
          </div>
        ) : (
          <p className="text-[14px] text-[var(--c-text-3)] italic">ポートフォリオが未登録です</p>
        )}
      </SectionCard>

      {/* ===== ホームページ ===== */}
      <SectionCard title="ホームページ" onEdit={props.isOwner ? () => startEdit('homepage') : undefined} isEditing={editing === 'homepage'}>
        {editing === 'homepage' ? (
          <div className="flex flex-col gap-2.5">
            <input
              type="url"
              value={homepageUrl}
              onChange={(e) => setHomepageUrl(e.target.value)}
              placeholder="https://example.com"
              maxLength={200}
              className={inputCls}
            />
            <EditActions onSave={saveHomepage} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : homepageUrl.trim() ? (
          <a
            href={homepageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-brand text-[14px] hover:underline break-all"
          >
            <Globe size={15} aria-hidden="true" />
            {homepageUrl}
          </a>
        ) : (
          <p className="text-[14px] text-[var(--c-text-3)] italic">ホームページが未登録です</p>
        )}
      </SectionCard>

      {/* ===== SNS ===== */}
      <SectionCard title="SNS" onEdit={props.isOwner ? () => startEdit('sns') : undefined} isEditing={editing === 'sns'}>
        {editing === 'sns' ? (
          <div className="flex flex-col gap-2.5">
            {snsLinks.map((s, i) => {
              const meta = SNS_PLATFORMS.find((p) => p.label === s.platform) ?? SNS_PLATFORMS[0]
              return (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={s.platform}
                    title="SNSプラットフォーム"
                    onChange={(e) => setSnsLinks((prev) => {
                      const next = [...prev]; next[i] = { platform: e.target.value, id: '' }; return next
                    })}
                    className={clsx(selectCls, 'w-[140px] shrink-0')}
                  >
                    {SNS_PLATFORMS.map(({ label }) => <option key={label} value={label}>{label}</option>)}
                  </select>
                  <div className="flex items-center flex-1 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] overflow-hidden">
                    {meta.prefix && (
                      <span className="px-2.5 py-2 text-[var(--c-text-3)] text-[12px] whitespace-nowrap border-r border-[var(--c-border)] shrink-0">
                        {meta.prefix}
                      </span>
                    )}
                    <input
                      type="text"
                      value={s.id}
                      onChange={(e) => setSnsLinks((prev) => {
                        const next = [...prev]; next[i] = { ...next[i], id: e.target.value.replace(/^@/, '') }; return next
                      })}
                      placeholder={meta.placeholder}
                      maxLength={100}
                      className="flex-1 h-10 px-3 bg-transparent border-none outline-none text-[var(--c-text)] text-[14px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSnsLinks((prev) => prev.filter((_, j) => j !== i))}
                    className="p-2 text-[#dc2626] hover:bg-[#fef2f2] rounded-[6px] transition-colors"
                    aria-label="削除"
                  >
                    <X size={16} />
                  </button>
                </div>
              )
            })}
            {snsLinks.length < 7 && (
              <button
                type="button"
                onClick={() => setSnsLinks((prev) => [...prev, { platform: 'X (Twitter)', id: '' }])}
                className="inline-flex items-center justify-center gap-1.5 py-2 rounded-[10px] border border-dashed border-brand/30 text-brand text-[13px] hover:bg-brand/5 transition-colors"
              >
                <Plus size={14} aria-hidden="true" /> SNSを追加
              </button>
            )}
            <EditActions onSave={saveSns} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : snsLinks.filter((s) => s.id?.trim()).length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {snsLinks.filter((s) => s.id?.trim()).map((s, i) => {
              const meta = SNS_PLATFORMS.find((p) => p.label === s.platform)
              const prefix = meta?.prefix ?? ''
              return (
                <a
                  key={i}
                  href={`${SNS_BASE_URLS[s.platform] ?? '#'}${s.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-surface-2)] text-[var(--c-text)] text-[13px] hover:border-brand transition-colors no-underline"
                >
                  <span className="text-[var(--c-text-3)] text-[11px] font-medium">{s.platform}</span>
                  <span className="text-[var(--c-text-2)]">{prefix}{s.id}</span>
                </a>
              )
            })}
          </div>
        ) : (
          <p className="text-[14px] text-[var(--c-text-3)] italic">SNSが未登録です</p>
        )}
      </SectionCard>

      {/* ===== 評価 ===== */}
      <EvaluationSection
        isOwner={props.isOwner}
        evalAsCreator={props.evalAsCreator}
        evalAsClient={props.evalAsClient}
        evalAsMember={props.evalAsMember}
        recentReviews={props.recentReviews}
      />

    </div>
  )
}

// ---- 評価セクション ----

function EvaluationSection({
  isOwner,
  evalAsCreator,
  evalAsClient,
  evalAsMember,
  recentReviews,
}: {
  isOwner: boolean
  evalAsCreator: { count: number; avg: number | null }
  evalAsClient:  { count: number; avg: number | null }
  evalAsMember:  { count: number; avg: number | null }
  recentReviews: { id: string; rating: number; comment: string | null; created_at: string; review_type: string }[]
}) {
  const [reportReviewId, setReportReviewId] = useState<string | null>(null)

  const hasAnyEval = evalAsCreator.count > 0 || evalAsClient.count > 0 || evalAsMember.count > 0

  const statItems = [
    { label: 'クリエイターとして',       stat: evalAsCreator, cardCls: 'bg-brand/5 border-brand/20',               valueCls: 'text-brand' },
    { label: '依頼者として',             stat: evalAsClient,  cardCls: 'bg-[#eff6ff] border-[#bfdbfe]',            valueCls: 'text-[#2563eb]' },
    { label: 'プロジェクトメンバーとして', stat: evalAsMember,  cardCls: 'bg-[#f0fdf4] border-[#86efac]/50',         valueCls: 'text-[#16a34a]' },
  ]

  const typeLabel = (type: string) =>
    type === 'order_to_creator' ? 'クリエイターとして受けた評価'
    : type === 'order_to_client' ? '依頼者として受けた評価'
    : 'プロジェクトメンバーとして受けた評価'

  return (
    <>
      <div className="rounded-card border border-[var(--c-border)] bg-[var(--c-surface)] p-6 mb-5">
        <h2 className="text-[11px] font-bold text-[var(--c-text-3)] tracking-widest uppercase mb-5">評価</h2>

        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {statItems.map(({ label, stat, cardCls, valueCls }) => (
            <div key={label} className={clsx('rounded-[12px] border p-3.5', cardCls)}>
              <p className="text-[10px] font-bold text-[var(--c-text-3)] tracking-wider mb-1.5">{label}</p>
              {stat.count > 0 ? (
                <>
                  <p className={clsx('text-[22px] font-extrabold mb-0.5', valueCls)}>
                    {stat.avg != null ? `★${stat.avg}` : '-'}
                  </p>
                  <p className="text-[11px] text-[var(--c-text-3)]">{stat.count}件</p>
                </>
              ) : (
                <p className="text-[13px] text-[var(--c-text-3)]">評価なし</p>
              )}
            </div>
          ))}
        </div>

        {recentReviews.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {recentReviews.map((r) => (
              <div key={r.id} className="rounded-[10px] border border-[var(--c-border)] bg-[var(--c-surface-2)] p-3.5">
                <div className={clsx('flex items-center justify-between flex-wrap gap-2', r.comment && 'mb-2')}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StarDisplay rating={r.rating} />
                    <span className="text-[10px] font-semibold text-[var(--c-text-3)] px-2 py-0.5 rounded-full bg-[var(--c-surface)] border border-[var(--c-border)]">
                      {typeLabel(r.review_type)}
                    </span>
                    <span className="text-[11px] text-[var(--c-text-3)]">
                      {new Date(r.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setReportReviewId(r.id)}
                      className="px-2.5 py-0.5 rounded-full border border-[#dc2626]/30 bg-[#fef2f2]/50 text-[#dc2626] text-[11px] hover:bg-[#fef2f2] transition-colors"
                    >
                      報告する
                    </button>
                  )}
                </div>
                {r.comment && (
                  <p className="text-[13px] text-[var(--c-text)] leading-relaxed whitespace-pre-wrap">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {!hasAnyEval && (
          <p className="text-[14px] text-[var(--c-text-3)]">まだ評価がありません</p>
        )}
      </div>

      {reportReviewId && (
        <EvaluationReportModal
          reviewId={reportReviewId}
          onClose={() => setReportReviewId(null)}
        />
      )}
    </>
  )
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`評価 ${rating}/5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= rating ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-[var(--c-border-2)]'}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function SectionCard({ title, children, onEdit, isEditing }: {
  title: string; children: React.ReactNode
  onEdit?: () => void; isEditing?: boolean
}) {
  return (
    <div className="rounded-card border border-[var(--c-border)] bg-[var(--c-surface)] p-6 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-bold text-[var(--c-text-3)] tracking-widest uppercase">{title}</h2>
        {onEdit && !isEditing && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-[12px] text-brand border border-brand/30 px-3 py-1 rounded-full hover:bg-brand/5 transition-colors"
          >
            <Pencil size={12} aria-hidden="true" /> 編集
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function EditActions({ onSave, onCancel, saving, error }: {
  onSave: () => void; onCancel: () => void; saving: boolean; error: string | null
}) {
  return (
    <div className="flex flex-col gap-2 mt-1">
      {error && <p className="text-[13px] text-[#dc2626]">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="primary" size="sm" onClick={onSave} loading={saving}>保存する</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={saving}>キャンセル</Button>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-[13px] text-[var(--c-text-3)] min-w-[80px] shrink-0">{label}</span>
      <div>{children}</div>
    </div>
  )
}
