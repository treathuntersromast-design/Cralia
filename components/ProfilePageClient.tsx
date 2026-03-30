'use client'

import { useState } from 'react'
import AvatarUpload from './AvatarUpload'
import AvailabilityEditor from './AvailabilityEditor'

// ---- 定数 ----
const CREATOR_TYPES = ['VTuber', 'ボカロP', 'イラストレーター', '動画編集者', '楽曲制作関係', '3Dモデラー', 'デザイナー', 'その他']

const SKILL_SUGGESTIONS = [
  'MV制作', '動画編集', '3DCGアニメ', 'Live2D', 'アニメーション',
  'キャラクターデザイン', 'イラスト制作', '背景イラスト', 'サムネイル制作', 'ロゴデザイン', '3Dモデル制作',
  '楽曲制作', '作曲', '作詞', 'BGM制作', 'ミキシング・マスタリング', 'ボーカルミックス', '歌唱', 'コーラス', '声優',
  'シナリオ・脚本',
]

const SNS_PLATFORMS = [
  { label: 'X (Twitter)', prefix: '@', placeholder: 'username' },
  { label: 'Instagram', prefix: '@', placeholder: 'username' },
  { label: 'YouTube', prefix: 'youtube.com/@', placeholder: 'channel' },
  { label: 'niconico', prefix: 'nicovideo.jp/user/', placeholder: '12345678' },
  { label: 'TikTok', prefix: '@', placeholder: 'username' },
  { label: 'Twitch', prefix: 'twitch.tv/', placeholder: 'username' },
  { label: 'Bluesky', prefix: '@', placeholder: 'handle.bsky.social' },
]

const SNS_ICONS: Record<string, string> = {
  'X (Twitter)': '𝕏', Instagram: '📷', YouTube: '▶', niconico: '🎦',
  TikTok: '🎵', Twitch: '🟣', Bluesky: '🦋',
}
const SNS_BASE_URLS: Record<string, string> = {
  'X (Twitter)': 'https://x.com/', Instagram: 'https://instagram.com/',
  YouTube: 'https://youtube.com/@', niconico: 'https://nicovideo.jp/user/',
  TikTok: 'https://tiktok.com/@', Twitch: 'https://twitch.tv/', Bluesky: 'https://bsky.app/profile/',
}

const PLATFORMS = ['YouTube', 'pixiv', 'niconico', 'X (Twitter)', 'Instagram', 'その他']
const PLATFORM_PLACEHOLDERS: Record<string, string> = {
  YouTube: 'https://youtube.com/...', pixiv: 'https://pixiv.net/...',
  niconico: 'https://nicovideo.jp/...', 'X (Twitter)': 'https://x.com/...',
  Instagram: 'https://instagram.com/...', その他: 'https://...',
}

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
  lastSeen: string
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
  background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
  color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
  color: '#a9a8c0', fontSize: '13px', cursor: 'pointer',
}

