'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Calendar, Check, Lock, Info } from 'lucide-react'
import RequestDraftAssistant from '@/components/RequestDraftAssistant'
import { AppHeader } from '@/components/layout/AppHeader'
import { Button } from '@/components/ui/Button'

const inputCls = 'w-full h-10 px-3.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition'

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

  const [calConnected,    setCalConnected]    = useState(false)
  const [suggesting,      setSuggesting]      = useState(false)
  const [suggestion,      setSuggestion]      = useState<{ deadline: string; summary: string } | null>(null)
  const [suggestError,    setSuggestError]    = useState<string | null>(null)
  const [workingDays,     setWorkingDays]     = useState(10)

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

  useEffect(() => {
    fetch('/api/profile/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.display_name) setDisplayName(d.display_name) })
      .catch(() => {})
  }, [])

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
      <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#dc2626] mb-4">依頼先が指定されていません</p>
          <Link href="/search" className="text-brand no-underline hover:underline">
            クリエイターを探す →
          </Link>
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

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />

      <div className="max-w-[1160px] mx-auto px-6 py-12 flex items-start gap-8">
        {/* 左カラム：フォーム */}
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="text-[24px] font-bold mb-2">依頼を送る</h1>
            <p className="text-[14px] text-[var(--c-text-2)]">
              依頼先：<span className="text-brand font-bold">{creatorName}</span> さん
            </p>
            {draftSaved && (
              <p className="text-[#16a34a] text-[12px] mt-1.5 flex items-center gap-1">
                <Check size={12} aria-hidden />
                下書きを自動保存しました
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* 有償/無償区分 */}
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-2.5">
                依頼の種別 <span className="text-[#dc2626]">*</span>
              </label>
              <div className="flex gap-2.5">
                {([
                  { value: 'paid', label: '有償依頼', desc: '報酬あり' },
                  { value: 'free', label: '無償依頼', desc: '報酬なし（コラボ等）' },
                ] as const).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOrderType(value)}
                    className={`flex-1 p-3.5 rounded-[12px] text-left border-2 transition-all ${
                      orderType === value
                        ? value === 'paid'
                          ? 'border-brand bg-brand-soft'
                          : 'border-[#60a5fa]/50 bg-[#60a5fa]/10'
                        : 'border-[var(--c-border-2)] bg-[var(--c-surface)]'
                    }`}
                  >
                    <p className={`font-bold text-[14px] mb-0.5 ${
                      orderType === value
                        ? value === 'paid' ? 'text-brand' : 'text-[#60a5fa]'
                        : 'text-[var(--c-text)]'
                    }`}>
                      {label}
                    </p>
                    <p className="text-[12px] text-[var(--c-text-3)] m-0">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* タイトル */}
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-2">
                依頼タイトル <span className="text-[#dc2626]">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: MVのイラスト制作をお願いしたい"
                maxLength={100}
                required
                className={inputCls}
              />
              <p className="text-[var(--c-text-4)] text-[12px] mt-1 text-right">{title.length}/100</p>
            </div>

            {/* 依頼内容 */}
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-2">
                依頼内容 <span className="text-[#dc2626]">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={'依頼の詳細を記入してください。\n\n例:\n- 曲のジャンル・雰囲気\n- 参考にしたい作品\n- ご希望のスタイルや色合い\n- 使用用途（YouTube、ライブ配信など）'}
                maxLength={2000}
                required
                rows={10}
                className="w-full px-3.5 py-2.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition resize-y leading-[1.6]"
              />
              <p className="text-[var(--c-text-4)] text-[12px] mt-1 text-right">{description.length}/2000</p>
            </div>

            {/* 予算・納期 */}
            <div className={`grid gap-4 ${orderType === 'paid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {orderType === 'paid' && (
                <div>
                  <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-2">
                    予算（任意）
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--c-text-3)] text-[14px]">¥</span>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="10000"
                      min={0}
                      className={`${inputCls} pl-7`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="deadline-input" className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-2">
                  希望納期（任意）
                </label>
                <input
                  id="deadline-input"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  title="希望納期"
                  className={inputCls}
                />
              </div>
            </div>

            {/* 納期タイトネスアラート */}
            {deadlineWarning && (
              <div className={`flex gap-3 items-start p-3.5 rounded-[12px] border ${
                deadlineWarning.level === 'danger'
                  ? 'bg-[#dc2626]/8 border-[#dc2626]/35'
                  : 'bg-[#fbbf24]/8 border-[#fbbf24]/35'
              }`}>
                <AlertTriangle
                  size={18}
                  className={`shrink-0 mt-0.5 ${deadlineWarning.level === 'danger' ? 'text-[#dc2626]' : 'text-[#fbbf24]'}`}
                  aria-hidden
                />
                <div>
                  <p className={`font-bold text-[13px] mb-0.5 ${deadlineWarning.level === 'danger' ? 'text-[#dc2626]' : 'text-[#fbbf24]'}`}>
                    {deadlineWarning.level === 'danger' ? '納期がタイトです' : '納期の余裕がやや少ないです'}
                  </p>
                  <p className="text-[13px] text-[var(--c-text-2)] leading-[1.6] m-0">
                    {deadlineWarning.message}
                  </p>
                </div>
              </div>
            )}

            {/* Googleカレンダー連携：納期提案 */}
            {calConnected && (
              <div className="bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-[14px] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-[#16a34a]" aria-hidden />
                  <p className="font-bold text-[14px] text-[#16a34a] m-0">カレンダーを考慮した納期提案</p>
                </div>
                <p className="text-[var(--c-text-3)] text-[13px] mb-3.5 leading-[1.6]">
                  {creatorName}さんのGoogleカレンダーに登録された不在予定・日本の祝日を自動的にスキップして、現実的な納期を提案します。
                </p>

                <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
                  <span className="text-[var(--c-text-2)] text-[13px] shrink-0">必要な作業日数：</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {[3, 5, 7, 10, 14, 21].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setWorkingDays(d)}
                        className={`px-3 py-1 rounded-full text-[13px] font-semibold transition-colors ${
                          workingDays === d
                            ? 'bg-[#4ade80]/25 text-[#16a34a] border-0'
                            : 'border border-[var(--c-border-2)] bg-transparent text-[var(--c-text-3)]'
                        }`}
                      >
                        {d}日
                      </button>
                    ))}
                  </div>
                </div>

                {suggestError && (
                  <p className="text-[#dc2626] text-[13px] mb-2.5 bg-[#dc2626]/8 rounded-[8px] px-3 py-2">
                    {suggestError}
                  </p>
                )}

                {suggestion && (
                  <div className="bg-[#4ade80]/10 border border-[#4ade80]/25 rounded-[10px] p-3.5 mb-3">
                    <p className="text-[#16a34a] font-bold text-[15px] mb-1">
                      提案納期: {new Date(suggestion.deadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-[var(--c-text-3)] text-[12px] mb-3">{suggestion.summary}</p>
                    <button
                      type="button"
                      onClick={applyDeadline}
                      className="px-4 py-2 rounded-[8px] border-0 bg-[#4ade80] text-[#0a3d2b] text-[13px] font-bold cursor-pointer"
                    >
                      この日程を使う
                    </button>
                  </div>
                )}

                {!suggestion && (
                  <button
                    type="button"
                    onClick={handleSuggestDeadline}
                    disabled={suggesting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[14px] font-bold border border-[#4ade80]/40 bg-[#4ade80]/10 text-[#16a34a] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors hover:bg-[#4ade80]/15"
                  >
                    <Calendar size={15} aria-hidden />
                    {suggesting ? '計算中...' : '納期を提案してもらう'}
                  </button>
                )}
              </div>
            )}

            {/* ポートフォリオ掲載許可 */}
            <div className="bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-[14px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-[14px] mb-1">ポートフォリオへの掲載許可</p>
                  <p className="text-[12px] text-[var(--c-text-3)] leading-[1.6] m-0">
                    クリエイターが納品物を自身のポートフォリオとして公開することを許可します
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPortfolioAllowed(v => !v)}
                  role="switch"
                  aria-checked={(portfolioAllowed ? 'true' : 'false') as 'true' | 'false'}
                  aria-label="ポートフォリオへの掲載許可"
                  className={`relative shrink-0 w-[52px] h-7 rounded-full border-0 transition-colors ${portfolioAllowed ? 'bg-brand' : 'bg-[var(--c-border-2)]'}`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${portfolioAllowed ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <p className={`mt-2.5 text-[12px] leading-[1.6] px-3 py-2 rounded-[8px] border flex items-center gap-1.5 ${
                portfolioAllowed
                  ? 'bg-brand-soft text-brand border-brand/20'
                  : 'bg-[var(--c-surface)] text-[var(--c-text-3)] border-[var(--c-border)]'
              }`}>
                {portfolioAllowed ? <Check size={13} aria-hidden /> : <Lock size={13} aria-hidden />}
                {portfolioAllowed
                  ? '掲載を許可します — クリエイターは納品物をポートフォリオに使用できます'
                  : '掲載を許可しない（初期設定）— 納品物の外部公開はできません'}
              </p>
            </div>

            {/* 著作権・権利同意 */}
            <div className={`bg-[var(--c-surface-2)] rounded-[14px] p-5 border transition-colors ${copyrightAgreed ? 'border-[#4ade80]/30' : 'border-[var(--c-border)]'}`}>
              <p className="font-bold text-[14px] mb-2.5">著作権・権利に関する同意事項</p>
              <ul className="text-[var(--c-text-2)] text-[13px] leading-[1.8] mb-3.5 pl-5">
                <li>クリエイターの著作者人格権（氏名表示権・同一性保持権）は譲渡できないことを理解しています</li>
                <li>成果物の著作権の帰属（譲渡か利用許諾か）は別途クリエイターと合意します</li>
                <li>第三者の著作物を含む依頼の場合、著作権侵害のリスクは依頼者が負います</li>
                <li>依頼内容が法令・公序良俗に違反しないことを確認しています</li>
              </ul>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyrightAgreed}
                  onChange={(e) => setCopyrightAgreed(e.target.checked)}
                  className="mt-0.5 accent-brand w-4 h-4 shrink-0 cursor-pointer"
                />
                <span className={`text-[13px] font-semibold leading-[1.5] ${copyrightAgreed ? 'text-[#16a34a]' : 'text-[var(--c-text-2)]'}`}>
                  上記の著作権・権利に関する事項を確認し、同意します{' '}
                  <span className="text-[#dc2626]">*</span>
                </span>
              </label>
            </div>

            {/* 注意事項 */}
            <div className="bg-brand-soft border border-brand/15 rounded-[12px] p-4">
              <p className="text-[var(--c-text-2)] text-[13px] leading-[1.7] m-0 flex items-start gap-2">
                <Info size={14} className="text-brand shrink-0 mt-0.5" aria-hidden />
                <span>
                  依頼を送ると、クリエイターに通知が届きます。承認・辞退はクリエイター側で行います。
                  予算・納期はあくまで希望目安です。詳細はクリエイターとの合意のうえで確定されます。
                </span>
              </p>
            </div>

            {error && (
              <p className="text-[#dc2626] text-[14px] bg-[#dc2626]/8 border border-[#dc2626]/30 rounded-[10px] px-4 py-3 m-0">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Link
                href={`/profile/${creatorId}`}
                className="flex-1 h-12 flex items-center justify-center rounded-[12px] border border-[var(--c-border-2)] text-[var(--c-text-2)] text-[14px] font-semibold no-underline hover:bg-[var(--c-surface)] transition-colors"
              >
                キャンセル
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!copyrightAgreed}
                loading={loading}
                className="flex-[2]"
              >
                依頼を送る
              </Button>
            </div>
          </form>
        </div>

        {/* 右カラム：スティッキー AI パネル */}
        <div className="w-[420px] shrink-0 sticky top-6 h-[calc(100vh-48px)]">
          <RequestDraftAssistant
            sidebar
            creatorName={creatorName}
            displayName={displayName}
            existingDraft={description}
            onApplyDraft={(draft) => setDescription(draft)}
          />
        </div>
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
