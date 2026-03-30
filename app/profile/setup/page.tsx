'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import BioChatModal from '@/components/BioChatModal'
import AvatarUpload from '@/components/AvatarUpload'
import { createClient } from '@/lib/supabase/client'

// ステップ定義
const STEPS = ['個人・法人', '活動スタイル', '基本情報', 'スキル・自己紹介', 'ポートフォリオ', '希望条件'] as const
type Step = 0 | 1 | 2 | 3 | 4 | 5

const CREATOR_TYPES = ['VTuber', 'ボカロP', 'イラストレーター', '動画編集者', '楽曲制作関係', '3Dモデラー', 'デザイナー', 'その他']

// 動画 → イラスト → 楽曲 → その他 の順（作業内容ベース）
const SKILL_SUGGESTIONS = [
  // 動画
  'MV制作', '動画編集', '3DCGアニメ', 'Live2D', 'アニメーション',
  // イラスト
  'キャラクターデザイン', 'イラスト制作', '背景イラスト', 'サムネイル制作', 'ロゴデザイン', '3Dモデル制作',
  // 楽曲
  '楽曲制作', '作曲', '作詞', 'BGM制作', 'ミキシング・マスタリング', 'ボーカルミックス', '歌唱', 'コーラス', '声優',
  // その他
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

const PLATFORMS = [
  { label: 'YouTube', placeholder: 'https://youtube.com/...' },
  { label: 'pixiv', placeholder: 'https://pixiv.net/...' },
  { label: 'niconico', placeholder: 'https://nicovideo.jp/...' },
  { label: 'X (Twitter)', placeholder: 'https://x.com/...' },
  { label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { label: 'その他', placeholder: 'https://...' },
]

type Roles = ('creator' | 'client')[]

interface Portfolio {
  platform: string
  url: string
  title: string
  thumbnail_url?: string
}

interface SnsEntry {
  platform: string
  id: string
}

interface FormData {
  entityType: 'individual' | 'corporate' | ''
  roles: Roles
  displayName: string
  snsLinks: SnsEntry[]
  creatorTypes: string[]
  skills: string[]
  bio: string
  portfolios: Portfolio[]
  priceMin: string
  priceNote: string
  availability: 'open' | 'one_slot' | 'full'
  deliveryDays: string
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/dashboard'
  const [step, setStep] = useState<Step>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skillInput, setSkillInput] = useState('')
  const [otherCreatorType, setOtherCreatorType] = useState('')
  const [fetchingIndex, setFetchingIndex] = useState<number | null>(null)
  const [showBioChat, setShowBioChat] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    entityType: '',
    roles: [],
    displayName: '',
    snsLinks: [],
    creatorTypes: [],
    skills: [],
    bio: '',
    portfolios: [],
    priceMin: '',
    priceNote: '',
    availability: 'open',
    deliveryDays: '',
  })

  const isCreator = form.roles.includes('creator')

  // 既存プロフィールをフォームに反映
  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: userData }, { data: profile }, { data: portfolios }] = await Promise.all([
        supabase.from('users').select('entity_type, roles, display_name, sns_links, avatar_url').eq('id', user.id).single(),
        supabase.from('creator_profiles').select('*').eq('creator_id', user.id).single(),
        supabase.from('portfolios').select('*').eq('creator_id', user.id).order('display_order'),
      ])

      if (!userData) return
      if (userData.avatar_url) setAvatarUrl(userData.avatar_url)

      // 「その他（xxx）」形式のクリエイタータイプを分離
      const rawTypes: string[] = profile?.creator_type ?? []
      const otherEntry = rawTypes.find((t) => t.startsWith('その他（'))
      const normalizedTypes = rawTypes.map((t) => t.startsWith('その他（') ? 'その他' : t)
      if (otherEntry) {
        const match = otherEntry.match(/^その他（(.+)）$/)
        if (match) setOtherCreatorType(match[1])
      }

      setForm({
        entityType: (userData.entity_type as 'individual' | 'corporate') || 'individual',
        roles: (userData.roles as Roles) ?? [],
        displayName: userData.display_name ?? '',
        snsLinks: (userData.sns_links as SnsEntry[]) ?? [],
        creatorTypes: normalizedTypes,
        skills: profile?.skills ?? [],
        bio: profile?.bio ?? '',
        portfolios: (portfolios ?? []).map((p) => ({
          platform: p.platform,
          url: p.url,
          title: p.title ?? '',
          thumbnail_url: p.thumbnail_url ?? undefined,
        })),
        priceMin: profile?.price_min != null ? String(profile.price_min) : '',
        priceNote: (profile as Record<string, unknown>)?.price_note as string ?? '',
        availability: (profile?.availability as 'open' | 'one_slot' | 'full') ?? 'open',
        deliveryDays: (profile as Record<string, unknown>)?.delivery_days as string ?? '',
      })
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // クリエイタータイプ切り替え
  const toggleCreatorType = (type: string) => {
    setForm((f) => ({
      ...f,
      creatorTypes: f.creatorTypes.includes(type)
        ? f.creatorTypes.filter((t) => t !== type)
        : [...f.creatorTypes, type],
    }))
  }

  // スキルタグ追加
  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (!trimmed || trimmed.length > 50 || form.skills.length >= 20) return
    if (form.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return
    setForm((f) => ({ ...f, skills: [...f.skills, trimmed] }))
    setSkillInput('')
  }

  // ポートフォリオ追加
  const addPortfolio = () => {
    if (form.portfolios.length >= 5) return
    setForm((f) => ({ ...f, portfolios: [...f.portfolios, { platform: 'YouTube', url: '', title: '' }] }))
  }

  const updatePortfolio = (index: number, field: keyof Portfolio, value: string) => {
    setForm((f) => {
      const updated = [...f.portfolios]
      updated[index] = { ...updated[index], [field]: value }
      return { ...f, portfolios: updated }
    })
  }

  const removePortfolio = (index: number) => {
    setForm((f) => ({ ...f, portfolios: f.portfolios.filter((_, i) => i !== index) }))
  }

  // YouTube・niconico・pixiv・X の URL 入力後にタイトルとサムネを自動取得
  const fetchOEmbed = async (index: number, url: string) => {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
    const isNiconico = url.includes('nicovideo.jp')
    const isPixiv = url.includes('pixiv.net')
    const isX = url.includes('x.com') || url.includes('twitter.com')
    const isInstagram = url.includes('instagram.com')
    if (!isYouTube && !isNiconico && !isPixiv && !isX && !isInstagram) return

    setFetchingIndex(index)
    try {
      const res = await fetch(`/api/portfolio/oembed?url=${encodeURIComponent(url)}`)
      if (!res.ok) return
      const data = await res.json()
      setForm((f) => {
        const updated = [...f.portfolios]
        updated[index] = {
          ...updated[index],
          title: data.title ?? updated[index].title,
          thumbnail_url: data.thumbnail_url ?? undefined,
        }
        return { ...f, portfolios: updated }
      })
    } finally {
      setFetchingIndex(null)
    }
  }

  // ステップ進行バリデーション
  const canNext = (): boolean => {
    if (step === 0) return form.entityType !== ''
    if (step === 1) return form.roles.length > 0
    if (step === 2) {
      if (!form.displayName.trim()) return false
      if (isCreator && form.creatorTypes.length === 0) return false
      // 「その他」を選択した場合は補足入力が必須
      if (isCreator && form.creatorTypes.includes('その他') && !otherCreatorType.trim()) return false
      return true
    }
    return true
  }

  const handleNext = () => {
    if (!canNext()) return
    setError(null)

    // ポートフォリオの重複チェック（ステップ4・大文字小文字無視）
    if (step === 4) {
      const urls = form.portfolios.map((p) => p.url.trim().toLowerCase()).filter(Boolean)
      const unique = new Set(urls)
      if (urls.length !== unique.size) {
        setError('同じURLが複数登録されています。重複を削除してください。')
        return
      }
    }

    // クリエイターでない場合はスキル・ポートフォリオ・希望条件をスキップして送信
    if (!isCreator && step === 2) {
      handleSubmit()
      return
    }
    if (step < 5) setStep((s) => (s + 1) as Step)
    else handleSubmit()
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    // 「その他」に入力テキストがあれば「その他（xxx）」に置き換える
    const creatorTypes = form.creatorTypes.map((t) =>
      t === 'その他' && otherCreatorType.trim()
        ? `その他（${otherCreatorType.trim()}）`
        : t
    )

    const res = await fetch('/api/profile/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, creatorTypes }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? '保存に失敗しました。')
      setLoading(false)
      return
    }

    router.push(nextPath)
    router.refresh()
  }

  // クリエイターでないユーザーの表示ステップを絞る
  const visibleSteps = isCreator ? STEPS : ['個人・法人', '活動スタイル', '基本情報']
  const progress = ((step + 1) / (isCreator ? 6 : 3)) * 100

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 8px',
          }}>
            CreMatch
          </h1>
          <p style={{ color: '#a9a8c0', margin: 0 }}>プロフィールを設定しましょう</p>
        </div>

        {/* プログレスバー（個人・法人 / 活動スタイル選択画面では非表示） */}
        {step > 1 && (
          <>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#c77dff', fontSize: '13px', fontWeight: '700' }}>
                {STEPS[step]}
              </span>
              <span style={{ color: '#7c7b99', fontSize: '13px' }}>
                {step} / {visibleSteps.length - 1}
              </span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '24px' }}>
              <div style={{
                height: '100%',
                width: `${(step / (visibleSteps.length - 1)) * 100}%`,
                background: 'linear-gradient(90deg, #ff6b9d, #c77dff)',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </>
        )}
        {(step === 0 || step === 1) && <div style={{ marginBottom: '24px' }} />}

        {/* カード */}
        <div style={{
          background: 'rgba(22, 22, 31, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(199,125,255,0.2)',
          borderRadius: '24px',
          padding: '32px',
        }}>
          {/* ステップ 0: 個人・法人 */}
          {step === 0 && (
            <div>
              <h2 style={{ color: '#f0eff8', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                個人・法人どちらですか？
              </h2>
              <p style={{ color: '#7c7b99', fontSize: '14px', marginBottom: '24px' }}>
                後から変更も可能です。
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {([
                  { value: 'individual' as const, emoji: '👤', label: '個人', desc: '個人として活動している' },
                  { value: 'corporate' as const, emoji: '🏢', label: '法人・団体', desc: '企業・サークル・チームとして活動している' },
                ]).map(({ value, emoji, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, entityType: value }))}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '14px',
                      border: form.entityType === value ? '2px solid #c77dff' : '1px solid rgba(255,255,255,0.1)',
                      background: form.entityType === value ? 'rgba(199,125,255,0.12)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>{emoji}</span>
                    <div>
                      <div style={{ color: '#f0eff8', fontWeight: '700', fontSize: '15px' }}>{label}</div>
                      <div style={{ color: '#7c7b99', fontSize: '13px', marginTop: '2px' }}>{desc}</div>
                    </div>
                    {form.entityType === value && (
                      <span style={{ marginLeft: 'auto', color: '#c77dff', fontSize: '20px' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ステップ 1: 活動スタイル */}
          {step === 1 && (
            <div>
              <h2 style={{ color: '#f0eff8', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                どのように活動しますか？
              </h2>
              <p style={{ color: '#7c7b99', fontSize: '14px', marginBottom: '24px' }}>
                後から変更も可能です。
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {([
                  { role: 'creator' as const, emoji: '🎨', label: 'クリエイター（受注者）', desc: '依頼を受けて制作・提供する' },
                  { role: 'client' as const, emoji: '💼', label: '依頼者（発注者）', desc: 'クリエイターに制作を依頼する' },
                  { role: 'both' as const, emoji: '🔄', label: 'クリエイターかつ依頼者', desc: '制作依頼を受けながら、他のクリエイターにも依頼する' },
                ]).map(({ role, emoji, label, desc }) => {
                  const isSelected = role === 'both'
                    ? form.roles.includes('creator') && form.roles.includes('client')
                    : form.roles.includes(role) && !(form.roles.includes('creator') && form.roles.includes('client'))
                  const handleClick = () => {
                    if (role === 'both') {
                      setForm((f) => ({ ...f, roles: ['creator', 'client'] }))
                    } else {
                      setForm((f) => ({ ...f, roles: [role] }))
                    }
                  }
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={handleClick}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid #c77dff' : '1px solid rgba(255,255,255,0.1)',
                        background: isSelected ? 'rgba(199,125,255,0.12)' : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: '28px' }}>{emoji}</span>
                      <div>
                        <div style={{ color: '#f0eff8', fontWeight: '700', fontSize: '15px' }}>{label}</div>
                        <div style={{ color: '#7c7b99', fontSize: '13px', marginTop: '2px' }}>{desc}</div>
                      </div>
                      {isSelected && (
                        <span style={{ marginLeft: 'auto', color: '#c77dff', fontSize: '20px' }}>✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ステップ 2: 基本情報 */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ color: '#f0eff8', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                基本情報を入力してください
              </h2>

              {/* アイコン */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <AvatarUpload
                  currentUrl={avatarUrl}
                  displayName={form.displayName || '?'}
                  size={88}
                  onUploaded={(url) => setAvatarUrl(url)}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>
                  表示名（ハンドルネーム）<span style={{ color: '#ff6b9d' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  maxLength={30}
                  placeholder="例: クリエイター太郎"
                  style={inputStyle}
                />
                <p style={{ color: '#7c7b99', fontSize: '12px', marginTop: '4px' }}>
                  {form.displayName.length} / 30 文字
                </p>
              </div>

              {/* SNS リンク */}
              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '10px' }}>
                  SNS アカウント（任意）
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.snsLinks.map((entry, i) => {
                    const meta = SNS_PLATFORMS.find((p) => p.label === entry.platform) ?? SNS_PLATFORMS[0]
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          value={entry.platform}
                          onChange={(e) => setForm((f) => {
                            const updated = [...f.snsLinks]
                            updated[i] = { platform: e.target.value, id: '' }
                            return { ...f, snsLinks: updated }
                          })}
                          style={{ ...inputStyle, flex: '0 0 140px' }}
                        >
                          {SNS_PLATFORMS.map(({ label }) => (
                            <option key={label} value={label} style={{ color: '#000', background: '#fff' }}>{label}</option>
                          ))}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
                          <span style={{ padding: '10px 10px', color: '#7c7b99', fontSize: '12px', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>{meta.prefix}</span>
                          <input
                            type="text"
                            value={entry.id}
                            onChange={(e) => setForm((f) => {
                              const updated = [...f.snsLinks]
                              updated[i] = { ...updated[i], id: e.target.value.replace(/^@/, '') }
                              return { ...f, snsLinks: updated }
                            })}
                            placeholder={meta.placeholder}
                            maxLength={100}
                            style={{ flex: 1, padding: '10px 12px', background: 'transparent', border: 'none', color: '#f0eff8', fontSize: '14px', outline: 'none' }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, snsLinks: f.snsLinks.filter((_, j) => j !== i) }))}
                          style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}
                        >×</button>
                      </div>
                    )
                  })}
                </div>
                {form.snsLinks.length < 7 && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, snsLinks: [...f.snsLinks, { platform: 'X (Twitter)', id: '' }] }))}
                    style={{ ...addButtonStyle, marginTop: '8px' }}
                  >
                    + SNS を追加
                  </button>
                )}
              </div>

              {isCreator && (
                <div>
                  <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '10px' }}>
                    クリエイタータイプ<span style={{ color: '#ff6b9d' }}>*</span>（複数選択可）
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {CREATOR_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleCreatorType(type)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: form.creatorTypes.includes(type) ? '2px solid #c77dff' : '1px solid rgba(255,255,255,0.15)',
                          background: form.creatorTypes.includes(type) ? 'rgba(199,125,255,0.2)' : 'transparent',
                          color: form.creatorTypes.includes(type) ? '#c77dff' : '#a9a8c0',
                          fontSize: '14px',
                          fontWeight: form.creatorTypes.includes(type) ? '700' : '400',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {form.creatorTypes.includes('その他') && (
                    <>
                      <input
                        type="text"
                        value={otherCreatorType}
                        onChange={(e) => setOtherCreatorType(e.target.value)}
                        placeholder="具体的な活動内容を入力してください（例: 作詞家、作曲家、声優）"
                        maxLength={50}
                        style={{ ...inputStyle, marginTop: '10px', borderColor: !otherCreatorType.trim() ? 'rgba(255,107,157,0.5)' : 'rgba(199,125,255,0.25)' }}
                      />
                      {!otherCreatorType.trim() && (
                        <p style={{ color: '#ff6b9d', fontSize: '12px', marginTop: '4px' }}>
                          「その他」を選択した場合は内容の入力が必要です
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ステップ 3: スキル・自己紹介（クリエイターのみ） */}
          {step === 3 && isCreator && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ color: '#f0eff8', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                スキルと自己紹介
              </h2>

              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '8px' }}>
                  スキルタグ（最大20個）
                </label>
                {/* タグ入力ボックス：選択済みタグ＋テキスト入力がひとつの枠内に並ぶ */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid rgba(199,125,255,0.25)',
                    background: 'rgba(255,255,255,0.05)',
                    minHeight: '48px',
                    cursor: 'text',
                  }}
                  onClick={() => {
                    const el = document.getElementById('skill-input')
                    el?.focus()
                  }}
                >
                  {/* 選択済みタグ */}
                  {form.skills.map((s) => (
                    <span key={s} style={tagStyle}>
                      {s}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))
                        }}
                        style={{ background: 'none', border: 'none', color: '#c77dff', cursor: 'pointer', padding: '0 0 0 4px', lineHeight: 1 }}
                      >×</button>
                    </span>
                  ))}
                  {/* テキスト入力（タグの後ろに続く） */}
                  {form.skills.length < 20 && (
                    <input
                      id="skill-input"
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) }
                        if (e.key === 'Backspace' && skillInput === '' && form.skills.length > 0) {
                          setForm((f) => ({ ...f, skills: f.skills.slice(0, -1) }))
                        }
                      }}
                      placeholder={form.skills.length === 0 ? 'スキルを入力して Enter' : ''}
                      style={{
                        flex: '1 1 120px',
                        minWidth: '120px',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        color: '#f0eff8',
                        fontSize: '14px',
                        padding: '2px 4px',
                      }}
                    />
                  )}
                </div>
                <p style={{ color: '#7c7b99', fontSize: '12px', marginTop: '4px' }}>
                  {form.skills.length} / 20 個　※ Backspace で最後のタグを削除できます
                </p>
                {/* サジェスト */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {SKILL_SUGGESTIONS.filter((s) => !form.skills.includes(s)).map((s) => (
                    <button key={s} type="button" onClick={() => addSkill(s)} style={suggestionStyle}>
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px' }}>
                    自己紹介（400文字以内）
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowBioChat(true)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      border: '1px solid rgba(199,125,255,0.4)',
                      background: 'rgba(199,125,255,0.1)',
                      color: '#c77dff',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ✨ AIに書いてもらう
                  </button>
                </div>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  maxLength={400}
                  rows={5}
                  placeholder={`あなたの活動やスタイルを紹介してください。\n例）はじめまして！イラストレーターの〇〇です。アニメ・ゲーム系のキャラクターデザインを得意としており、VTuberのキャラクターデザインやLive2Dモデル用イラストの制作実績が多数あります。丁寧なヒアリングをもとに、ご要望に合ったデザインをご提案します。お気軽にご相談ください！`}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
                <p style={{ color: '#7c7b99', fontSize: '12px', marginTop: '4px' }}>
                  {form.bio.length} / 400 文字
                </p>
              </div>
            </div>
          )}

          {/* ステップ 4: ポートフォリオ（クリエイターのみ） */}
          {step === 4 && isCreator && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ color: '#f0eff8', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                ポートフォリオ（最大5件）
              </h2>
              <div style={{
                background: 'rgba(255,193,7,0.08)',
                border: '1px solid rgba(255,193,7,0.25)',
                borderRadius: '12px',
                padding: '12px 16px',
              }}>
                <p style={{ color: '#f9c74f', fontSize: '13px', fontWeight: '700', margin: '0 0 4px 0' }}>
                  💡 ポートフォリオの登録を強くおすすめします
                </p>
                <p style={{ color: '#a9a8c0', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                  実績やサンプルがないと依頼者に実力が伝わりにくく、案件獲得が難しくなります。
                  YouTube・X・pixiv・niconico などの作品URLを登録しておきましょう。
                </p>
                <p style={{ color: '#a9a8c0', fontSize: '13px', lineHeight: '1.6', margin: '8px 0 0 0' }}>
                  まだ公開作品がない場合は、まず YouTube や pixiv 等にサンプルを投稿してから登録するのがおすすめです。
                </p>
              </div>

              {form.portfolios.map((p, i) => (
                <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <select
                      value={p.platform}
                      onChange={(e) => {
                        setForm((f) => {
                          const updated = [...f.portfolios]
                          updated[i] = { platform: e.target.value, url: '', title: '', thumbnail_url: undefined }
                          return { ...f, portfolios: updated }
                        })
                      }}
                      style={{ ...inputStyle, flex: '0 0 140px' }}
                    >
                      {PLATFORMS.map(({ label }) => (
                        <option key={label} value={label} style={{ color: '#000', background: '#fff' }}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removePortfolio(i)}
                      style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: 'pointer', fontSize: '18px', padding: '0 8px' }}
                    >×</button>
                  </div>
                  <input
                    type="url"
                    value={p.url}
                    onChange={(e) => {
                      setForm((f) => {
                        const updated = [...f.portfolios]
                        updated[i] = { ...updated[i], url: e.target.value, title: '', thumbnail_url: undefined }
                        return { ...f, portfolios: updated }
                      })
                    }}
                    onBlur={(e) => fetchOEmbed(i, e.target.value)}
                    placeholder={PLATFORMS.find((pl) => pl.label === p.platform)?.placeholder ?? 'https://...'}
                    style={{ ...inputStyle, marginBottom: '8px' }}
                  />
                  {/* サムネイル表示（YouTube・niconico のみ） */}
                  {fetchingIndex === i && (
                    <p style={{ color: '#7c7b99', fontSize: '12px', margin: '0 0 8px' }}>
                      タイトル・サムネを取得中...
                    </p>
                  )}
                  {p.thumbnail_url && fetchingIndex !== i && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <img
                        src={p.thumbnail_url}
                        alt="サムネイル"
                        style={{ width: '96px', height: '54px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                      />
                      <span style={{ color: '#a9a8c0', fontSize: '12px' }}>サムネイルを取得しました</span>
                    </div>
                  )}
                  <input
                    type="text"
                    value={p.title}
                    onChange={(e) => updatePortfolio(i, 'title', e.target.value)}
                    placeholder="タイトル（自動取得 または 手入力）"
                    maxLength={100}
                    style={inputStyle}
                  />
                </div>
              ))}

              {form.portfolios.length < 5 && (
                <button type="button" onClick={addPortfolio} style={addButtonStyle}>
                  + ポートフォリオを追加
                </button>
              )}
            </div>
          )}

          {/* ステップ 5: 希望条件（クリエイターのみ） */}
          {step === 5 && isCreator && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ color: '#f0eff8', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                希望条件・受注状況
              </h2>

              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>
                  希望単価（目安）
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={form.priceMin}
                    onChange={(e) => setForm((f) => ({ ...f, priceMin: e.target.value }))}
                    placeholder="5000"
                    min={0}
                    style={{ ...inputStyle, paddingRight: '32px' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7c7b99', fontSize: '13px' }}>円</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>
                  単価の補足
                </label>
                <textarea
                  value={form.priceNote}
                  onChange={(e) => setForm((f) => ({ ...f, priceNote: e.target.value }))}
                  rows={3}
                  placeholder="例）10分を超えるYouTube動画の場合10,000円加算、修正は2回まで無料　など"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '10px' }}>
                  受注状況
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {([
                    { value: 'open', label: '受付中', desc: '新しい依頼を受け付けています' },
                    { value: 'one_slot', label: '要相談', desc: '納期等によっては受注できる場合があります' },
                    { value: 'full', label: '現在対応不可', desc: '現在新規の依頼は受け付けていません' },
                  ] as const).map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, availability: value }))}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: form.availability === value ? '2px solid #c77dff' : '1px solid rgba(255,255,255,0.1)',
                        background: form.availability === value ? 'rgba(199,125,255,0.12)' : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div>
                        <div style={{ color: '#f0eff8', fontWeight: '600', fontSize: '14px' }}>{label}</div>
                        <div style={{ color: '#7c7b99', fontSize: '12px' }}>{desc}</div>
                      </div>
                      {form.availability === value && <span style={{ color: '#c77dff' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>
                  納品にかかる期間（概算で可）
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={form.deliveryDays}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryDays: e.target.value }))}
                    placeholder="例: 2〜4週間"
                    maxLength={30}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* エラー */}
          {error && (
            <p style={{
              color: '#ff6b9d',
              fontSize: '13px',
              background: 'rgba(255,107,157,0.1)',
              border: '1px solid rgba(255,107,157,0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginTop: '16px',
            }}>
              {error}
            </p>
          )}

          {/* ナビゲーション */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => { if (!loading) setStep((s) => (s - 1) as Step) }}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#a9a8c0',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ← 戻る
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext() || loading}
              style={{
                flex: 2,
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: !canNext() || loading
                  ? 'rgba(199,125,255,0.3)'
                  : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: !canNext() || loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading
                ? '保存中...'
                : (isCreator && step < 5) || (!isCreator && step < 2)
                  ? '次へ →'
                  : '登録を完了する'}
            </button>
          </div>

          {/* スキップリンク（ステップ4・5のみ） */}
          {(step === 4 || step === 5) && (
            <p style={{ textAlign: 'center', marginTop: '12px' }}>
              <button
                type="button"
                onClick={step === 5 ? handleSubmit : () => setStep((s) => (s + 1) as Step)}
                disabled={loading}
                style={{ background: 'none', border: 'none', color: '#7c7b99', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', textDecoration: 'underline' }}
              >
                {step === 5 ? 'スキップして登録を完了する' : 'スキップ'}
              </button>
            </p>
          )}
        </div>
      </div>

      {showBioChat && (
        <BioChatModal
          creatorTypes={form.creatorTypes}
          skills={form.skills}
          onApply={(bio) => setForm((f) => ({ ...f, bio: bio.slice(0, 400) }))}
          onClose={() => setShowBioChat(false)}
        />
      )}
    </div>
  )
}

// スタイル定数
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(199,125,255,0.25)',
  background: 'rgba(255,255,255,0.05)',
  color: '#f0eff8',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
}


const suggestionStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: '#7c7b99',
  fontSize: '13px',
  cursor: 'pointer',
}

const tagStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: '20px',
  background: 'rgba(199,125,255,0.2)',
  color: '#c77dff',
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
}

const addButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  borderRadius: '12px',
  border: '2px dashed rgba(199,125,255,0.3)',
  background: 'transparent',
  color: '#c77dff',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer',
}