type Section = 'header' | 'skills' | 'pricing' | 'portfolios' | 'sns' | null

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

  // SNS
  const [snsLinks, setSnsLinks] = useState<SnsEntry[]>(props.snsLinks)

  const startEdit = (section: Section) => { setEditing(section); setError(null) }
  const cancelEdit = () => { setEditing(null); setError(null) }

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/profile/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? '更新に失敗しました')
  }

  // ---- ヘッダー保存 ----
  const saveHeader = async () => {
    setSaving(true); setError(null)
    try {
      const normalizedTypes = creatorTypes.map((t) =>
        t === 'その他' && otherType.trim() ? `その他（${otherType.trim()}）` : t
      )
      await patch({ displayName, creatorTypes: normalizedTypes, bio })
      setEditing(null)
    } catch (e) { setError(e instanceof Error ? e.message : '更新に失敗しました') }
    finally { setSaving(false) }
  }

  // ---- スキル保存 ----
  const addSkill = (s: string) => {
    const t = s.trim()
    if (!t || t.length > 50 || skills.length >= 20) return
    if (skills.some((x) => x.toLowerCase() === t.toLowerCase())) return
    setSkills((prev) => [...prev, t])
    setSkillInput('')
  }
  const saveSkills = async () => {
    setSaving(true); setError(null)
    try { await patch({ skills }); setEditing(null) }
    catch (e) { setError(e instanceof Error ? e.message : '更新に失敗しました') }
    finally { setSaving(false) }
  }

  // ---- 希望条件保存 ----
  const savePricing = async () => {
    setSaving(true); setError(null)
    try { await patch({ priceMin, priceNote, deliveryDays }); setEditing(null) }
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
    } finally { setFetchingIdx(null) }
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
      setEditing(null)
    } catch (e) { setError(e instanceof Error ? e.message : '更新に失敗しました') }
    finally { setSaving(false) }
  }

  // ---- SNS保存 ----
  const saveSns = async () => {
    setSaving(true); setError(null)
    try { await patch({ snsLinks }); setEditing(null) }
    catch (e) { setError(e instanceof Error ? e.message : '更新に失敗しました') }
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
            <div style={{ flex: 1 }}>
              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: avail.color, background: avail.bg, marginBottom: '12px' }}>
                ● {avail.label}
              </span>
              <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 8px' }}>{displayName}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', background: 'rgba(255,255,255,0.07)', color: '#a9a8c0' }}>{props.entityType}</span>
                {creatorTypes.filter((t) => !t.startsWith('その他（')).concat(
                  creatorTypes.filter((t) => t.startsWith('その他（'))
                ).map((type) => (
                  <span key={type} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', background: 'rgba(199,125,255,0.15)', color: '#c77dff', fontWeight: '600' }}>{type}</span>
                ))}
              </div>
              {bio ? (
                <p style={{ color: '#d0cfea', fontSize: '14px', lineHeight: '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>{bio}</p>
              ) : props.isOwner ? (
                <p style={{ color: '#7c7b99', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>自己紹介が未入力です</p>
              ) : null}
            </div>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              {props.isOwner ? (
                <button type="button" onClick={() => startEdit('header')} style={editBtnStyle}>✏️ 編集</button>
              ) : (
                <button disabled style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'not-allowed', opacity: 0.7 }}>
                  📩 依頼する（準備中）
                </button>
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
              {skills.length < 20 && (
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } if (e.key === 'Backspace' && skillInput === '' && skills.length > 0) setSkills((prev) => prev.slice(0, -1)) }}
                  placeholder={skills.length === 0 ? 'スキルを入力して Enter' : ''}
                  style={{ flex: '1 1 120px', minWidth: '100px', background: 'none', border: 'none', outline: 'none', color: '#f0eff8', fontSize: '14px', padding: '2px 4px' }} />
              )}
            </div>
            <p style={{ color: '#7c7b99', fontSize: '12px', margin: 0 }}>{skills.length}/20個</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).map((s) => (
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
                <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="5000" min={0} style={{ ...inputStyle, paddingRight: '32px' }} />
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
        ) : (priceMin || priceNote || deliveryDays) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {priceMin && (
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
            {portfolios.length < 5 && (
              <button type="button" onClick={() => setPortfolios((prev) => [...prev, { platform: 'YouTube', url: '', title: '' }])}
                style={{ padding: '10px', borderRadius: '10px', border: '1px dashed rgba(199,125,255,0.3)', background: 'transparent', color: '#c77dff', fontSize: '13px', cursor: 'pointer' }}>
                + ポートフォリオを追加
              </button>
            )}
            <EditActions onSave={savePortfolios} onCancel={cancelEdit} saving={saving} error={error} />
          </div>
        ) : portfolios.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {portfolios.map((p, i) => (
              <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', textDecoration: 'none' }}>
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="" style={{ width: '96px', height: '54px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '96px', height: '54px', borderRadius: '6px', flexShrink: 0, background: 'rgba(199,125,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c77dff', fontSize: '22px' }}>🔗</div>
                )}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ color: '#f0eff8', fontSize: '14px', fontWeight: '600', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || p.url}</div>
                  <div style={{ color: '#7c7b99', fontSize: '12px' }}>{p.platform}</div>
                </div>
                <span style={{ color: '#7c7b99', fontSize: '18px', flexShrink: 0 }}>↗</span>
              </a>
            ))}
          </div>
        ) : (
          <p style={{ color: '#7c7b99', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>ポートフォリオが未登録です</p>
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
                    <span style={{ padding: '10px', color: '#7c7b99', fontSize: '12px', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>{meta.prefix}</span>
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
            {snsLinks.filter((s) => s.id?.trim()).map((s, i) => (
              <a key={i} href={`${SNS_BASE_URLS[s.platform] ?? '#'}${s.id}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#d0cfea', fontSize: '13px', textDecoration: 'none' }}>
                <span>{SNS_ICONS[s.platform] ?? '🔗'}</span>
                <span>{s.platform}</span>
                <span style={{ color: '#7c7b99' }}>@{s.id}</span>
              </a>
            ))}
          </div>
        ) : (
          <p style={{ color: '#7c7b99', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>SNSが未登録です</p>
        )}
      </Section>

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
