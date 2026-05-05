'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CREATOR_TYPES } from '@/lib/constants/lists'
import { VALIDATION } from '@/lib/constants/validation'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import CreatorListingDraftAssistant from '@/components/CreatorListingDraftAssistant'

const inputCls = 'w-full h-10 px-3.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition'

export default function CreatorListingsNewPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title:       '',
    description: '',
    orderType:   'paid' as 'paid' | 'free',
    priceMin:    '',
    priceMax:    '',
  })
  const [creatorTypes, setCreatorTypes] = useState<string[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const toggleType = (t: string) =>
    setCreatorTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('タイトルを入力してください'); return }
    if (creatorTypes.length === 0) { setError('対応するクリエイタータイプを1つ以上選択してください'); return }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/creator-listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:        form.title.trim(),
        description:  form.description.trim() || null,
        creatorTypes,
        orderType:    form.orderType,
        priceMin:     form.priceMin ? parseInt(form.priceMin, 10) : null,
        priceMax:     form.priceMax ? parseInt(form.priceMax, 10) : null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '投稿に失敗しました')
      setLoading(false)
      return
    }

    router.push('/creator-listings?posted=1')
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <div className="mb-8">
          <h1 className="text-[26px] font-bold mb-1.5">仕事募集を投稿する</h1>
          <p className="text-[14px] text-[var(--c-text-3)]">
            あなたのスキルをアピールして依頼者からの連絡を待ちましょう
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card bordered padded>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              {/* タイトル */}
              <div>
                <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-1.5">
                  タイトル <span className="text-[#dc2626] text-[11px]">必須</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例: イラスト・キャラクターデザインをお受けします"
                  maxLength={VALIDATION.CREATOR_LISTING_TITLE_MAX}
                  className={inputCls}
                />
                <p className="text-[12px] text-[var(--c-text-4)] mt-1">
                  {form.title.length} / {VALIDATION.CREATOR_LISTING_TITLE_MAX}文字
                </p>
              </div>

              {/* 詳細 */}
              <div>
                <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-1.5">
                  詳細・アピール文
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="得意なジャンル・スタイル、過去の実績、対応可能な制作物の仕様などを記載してください"
                  maxLength={VALIDATION.CREATOR_LISTING_DESC_MAX}
                  rows={7}
                  className="w-full px-3.5 py-2.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition resize-y leading-[1.7]"
                />
                <p className="text-[12px] text-[var(--c-text-4)] mt-1">
                  {form.description.length} / {VALIDATION.CREATOR_LISTING_DESC_MAX}文字
                </p>
              </div>

              {/* クリエイタータイプ */}
              <div>
                <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-2.5">
                  あなたのクリエイタータイプ{' '}
                  <span className="text-[#dc2626] text-[11px]">必須（複数選択可）</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CREATOR_TYPES.map((t) => {
                    const active = creatorTypes.includes(t)
                    return (
                      <button key={t} type="button" onClick={() => toggleType(t)}
                        className={`px-4 py-1.5 rounded-full text-[13px] transition-colors ${active ? 'border-2 border-brand bg-brand-soft text-brand font-bold' : 'border border-[var(--c-border)] text-[var(--c-text-3)] hover:bg-[var(--c-surface)]'}`}>
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 有償/無償 */}
              <div>
                <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-2.5">
                  報酬の種別
                </label>
                <div className="flex gap-2.5">
                  {(['paid', 'free'] as const).map((v) => {
                    const active = form.orderType === v
                    return (
                      <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, orderType: v }))}
                        className={`px-6 py-2 rounded-[12px] text-[14px] transition-colors ${active ? 'border-2 border-brand bg-brand-soft text-brand font-bold' : 'border border-[var(--c-border)] text-[var(--c-text-3)] hover:bg-[var(--c-surface)]'}`}>
                        {v === 'paid' ? '有償' : '無償'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 価格帯（有償時のみ） */}
              {form.orderType === 'paid' && (
                <div>
                  <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-1.5">
                    価格帯（円）
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={form.priceMin}
                      onChange={(e) => setForm((f) => ({ ...f, priceMin: e.target.value }))}
                      placeholder="下限（例: 3000）"
                      min={0}
                      className={`${inputCls} max-w-[200px]`}
                    />
                    <span className="text-[var(--c-text-3)]">〜</span>
                    <input
                      type="number"
                      value={form.priceMax}
                      onChange={(e) => setForm((f) => ({ ...f, priceMax: e.target.value }))}
                      placeholder="上限（例: 20000）"
                      min={0}
                      className={`${inputCls} max-w-[200px]`}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-[13px] text-[#dc2626] bg-[#dc2626]/8 border border-[#dc2626]/25 rounded-[8px] px-3.5 py-2.5 m-0">
                  {error}
                </p>
              )}

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                仕事募集を投稿する
              </Button>
            </form>
          </Card>

          {/* AI アシスタント */}
          <div className="h-[600px]">
            <CreatorListingDraftAssistant
              displayName=""
              existingDraft={form.description}
              onApplyDraft={(draft) => setForm((f) => ({ ...f, description: draft }))}
              sidebar
            />
          </div>
        </div>
      </Container>
    </div>
  )
}
