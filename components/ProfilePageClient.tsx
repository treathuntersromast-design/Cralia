'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import AvatarUpload from './AvatarUpload'
import AvailabilityEditor from './AvailabilityEditor'
import EvaluationReportModal from './EvaluationReportModal'
import {
  CREATOR_TYPES, SKILL_SUGGESTIONS,
  SNS_PLATFORMS, SNS_ICONS, SNS_BASE_URLS,
  PORTFOLIO_PLATFORMS,
} from '@/lib/constants/lists'
import { VALIDATION } from '@/lib/constants/validation'

// ポートフォリオプラットフォームを旧形式（label/placeholder分離）に変換
const PLATFORMS        = PORTFOLIO_PLATFORMS.map((p) => p.label)
const PLATFORM_PLACEHOLDERS = Object.fromEntries(PORTFOLIO_PLATFORMS.map((p) => [p.label, p.placeholder]))

// ---- 型 ----
interface Portfolio { platform: string; url: string; title: string; thumbnail_url?: string }
interface SnsEntry { platform: string; id: string }

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

// ---- スタイル ----
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(255,255,255,0.05)',
  color: '#f0eff8', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}
const editBtnStyle: React.CSSProperties = {
  padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(199,125,255,0.3)',
  background: 'rgba(199,125,255,0.08)', color: '#c77dff', fontSize: '12px', cursor: 'pointer',
}
const saveBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: '10px', border: 'none',
  background: 'var(--c-grad-primary)',
  color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
  color: '#a9a8c0', fontSize: '13px', cursor: 'pointer',
}

type Section = 'header' | 'roles' | 'skills' | 'pricing' | 'portfolios' | 'sns' | 'homepage' | null

