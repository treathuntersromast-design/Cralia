'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CREATOR_TYPES } from '@/lib/constants/lists'
import { VALIDATION } from '@/lib/constants/validation'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const inputCls = 'w-full h-10 px-3.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition'

export default function JobsNewPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    description: '',
    orderType: 'paid' as 'paid' | 'free',
    budgetMin: '',
    budgetMax: '',
    deadline: '',
  })
  const [creatorTypes, setCreatorTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleType = (t: string) =>
    setCreatorTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('タイトルを入力してください'); return }
    if (creatorTypes.length === 0) { setError('募集するクリエイタータイプを1つ以上選択してください'); return }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:        form.title.trim(),
        description:  form.description.trim() || null,
        creatorTypes,
        orderType:    form.orderType,
        budgetMin:    form.budgetMin ? parseInt(form.budgetMin, 10) : null,
        budgetMax:    form.budgetMax ? parseInt(form.budgetMax, 10) : null,
        deadline:     form.deadline || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '投稿に失敗しました')
      setLoading(false)
      return
    }

    router.push(`/jobs?posted=1`)
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <div className="mb-8">
          <h1 className="text-[26px] font-bold mb-1.5">クリエイターを募集する</h1>
          <p className="text-[14px] text-[var(--c-text-3)]">
            案件情報を投稿してクリエイターからの応募を待ちましょう
          </p>
        </div>

        <Card bordered padded>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* タイトル */}
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-1.5">
                案件タイトル <span className="text-[#dc2626] text-[11px]">必須</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例: MVのイラスト制作をお願いしたい"
                maxLength={VALIDATION.JOB_TITLE_MAX}
                className={inputCls}
              />
              <p className="text-[12px] text-[var(--c-text-4)] mt-1">
                {form.title.length} / 100文字
              </p>
            </div>

            {/* 説明 */}
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-1.5">
                案件の詳細
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="依頼内容・制作物の仕様・参考資料・注意事項などを記載してください"
                maxLength={VALIDATION.JOB_DESC_MAX}
                rows={6}
                className="w-full px-3.5 py-2.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition resize-y leading-[1.7]"
              />
              <p className="text-[12px] text-[var(--c-text-4)] mt-1">
                {form.description.length} / 2000文字
              </p>
            </div>

            {/* 募集クリエイタータイプ */}
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-2.5">
                募集するクリエイタータイプ{' '}
                <span className="text-[#dc2626] text-[11px]">必須（複数選択可）</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CREATOR_TYPES.map((t) => {
                  const active = creatorTypes.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleType(t)}
                      className={`px-4 py-1.5 rounded-full text-[13px] transition-colors ${
                        active
                          ? 'border-2 border-brand bg-brand-soft text-brand font-bold'
                          : 'border border-[var(--c-border)] text-[var(--c-text-3)] hover:bg-[var(--c-surface)]'
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 有償/無償 */}
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-2.5">
                報酬の有無
              </label>
              <div className="flex gap-2.5">
                {(['paid', 'free'] as const).map((v) => {
                  const active = form.orderType === v
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, orderType: v }))}
                      className={`px-6 py-2 rounded-[12px] text-[14px] transition-colors ${
                        active
                          ? 'border-2 border-brand bg-brand-soft text-brand font-bold'
                          : 'border border-[var(--c-border)] text-[var(--c-text-3)] hover:bg-[var(--c-surface)]'
                      }`}
                    >
                      {v === 'paid' ? '有償' : '無償'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 予算（有償時のみ） */}
            {form.orderType === 'paid' && (
              <div>
                <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-1.5">
                  予算（円）
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={form.budgetMin}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
                    placeholder="下限（例: 5000）"
                    min={0}
                    className={`${inputCls} max-w-[200px]`}
                  />
                  <span className="text-[var(--c-text-3)]">〜</span>
                  <input
                    type="number"
                    value={form.budgetMax}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
                    placeholder="上限（例: 30000）"
                    min={0}
                    className={`${inputCls} max-w-[200px]`}
                  />
                </div>
              </div>
            )}

            {/* 締切 */}
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] font-semibold mb-1.5">
                希望納期
              </label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className={`${inputCls} max-w-[200px]`}
              />
            </div>

            {error && (
              <p className="text-[13px] text-[#dc2626] bg-[#dc2626]/8 border border-[#dc2626]/25 rounded-[8px] px-3.5 py-2.5 m-0">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              案件を投稿する
            </Button>
          </form>
        </Card>
      </Container>
    </div>
  )
}
