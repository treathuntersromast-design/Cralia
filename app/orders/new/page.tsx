'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import RequestDraftAssistant from '@/components/RequestDraftAssistant'

function NewOrderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const creatorId   = searchParams.get('creator') ?? ''
  const creatorName = searchParams.get('creatorName') ?? 'クリエイター'

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [budget,      setBudget]      = useState('')
  const [deadline,    setDeadline]    = useState('')
  const [orderType,         setOrderType]         = useState<'paid' | 'free'>('paid')
  const [portfolioAllowed,  setPortfolioAllowed]  = useState(false)
  const [copyrightAgreed,   setCopyrightAgreed]   = useState(false)
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [displayName,       setDisplayName]       = useState('')
  const [draftSaved,        setDraftSaved]        = useState(false)

  const DRAFT_KEY = `order_draft_${creatorId}`

  // localStorage から下書き復元
  useEffect(() => {
    if (!creatorId) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as Record<string, unknown>
      if (typeof draft.title       === 'string') setTitle(draft.title)
      if (typeof draft.description === 'string') setDescription(draft.description)
      if (typeof draft.budget      === 'string') setBudget(draft.budget)
      if (typeof draft.deadline    === 'string') setDeadline(draft.deadline)
      if (draft.orderType === 'free' || draft.orderType === 'paid') setOrderType(draft.orderType)
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorId])

  // フィールド変更時に自動保存（debounce: 800ms）
  useEffect(() => {
    if (!creatorId) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description, budget, deadline, orderType }))
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      } catch { /* ignore */ }
    }, 800)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, budget, deadline, orderType])

  // Googleカレンダー連携チェック
  const [calConnected,    setCalConnected]    = useState(false)
  const [suggesting,      setSuggesting]      = useState(false)
  const [suggestion,      setSuggestion]      = useState<{ deadline: string; summary: string } | null>(null)
  const [suggestError,    setSuggestError]    = useState<string | null>(null)
  const [workingDays,     setWorkingDays]     = useState(10)

  // 納期チェック
  const [deadlineWarning, setDeadlineWarning] = useState<{
    level: 'danger' | 'caution'
    message: string
  } | null>(null)

  useEffect(() => {
    if (!creatorId) return
    fetch(`/api/calendar/status?creatorId=${encodeURIComponent(creatorId)}`)
      .then((r) => r.json())
      .then((d) => setCalConnected(d.connected ?? false))
      .catch(() => setCalConnected(false))
  }, [creatorId])

  // ログインユーザーの表示名を取得（AI添削に使用）
  useEffect(() => {
    fetch('/api/profile/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.display_name) setDisplayName(d.display_name) })
      .catch(() => {})
  }, [])

  // 納期が変わるたびに実現可能性をチェック
  useEffect(() => {
    if (!deadline || !creatorId) { setDeadlineWarning(null); return }
    const params = new URLSearchParams({ creatorId, deadline })
    fetch(`/api/orders/check-deadline?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.warningLevel) {
          setDeadlineWarning({ level: d.warningLevel, message: d.message })
        } else {
          setDeadlineWarning(null)
        }
      })
      .catch(() => setDeadlineWarning(null))
  }, [deadline, creatorId])

  if (!creatorId) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0eff8' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', marginBottom: '16px' }}>依頼先が指定されていません</p>
          <Link href="/search" style={{ color: '#c77dff', textDecoration: 'none' }}>クリエイターを探す →</Link>
        </div>
      </div>
    )
  }

  const handleSuggestDeadline = async () => {
    setSuggesting(true)
    setSuggestError(null)
    setSuggestion(null)

    const res = await fetch('/api/deadline/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_id: creatorId, working_days_required: workingDays }),
    })

    const data = await res.json()
    setSuggesting(false)

    if (!res.ok) {
      setSuggestError(data.error ?? '提案の取得に失敗しました')
      return
    }

    setSuggestion({ deadline: data.deadline, summary: data.summary })
  }

  const applyDeadline = () => {
    if (suggestion) {
      setDeadline(suggestion.deadline)
      setSuggestion(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorId, title, description, budget, deadline, orderType, portfolioAllowed, copyrightAgreed }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '依頼の送信に失敗しました')
      setLoading(false)
      return
    }

    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    router.push(`/orders/${data.id}`)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(255,255,255,0.05)',
    color: '#f0eff8', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', color: '#f0eff8' }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          Cralia
        </Link>
        <Link href={`/profile/${creatorId}?back=/orders`} style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>
          ← プロフィールへ戻る
        </Link>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px' }}>依頼を送る</h1>
          <p style={{ color: '#a9a8c0', margin: 0, fontSize: '14px' }}>
            依頼先：<span style={{ color: '#c77dff', fontWeight: '700' }}>{creatorName}</span> さん
          </p>
          {draftSaved && (
            <p style={{ color: '#4ade80', fontSize: '12px', margin: '6px 0 0' }}>✓ 下書きを自動保存しました</p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 有償/無償区分 */}
          <div>
            <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>
              依頼の種別 <span style={{ color: '#f87171' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {([
                { value: 'paid', label: '有償依頼', desc: '報酬あり', color: '#c77dff', bg: 'rgba(199,125,255,0.12)', border: 'rgba(199,125,255,0.5)' },
                { value: 'free', label: '無償依頼', desc: '報酬なし（コラボ等）', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.5)' },
              ] as const).map(({ value, label, desc, color, bg, border }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOrderType(value)}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: '12px', textAlign: 'left',
                    border: `2px solid ${orderType === value ? border : 'rgba(255,255,255,0.1)'}`,
                    background: orderType === value ? bg : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <p style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '14px', color: orderType === value ? color : '#f0eff8' }}>
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#7c7b99' }}>{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div>
            <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              依頼タイトル <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: MVのイラスト制作をお願いしたい"
              maxLength={100}
              required
              style={inputStyle}
            />
            <p style={{ color: '#5c5b78', fontSize: '12px', margin: '4px 0 0', textAlign: 'right' }}>{title.length}/100</p>
          </div>

          {/* 依頼内容 */}
          <div>
            <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              依頼内容 <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={'依頼の詳細を記入してください。\n\n例:\n- 曲のジャンル・雰囲気\n- 参考にしたい作品\n- ご希望のスタイルや色合い\n- 使用用途（YouTube、ライブ配信など）'}
              maxLength={2000}
              required
              rows={10}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
            />
            <p style={{ color: '#5c5b78', fontSize: '12px', margin: '4px 0 0', textAlign: 'right' }}>{description.length}/2000</p>
          </div>

          {/* 予算・納期 */}
          <div style={{ display: 'grid', gridTemplateColumns: orderType === 'paid' ? '1fr 1fr' : '1fr', gap: '16px' }}>
            {orderType === 'paid' && (
              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  予算（任意）
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#7c7b99', fontSize: '14px' }}>¥</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="10000"
                    min={0}
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                  />
                </div>
              </div>
            )}

            {/* 納期フィールド */}
            <div>
              <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                希望納期（任意）
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* 納期タイトネスアラート（依頼者向け） */}
          {deadlineWarning && (
            <div style={{
              display: 'flex', gap: '12px', alignItems: 'flex-start',
              padding: '14px 16px', borderRadius: '12px',
              background: deadlineWarning.level === 'danger'
                ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.08)',
              border: `1px solid ${deadlineWarning.level === 'danger'
                ? 'rgba(248,113,113,0.35)' : 'rgba(251,191,36,0.35)'}`,
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>
                {deadlineWarning.level === 'danger' ? '⚠️' : '💡'}
              </span>
              <div>
                <p style={{
                  margin: '0 0 2px', fontWeight: '700', fontSize: '13px',
                  color: deadlineWarning.level === 'danger' ? '#f87171' : '#fbbf24',
                }}>
                  {deadlineWarning.level === 'danger' ? '納期がタイトです' : '納期の余裕がやや少ないです'}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#a9a8c0', lineHeight: '1.6' }}>
                  {deadlineWarning.message}
                </p>
              </div>
            </div>
          )}

          {/* Googleカレンダー連携クリエイター向け：納期提案ブロック */}
          {calConnected && (
            <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '14px', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>📅</span>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#4ade80' }}>
                  カレンダーを考慮した納期提案
                </p>
              </div>
              <p style={{ color: '#7c7b99', fontSize: '13px', margin: '0 0 14px', lineHeight: '1.6' }}>
                {creatorName}さんのGoogleカレンダーに登録された不在予定・日本の祝日を自動的にスキップして、現実的な納期を提案します。
              </p>

              {/* 作業日数セレクタ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ color: '#a9a8c0', fontSize: '13px', flexShrink: 0 }}>必要な作業日数：</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[3, 5, 7, 10, 14, 21].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setWorkingDays(d)}
                      style={{
                        padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                        border: workingDays === d ? 'none' : '1px solid rgba(255,255,255,0.12)',
                        background: workingDays === d ? 'rgba(74,222,128,0.25)' : 'transparent',
                        color: workingDays === d ? '#4ade80' : '#7c7b99',
                        cursor: 'pointer',
                      }}
                    >
                      {d}日
                    </button>
                  ))}
                </div>
              </div>

              {/* 提案エラー */}
              {suggestError && (
                <p style={{ color: '#f87171', fontSize: '13px', margin: '0 0 10px', background: 'rgba(248,113,113,0.08)', borderRadius: '8px', padding: '8px 12px' }}>
                  {suggestError}
                </p>
              )}

              {/* 提案結果 */}
              {suggestion && (
                <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px' }}>
                  <p style={{ color: '#4ade80', fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}>
                    提案納期: {new Date(suggestion.deadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p style={{ color: '#7c7b99', fontSize: '12px', margin: '0 0 12px' }}>{suggestion.summary}</p>
                  <button
                    type="button"
                    onClick={applyDeadline}
                    style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#4ade80', color: '#0d0d14', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    この日程を使う
                  </button>
                </div>
              )}

              {/* 提案ボタン */}
              {!suggestion && (
                <button
                  type="button"
                  onClick={handleSuggestDeadline}
                  disabled={suggesting}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                    border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.1)',
                    color: '#4ade80', cursor: suggesting ? 'not-allowed' : 'pointer', opacity: suggesting ? 0.6 : 1,
                  }}
                >
                  {suggesting ? '計算中...' : '📅 納期を提案してもらう'}
                </button>
              )}
            </div>
          )}

          {/* ポートフォリオ掲載許可 */}
          <div style={{ background: 'rgba(22,22,31,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '14px', color: '#f0eff8' }}>
                  ポートフォリオへの掲載許可
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#7c7b99', lineHeight: '1.6' }}>
                  クリエイターが納品物を自身のポートフォリオとして公開することを許可します
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPortfolioAllowed(v => !v)}
                style={{
                  flexShrink: 0,
                  width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                  background: portfolioAllowed ? 'linear-gradient(135deg, #ff6b9d, #c77dff)' : 'rgba(255,255,255,0.12)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}
                aria-checked={portfolioAllowed ? 'true' : 'false'}
                aria-label="ポートフォリオへの掲載許可"
                role="switch"
              >
                <span style={{
                  position: 'absolute', top: '4px',
                  left: portfolioAllowed ? '28px' : '4px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                }} />
              </button>
            </div>
            <p style={{
              margin: '10px 0 0', fontSize: '12px', lineHeight: '1.6', padding: '8px 12px', borderRadius: '8px',
              background: portfolioAllowed ? 'rgba(199,125,255,0.08)' : 'rgba(255,255,255,0.03)',
              color: portfolioAllowed ? '#c77dff' : '#5c5b78',
              border: `1px solid ${portfolioAllowed ? 'rgba(199,125,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              {portfolioAllowed
                ? '✅ 掲載を許可します — クリエイターは納品物をポートフォリオに使用できます'
                : '🔒 掲載を許可しない（初期設定）— 納品物の外部公開はできません'}
            </p>
          </div>

          {/* AI 依頼文アシスタント */}
          <RequestDraftAssistant
            creatorName={creatorName}
            displayName={displayName}
            existingDraft={description}
            onApplyDraft={(draft) => setDescription(draft)}
          />

          {/* 著作権・権利同意 */}
          <div style={{ background: 'rgba(22,22,31,0.8)', border: `1px solid ${copyrightAgreed ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '18px 20px' }}>
            <p style={{ margin: '0 0 10px', fontWeight: '700', fontSize: '14px', color: '#f0eff8' }}>著作権・権利に関する同意事項</p>
            <ul style={{ color: '#a9a8c0', fontSize: '13px', lineHeight: '1.8', margin: '0 0 14px', paddingLeft: '20px' }}>
              <li>クリエイターの著作者人格権（氏名表示権・同一性保持権）は譲渡できないことを理解しています</li>
              <li>成果物の著作権の帰属（譲渡か利用許諾か）は別途クリエイターと合意します</li>
              <li>第三者の著作物を含む依頼の場合、著作権侵害のリスクは依頼者が負います</li>
              <li>依頼内容が法令・公序良俗に違反しないことを確認しています</li>
            </ul>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={copyrightAgreed}
                onChange={(e) => setCopyrightAgreed(e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#c77dff', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ color: copyrightAgreed ? '#4ade80' : '#a9a8c0', fontSize: '13px', fontWeight: '600', lineHeight: '1.5' }}>
                上記の著作権・権利に関する事項を確認し、同意します <span style={{ color: '#f87171' }}>*</span>
              </span>
            </label>
          </div>

          {/* 注意事項 */}
          <div style={{ background: 'rgba(199,125,255,0.06)', border: '1px solid rgba(199,125,255,0.15)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: '#a9a8c0', fontSize: '13px', lineHeight: '1.7', margin: 0 }}>
              📌 依頼を送ると、クリエイターに通知が届きます。承認・辞退はクリエイター側で行います。<br />
              予算・納期はあくまで希望目安です。詳細はクリエイターとの合意のうえで確定されます。
            </p>
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '12px 16px', margin: 0 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              href={`/profile/${creatorId}`}
              style={{ flex: 1, padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#a9a8c0', fontSize: '14px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' }}
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={loading || !copyrightAgreed}
              style={{ flex: 2, padding: '12px 24px', borderRadius: '12px', border: 'none', background: loading || !copyrightAgreed ? 'rgba(199,125,255,0.4)' : 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: loading || !copyrightAgreed ? 'not-allowed' : 'pointer' }}
            >
              {loading ? '送信中...' : '依頼を送る'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewOrderContent />
    </Suspense>
  )
}