export default function ProfilePageClient(props: Props) {
  const [editing, setEditing] = useState<Section>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ヘッダー
  const [displayName, setDisplayName] = useState(props.displayName)
  const [creatorTypes, setCreatorTypes] = useState<string[]>(props.creatorTypes)
  const [otherType, setOtherType] = useState(() => {
    const o = props.creatorTypes.find((t) => t.startsWith('その他（'))
    return o ? o.replace(/^その他（(.+)）$/, '$1') : ''
  })
  const [bio, setBio] = useState(props.bio ?? '')

  // スキル
  const [skills, setSkills] = useState<string[]>(props.skills)
  const [skillInput, setSkillInput] = useState('')

  // 希望条件
  const [priceMin, setPriceMin] = useState(props.priceMin != null ? String(props.priceMin) : '')
  const [priceNote, setPriceNote] = useState(props.priceNote ?? '')
  const [deliveryDays, setDeliveryDays] = useState(props.deliveryDays ?? '')

  // ポートフォリオ
  const [portfolios, setPortfolios] = useState<Portfolio[]>(props.portfolios)
  const [fetchingIdx, setFetchingIdx] = useState<number | null>(null)

  // 活動スタイル
  const [roles, setRoles] = useState<string[]>(props.roles)

  // ホームページ（sns_links の platform='ホームページ' エントリとして保存）
  const [homepageUrl, setHomepageUrl] = useState(() =>
    props.snsLinks.find((s) => s.platform === 'ホームページ')?.id ?? ''
  )

  // SNS（ホームページを除外）
  const [snsLinks, setSnsLinks] = useState<SnsEntry[]>(
    props.snsLinks.filter((s) => s.platform !== 'ホームページ')
  )

  // 保存済み確定値（キャンセル時のリセット用）
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
    // 別セクションが編集中なら未保存変更をリセットしてから切り替える
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

  // ---- ヘッダー保存（ロール変更も兼ねる） ----
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

  // ---- スキル保存 ----
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

  // ---- 希望条件保存 ----
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

  // ---- ポートフォリオ ----
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

  // ---- ホームページ保存 ----
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

  // ---- SNS保存（ホームページエントリを保持） ----
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

  const AVAILABILITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    open:     { label: '受付中',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    one_slot: { label: '要相談',      color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    full:     { label: '現在対応不可', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  }
  const avail = AVAILABILITY_LABELS[props.availability]

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

      {/* ===== プロフィールヘッダー ===== */}
      <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(199,125,255,0.2)', borderRadius: '24px', padding: '32px', marginBottom: '20px' }}>
        {editing === 'header' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* アバター */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <AvatarUpload currentUrl={props.avatarUrl} displayName={displayName} size={80} />
            </div>
            {/* 表示名 */}
            <div>
              <label style={{ color: '#a9a8c0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>表示名</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} style={inputStyle} />
              <p style={{ color: '#7c7b99', fontSize: '12px', marginTop: '4px' }}>{displayName.length}/30</p>
            </div>
            {/* 活動スタイル */}
            <div>
              <label style={{ color: '#a9a8c0', fontSize: '13px', display: 'block', marginBottom: '8px' }}>活動スタイル</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {([
                  { value: 'creator', label: 'クリエイター', desc: '依頼を受ける', color: '#c77dff', bg: 'rgba(199,125,255,0.15)', border: 'rgba(199,125,255,0.5)' },
                  { value: 'client',  label: '依頼者',       desc: '依頼を送る',  color: '#ff6b9d', bg: 'rgba(255,107,157,0.15)', border: 'rgba(255,107,157,0.5)' },
                ] as const).map(({ value, label, desc, color, bg, border }) => {
                  const active = roles.includes(value)
                  return (
                    <button key={value} type="button"
                      onClick={() => setRoles((prev) =>
                        prev.includes(value)
                          ? prev.length > 1 ? prev.filter((r) => r !== value) : prev
                          : [...prev, value]
                      )}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                        border: `2px solid ${active ? border : 'rgba(255,255,255,0.1)'}`,
                        background: active ? bg : 'rgba(255,255,255,0.03)', transition: 'all 0.15s',
                      }}
                    >
                      <p style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '13px', color: active ? color : '#f0eff8' }}>{label}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#7c7b99' }}>{desc}</p>
                    </button>
                  )
                })}
              </div>
              <p style={{ color: '#f0d080', fontSize: '12px', margin: 0, lineHeight: '1.6' }}>
                ⚠️ ロールの変更は保存時に確認ダイアログを表示します
              </p>
            </div>
            {/* クリエイタータイプ */}
            <div>
              <label style={{ color: '#a9a8c0', fontSize: '13px', display: 'block', marginBottom: '8px' }}>クリエイタータイプ</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CREATOR_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setCreatorTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                    style={{ padding: '7px 14px', borderRadius: '20px', border: creatorTypes.includes(t) ? '2px solid #c77dff' : '1px solid rgba(255,255,255,0.15)', background: creatorTypes.includes(t) ? 'rgba(199,125,255,0.2)' : 'transparent', color: creatorTypes.includes(t) ? '#c77dff' : '#a9a8c0', fontSize: '13px', cursor: 'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
              {creatorTypes.includes('その他') && (
                <input value={otherType} onChange={(e) => setOtherType(e.target.value)} maxLength={50}
                  placeholder="具体的な活動内容（例: 作詞家、声優）" style={{ ...inputStyle, marginTop: '10px' }} />
              )}
            </div>
            {/* 自己紹介 */}
            <div>
              <label style={{ color: '#a9a8c0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>自己紹介（400文字以内）</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={400} rows={5}
                placeholder="あなたの活動やスタイルを紹介してください。" style={{ ...inputStyle, resize: 'vertical' }} />
              <p style={{ color: '#7c7b99', fontSize: '12px', marginTop: '4px' }}>{bio.length}/400</p>
            </div>
            <EditActions onSave={saveHeader} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <AvatarUpload currentUrl={props.avatarUrl} displayName={displayName} size={80} readonly />
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* 受付状況 + 名前 */}
              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: avail.color, background: avail.bg, marginBottom: '12px' }}>
                ● {avail.label}
              </span>
              <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 16px' }}>{displayName}</h1>

              {/* カテゴリ別ラベル行 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>

                {/* 個人/法人 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ color: '#5c5b78', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', minWidth: '88px', flexShrink: 0, paddingTop: '4px' }}>個人 / 法人</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '12px', background: 'rgba(255,255,255,0.07)', color: '#a9a8c0', alignSelf: 'flex-start' }}>{props.entityType}</span>
                      {props.hasCorporateNumber && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                          ✓ 法人番号登録済み
                        </span>
                      )}
                    </div>
                    {props.companyName && (
                      <span style={{ color: '#a9a8c0', fontSize: '12px', paddingLeft: '2px' }}>{props.companyName}</span>
                    )}
                  </div>
                </div>

                {/* インボイス登録番号 */}
                {props.invoiceNumber && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#5c5b78', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', minWidth: '88px', flexShrink: 0 }}>インボイス</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                      ✓ {props.invoiceNumber}
                    </span>
                  </div>
                )}

                {/* 活動スタイル（クリエイター/依頼者） */}
                {roles.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#5c5b78', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', minWidth: '88px', flexShrink: 0 }}>活動スタイル</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {roles.includes('creator') && (
                        <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(199,125,255,0.15)', color: '#c77dff', border: '1px solid rgba(199,125,255,0.3)' }}>🎨 クリエイター</span>
                      )}
                      {roles.includes('client') && (
                        <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(255,107,157,0.15)', color: '#ff6b9d', border: '1px solid rgba(255,107,157,0.3)' }}>📋 依頼者</span>
                      )}
                    </div>
                  </div>
                )}

                {/* クリエイタータイプ */}
                {creatorTypes.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#5c5b78', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', minWidth: '88px', flexShrink: 0, paddingTop: '4px' }}>タイプ</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {creatorTypes.filter((t) => !t.startsWith('その他（')).concat(
                        creatorTypes.filter((t) => t.startsWith('その他（'))
                      ).map((type) => (
                        <span key={type} style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '12px', background: 'rgba(199,125,255,0.12)', color: '#c77dff', border: '1px solid rgba(199,125,255,0.2)' }}>{type}</span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* 自己紹介 */}
              {bio ? (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                  <p style={{ color: '#5c5b78', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 8px' }}>自己紹介</p>
                  <p style={{ color: '#d0cfea', fontSize: '14px', lineHeight: '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>{bio}</p>
                </div>
              ) : props.isOwner ? (
                <p style={{ color: '#7c7b99', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>自己紹介が未入力です</p>
              ) : null}

            </div>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              {props.isOwner ? (
                <button type="button" onClick={() => startEdit('header')} style={editBtnStyle}>✏️ 編集</button>
              ) : (
                <Link
                  href={`/orders/new?creator=${props.profileId}&creatorName=${encodeURIComponent(props.displayName)}`}
                  style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'var(--c-grad-primary)', color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }}
                >
                  📩 依頼する
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== 依頼受付状況 ===== */}
      <Section title="依頼受付状況">
        <AvailabilityEditor current={props.availability} isOwner={props.isOwner} lastSeen={props.lastSeen} />
      </Section>

      {/* ===== スキル ===== */}
      <Section title="スキル" onEdit={props.isOwner ? () => startEdit('skills') : undefined} isEditing={editing === 'skills'}>
        {editing === 'skills' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* タグ入力 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(255,255,255,0.05)', minHeight: '48px' }}>
              {skills.map((s) => (
                <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(199,125,255,0.2)', color: '#c77dff', fontSize: '13px' }}>
                  {s}
                  <button type="button" onClick={() => setSkills((prev) => prev.filter((x) => x !== s))} style={{ background: 'none', border: 'none', color: '#c77dff', cursor: 'pointer', padding: '0', lineHeight: 1 }}>×</button>
                </span>
              ))}
              {skills.length < VALIDATION.SKILLS_MAX && (
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } if (e.key === 'Backspace' && skillInput === '' && skills.length > 0) setSkills((prev) => prev.slice(0, -1)) }}
                  placeholder={skills.length === 0 ? 'スキルを入力して Enter' : ''}
                  style={{ flex: '1 1 120px', minWidth: '100px', background: 'none', border: 'none', outline: 'none', color: '#f0eff8', fontSize: '14px', padding: '2px 4px' }} />
              )}
            </div>
            <p style={{ color: '#7c7b99', fontSize: '12px', margin: 0 }}>{skills.length}/{VALIDATION.SKILLS_MAX}個</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SKILL_SUGGESTIONS.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())).map((s) => (
                <button key={s} type="button" onClick={() => addSkill(s)}
                  style={{ padding: '5px 12px', borderRadius: '20px', border: '1px dashed rgba(199,125,255,0.3)', background: 'transparent', color: '#a9a8c0', fontSize: '12px', cursor: 'pointer' }}>
                  + {s}
                </button>
              ))}
            </div>
            <EditActions onSave={saveSkills} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : skills.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {skills.map((s) => (
              <span key={s} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', border: '1px solid rgba(199,125,255,0.3)', color: '#c77dff', background: 'rgba(199,125,255,0.08)' }}>{s}</span>
            ))}
          </div>
        ) : (
          <p style={{ color: '#7c7b99', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>スキルが未登録です</p>
        )}
      </Section>

      {/* ===== 希望条件 ===== */}
      <Section title="希望条件" onEdit={props.isOwner ? () => startEdit('pricing') : undefined} isEditing={editing === 'pricing'}>
        {editing === 'pricing' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ color: '#a9a8c0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>希望単価（目安）</label>
              <div style={{ position: 'relative' }}>
                <input type="text" inputMode="numeric" value={priceMin}
                  onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setPriceMin(v) }}
                  placeholder="5000" style={{ ...inputStyle, paddingRight: '32px' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7c7b99', fontSize: '13px' }}>円</span>
              </div>
            </div>
            <div>
              <label style={{ color: '#a9a8c0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>単価の補足</label>
              <textarea value={priceNote} onChange={(e) => setPriceNote(e.target.value)} rows={3} placeholder="例）10分を超える動画の場合10,000円加算　など" style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ color: '#a9a8c0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>納品にかかる期間</label>
              <input value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} maxLength={30} placeholder="例: 2〜4週間" style={inputStyle} />
            </div>
            <EditActions onSave={savePricing} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : (priceMin !== '' || priceNote || deliveryDays) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {priceMin !== '' && (
              <Row label="希望単価"><span style={{ color: '#f0eff8', fontSize: '15px', fontWeight: '600' }}>¥{parseInt(priceMin).toLocaleString()} 〜</span></Row>
            )}
            {priceNote && (
              <Row label="単価補足"><span style={{ color: '#d0cfea', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{priceNote}</span></Row>
            )}
            {deliveryDays && (
              <Row label="納品期間"><span style={{ color: '#f0eff8', fontSize: '14px' }}>{deliveryDays}</span></Row>
            )}
          </div>
        ) : (
          <p style={{ color: '#7c7b99', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>希望条件が未設定です</p>
        )}
      </Section>

      {/* ===== ポートフォリオ ===== */}
      <Section title="ポートフォリオ" onEdit={props.isOwner ? () => startEdit('portfolios') : undefined} isEditing={editing === 'portfolios'}>
        {editing === 'portfolios' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {portfolios.map((p, i) => (
              <div key={i} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select value={p.platform} onChange={(e) => setPortfolios((prev) => { const next = [...prev]; next[i] = { platform: e.target.value, url: '', title: '', thumbnail_url: undefined }; return next })}
                    style={{ ...inputStyle, flex: '0 0 130px' }}>
                    {PLATFORMS.map((pl) => <option key={pl} value={pl} style={{ color: '#000', background: '#fff' }}>{pl}</option>)}
                  </select>
                  <button type="button" onClick={() => setPortfolios((prev) => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: 'pointer', fontSize: '18px', padding: '0 8px' }}>×</button>
                </div>
                <input type="url" value={p.url}
                  onChange={(e) => setPortfolios((prev) => { const next = [...prev]; next[i] = { ...next[i], url: e.target.value, title: '', thumbnail_url: undefined }; return next })}
                  onBlur={(e) => fetchOEmbed(i, e.target.value)}
                  placeholder={PLATFORM_PLACEHOLDERS[p.platform] ?? 'https://...'}
                  style={{ ...inputStyle, marginBottom: '8px' }} />
                {fetchingIdx === i && <p style={{ color: '#7c7b99', fontSize: '12px', margin: '0 0 8px' }}>取得中...</p>}
                {p.thumbnail_url && fetchingIdx !== i && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <img src={p.thumbnail_url} alt="" style={{ width: '80px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} />
                    <span style={{ color: '#a9a8c0', fontSize: '12px' }}>サムネイル取得済み</span>
                  </div>
                )}
                <input type="text" value={p.title} onChange={(e) => setPortfolios((prev) => { const next = [...prev]; next[i] = { ...next[i], title: e.target.value }; return next })}
                  placeholder="タイトル" maxLength={100} style={inputStyle} />
              </div>
            ))}
            {portfolios.length < VALIDATION.PORTFOLIOS_MAX && (
              <button type="button" onClick={() => setPortfolios((prev) => [...prev, { platform: 'YouTube', url: '', title: '' }])}
                style={{ padding: '10px', borderRadius: '10px', border: '1px dashed rgba(199,125,255,0.3)', background: 'transparent', color: '#c77dff', fontSize: '13px', cursor: 'pointer' }}>
                + ポートフォリオを追加
              </button>
            )}
            <EditActions onSave={savePortfolios} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : portfolios.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {portfolios.map((p, i) => {
              let safeUrl = '#'
              try { const u = new URL(p.url); if (u.protocol === 'https:' || u.protocol === 'http:') safeUrl = p.url } catch { /* invalid */ }
              return (
              <a key={i} href={safeUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', textDecoration: 'none', overflow: 'hidden' }}>
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt={p.title || p.platform}
                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(199,125,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c77dff', fontSize: '36px' }}>🔗</div>
                )}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ color: '#f0eff8', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || p.url}</div>
                    <div style={{ color: '#7c7b99', fontSize: '11px', marginTop: '2px' }}>{p.platform}</div>
                  </div>
                  <span style={{ color: '#7c7b99', fontSize: '16px', flexShrink: 0 }}>↗</span>
                </div>
              </a>
              )
            })}
          </div>
        ) : (
          <p style={{ color: '#7c7b99', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>ポートフォリオが未登録です</p>
        )}
      </Section>

      {/* ===== ホームページ ===== */}
      <Section title="ホームページ" onEdit={props.isOwner ? () => startEdit('homepage') : undefined} isEditing={editing === 'homepage'}>
        {editing === 'homepage' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="url"
              value={homepageUrl}
              onChange={(e) => setHomepageUrl(e.target.value)}
              placeholder="https://example.com"
              maxLength={200}
              style={inputStyle}
            />
            <EditActions onSave={saveHomepage} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : homepageUrl.trim() ? (
          <a href={homepageUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#c77dff', fontSize: '14px', textDecoration: 'none', wordBreak: 'break-all' }}>
            🌐 {homepageUrl}
          </a>
        ) : (
          <p style={{ color: '#7c7b99', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>ホームページが未登録です</p>
        )}
      </Section>

      {/* ===== SNS ===== */}
      <Section title="SNS" onEdit={props.isOwner ? () => startEdit('sns') : undefined} isEditing={editing === 'sns'}>
        {editing === 'sns' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {snsLinks.map((s, i) => {
              const meta = SNS_PLATFORMS.find((p) => p.label === s.platform) ?? SNS_PLATFORMS[0]
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select value={s.platform} onChange={(e) => setSnsLinks((prev) => { const next = [...prev]; next[i] = { platform: e.target.value, id: '' }; return next })}
                    style={{ ...inputStyle, flex: '0 0 140px' }}>
                    {SNS_PLATFORMS.map(({ label }) => <option key={label} value={label} style={{ color: '#000', background: '#fff' }}>{label}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
                    {meta.prefix && <span style={{ padding: '10px', color: '#7c7b99', fontSize: '12px', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>{meta.prefix}</span>}
                    <input type="text" value={s.id} onChange={(e) => setSnsLinks((prev) => { const next = [...prev]; next[i] = { ...next[i], id: e.target.value.replace(/^@/, '') }; return next })}
                      placeholder={meta.placeholder} maxLength={100}
                      style={{ flex: 1, padding: '10px 12px', background: 'transparent', border: 'none', color: '#f0eff8', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <button type="button" onClick={() => setSnsLinks((prev) => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}>×</button>
                </div>
              )
            })}
            {snsLinks.length < 7 && (
              <button type="button" onClick={() => setSnsLinks((prev) => [...prev, { platform: 'X (Twitter)', id: '' }])}
                style={{ padding: '8px', borderRadius: '10px', border: '1px dashed rgba(199,125,255,0.3)', background: 'transparent', color: '#c77dff', fontSize: '13px', cursor: 'pointer' }}>
                + SNSを追加
              </button>
            )}
            <EditActions onSave={saveSns} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : snsLinks.filter((s) => s.id?.trim()).length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {snsLinks.filter((s) => s.id?.trim()).map((s, i) => {
              const meta = SNS_PLATFORMS.find((p) => p.label === s.platform)
              const prefix = meta?.prefix ?? ''
              return (
                <a key={i} href={`${SNS_BASE_URLS[s.platform] ?? '#'}${s.id}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#d0cfea', fontSize: '13px', textDecoration: 'none' }}>
                  <span>{SNS_ICONS[s.platform] ?? '🔗'}</span>
                  <span>{s.platform}</span>
                  <span style={{ color: '#7c7b99' }}>{prefix}{s.id}</span>
                </a>
              )
            })}
          </div>
        ) : (
          <p style={{ color: '#7c7b99', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>SNSが未登録です</p>
        )}
      </Section>

      {/* 評価セクション */}
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
    { label: 'クリエイターとして', stat: evalAsCreator, color: '#c77dff', bg: 'rgba(199,125,255,0.08)', border: 'rgba(199,125,255,0.2)' },
    { label: '依頼者として',       stat: evalAsClient,  color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)'  },
    { label: 'プロジェクトメンバーとして', stat: evalAsMember, color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)'  },
  ]

  const typeLabel = (type: string) =>
    type === 'order_to_creator' ? 'クリエイターとして受けた評価'
    : type === 'order_to_client' ? '依頼者として受けた評価'
    : 'プロジェクトメンバーとして受けた評価'

  return (
    <>
      <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(199,125,255,0.15)', borderRadius: '20px', padding: '24px 28px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#7c7b99', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px' }}>評価</h2>

        {/* 統計カード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: hasAnyEval ? '24px' : '0' }}>
          {statItems.map(({ label, stat, color, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '14px', padding: '14px 16px' }}>
              <p style={{ color: '#7c7b99', fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 6px' }}>{label}</p>
              {stat.count > 0 ? (
                <>
                  <p style={{ color, fontSize: '22px', fontWeight: '800', margin: '0 0 2px' }}>
                    {stat.avg != null ? `★${stat.avg}` : '-'}
                  </p>
                  <p style={{ color: '#7c7b99', fontSize: '11px', margin: 0 }}>{stat.count}件</p>
                </>
              ) : (
                <p style={{ color: '#5c5b78', fontSize: '13px', margin: 0 }}>評価なし</p>
              )}
            </div>
          ))}
        </div>

        {/* 最近の評価一覧 */}
        {recentReviews.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentReviews.map((r) => (
              <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: r.comment ? '8px' : '0', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StarDisplay rating={r.rating} />
                    <span style={{ color: '#7c7b99', fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {typeLabel(r.review_type)}
                    </span>
                    <span style={{ color: '#5c5b78', fontSize: '11px' }}>
                      {new Date(r.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setReportReviewId(r.id)}
                      style={{
                        padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(248,113,113,0.3)',
                        background: 'rgba(248,113,113,0.06)', color: '#f87171',
                        fontSize: '11px', cursor: 'pointer',
                      }}
                    >
                      報告する
                    </button>
                  )}
                </div>
                {r.comment && (
                  <p style={{ color: '#d0cfea', fontSize: '13px', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {!hasAnyEval && (
          <p style={{ color: '#5c5b78', fontSize: '14px', margin: 0 }}>まだ評価がありません</p>
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
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: '14px', filter: s <= rating ? 'none' : 'grayscale(1) opacity(0.25)' }}>
          ⭐
        </span>
      ))}
    </div>
  )
}

// ---- 共通サブコンポーネント ----

function Section({ title, children, onEdit, isEditing }: {
  title: string; children: React.ReactNode
  onEdit?: () => void; isEditing?: boolean
}) {
  return (
    <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(199,125,255,0.15)', borderRadius: '20px', padding: '24px 28px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#7c7b99', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>{title}</h2>
        {onEdit && !isEditing && (
          <button type="button" onClick={onEdit} style={editBtnStyle}>✏️ 編集</button>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
      {error && <p style={{ color: '#ff6b9d', fontSize: '13px', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={onSave} disabled={saving} style={{ ...saveBtnStyle, opacity: saving ? 0.6 : 1 }}>
          {saving ? '保存中...' : '保存する'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} style={cancelBtnStyle}>キャンセル</button>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <span style={{ color: '#7c7b99', fontSize: '13px', minWidth: '80px', flexShrink: 0 }}>{label}</span>
      <div>{children}</div>
    </div>
  )
}
