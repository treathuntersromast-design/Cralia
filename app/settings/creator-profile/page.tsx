'use client'

import { useState, useEffect } from 'react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type PricingPlan = {
  label:       string
  price:       string
  description: string
}

const EMPTY_PLAN: PricingPlan = { label: '', price: '', description: '' }

const inputCls = 'w-full h-10 px-3 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition'

export default function CreatorProfileSettingsPage() {
  const [orderLimit,    setOrderLimit]    = useState('')
  const [plans,         setPlans]         = useState<PricingPlan[]>([])
  const [aiSuggEnabled, setAiSuggEnabled] = useState(true)
  const [loading,       setLoading]       = useState(false)
  const [fetching,      setFetching]      = useState(true)
  const [saved,         setSaved]         = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/creator-profile').then((r) => r.json()),
      fetch('/api/settings/ai-suggestion').then((r) => r.json()),
    ]).then(([cp, ai]) => {
      if (cp.orderLimit != null) setOrderLimit(String(cp.orderLimit))
      if (Array.isArray(cp.pricingPlans)) {
        setPlans(cp.pricingPlans.map((p: { label: string; price: number; description: string }) => ({
          label: p.label, price: String(p.price), description: p.description ?? '',
        })))
      }
      if (typeof ai.enabled === 'boolean') setAiSuggEnabled(ai.enabled)
    }).catch(() => {}).finally(() => setFetching(false))
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSaved(false)
    const [res1, res2] = await Promise.all([
      fetch('/api/settings/creator-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderLimit:   orderLimit !== '' ? parseInt(orderLimit, 10) : null,
          pricingPlans: plans.map((p) => ({
            label: p.label, price: p.price !== '' ? parseInt(p.price, 10) : 0, description: p.description,
          })),
        }),
      }),
      fetch('/api/settings/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: aiSuggEnabled }),
      }),
    ])
    setLoading(false)
    if (!res1.ok) { const d = await res1.json(); setError(d.error ?? '保存に失敗しました'); return }
    if (!res2.ok) { const d = await res2.json(); setError(d.error ?? 'AI設定の保存に失敗しました'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const addPlan    = () => { if (plans.length < 10) setPlans([...plans, { ...EMPTY_PLAN }]) }
  const removePlan = (i: number) => setPlans(plans.filter((_, idx) => idx !== i))
  const updatePlan = (i: number, field: keyof PricingPlan, value: string) =>
    setPlans(plans.map((p, idx) => idx === i ? { ...p, [field]: value } : p))

  if (fetching) {
    return (
      <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center">
        <p className="text-[var(--c-text-3)]">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <div className="mb-8">
          <h1 className="text-[24px] font-bold mb-1">クリエイター設定</h1>
          <p className="text-[14px] text-[var(--c-text-3)]">受注上限・料金プランを設定します</p>
        </div>

        {/* 同時受注上限 */}
        <Card bordered padded className="mb-4">
          <h2 className="text-[12px] font-bold text-[var(--c-text-3)] tracking-wider uppercase mb-4">同時受注上限</h2>
          <p className="text-[13px] text-[var(--c-text-2)] leading-[1.6] mb-4">
            同時に受け付ける依頼の最大件数を設定します。未設定の場合は無制限です。
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number" value={orderLimit} onChange={(e) => setOrderLimit(e.target.value)}
              placeholder="例: 3" min={1} max={999} className={`${inputCls} w-[120px]`}
            />
            <span className="text-[13px] text-[var(--c-text-3)]">件まで（空欄 = 無制限）</span>
          </div>
        </Card>

        {/* AIクリエイター提案トグル */}
        <Card bordered padded className="mb-4">
          <h2 className="text-[12px] font-bold text-[var(--c-text-3)] tracking-wider uppercase mb-4">AIクリエイター提案</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-[14px] mb-1">依頼者へのAI提案を許可する</p>
              <p className="text-[12px] text-[var(--c-text-3)] leading-[1.6]">
                無効にすると、依頼者が依頼内容からAIでクリエイターを探す際にあなたが提案対象から除外されます
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAiSuggEnabled((v) => !v)}
              role="switch"
              aria-checked={aiSuggEnabled ? 'true' : 'false'}
              aria-label="AIクリエイター提案を許可する"
              className={`relative shrink-0 w-[52px] h-[28px] rounded-[14px] border-none cursor-pointer transition-colors ${aiSuggEnabled ? 'bg-brand' : 'bg-[var(--c-border-2)]'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${aiSuggEnabled ? 'left-[28px]' : 'left-1'}`} />
            </button>
          </div>
        </Card>

        {/* 料金プラン */}
        <Card bordered padded className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[12px] font-bold text-[var(--c-text-3)] tracking-wider uppercase">料金プラン</h2>
            <span className="text-[12px] text-[var(--c-text-4)]">{plans.length}/10</span>
          </div>
          <p className="text-[13px] text-[var(--c-text-2)] leading-[1.6] mb-5">
            プロフィールページに表示される料金プランです。依頼者の参考になります。
          </p>

          <div className="flex flex-col gap-3 mb-4">
            {plans.map((plan, i) => (
              <div key={i} className="bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-[12px] p-4">
                <div className="flex gap-2.5 mb-2.5">
                  <div className="flex-[2]">
                    <label className="block text-[11px] font-semibold text-[var(--c-text-3)] mb-1.5">プラン名 <span className="text-[#dc2626]">*</span></label>
                    <input
                      value={plan.label} onChange={(e) => updatePlan(i, 'label', e.target.value)}
                      placeholder="例: ライトプラン" maxLength={50} className={inputCls}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-[var(--c-text-3)] mb-1.5">料金（円）</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--c-text-3)] pointer-events-none">¥</span>
                      <input
                        type="number" value={plan.price} onChange={(e) => updatePlan(i, 'price', e.target.value)}
                        placeholder="5000" min={0} className={`${inputCls} pl-7`}
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-2.5">
                  <label className="block text-[11px] font-semibold text-[var(--c-text-3)] mb-1.5">説明（任意）</label>
                  <input
                    value={plan.description} onChange={(e) => updatePlan(i, 'description', e.target.value)}
                    placeholder="例: イラスト1枚・修正2回まで" maxLength={200} className={inputCls}
                  />
                </div>
                <button
                  type="button" onClick={() => removePlan(i)}
                  className="text-[12px] text-[#dc2626] bg-transparent border-none cursor-pointer p-0 hover:underline"
                >
                  削除
                </button>
              </div>
            ))}
          </div>

          {plans.length < 10 && (
            <button
              type="button" onClick={addPlan}
              className="w-full h-10 rounded-[8px] border border-dashed border-brand/30 bg-transparent text-brand text-[13px] font-semibold cursor-pointer hover:bg-brand-soft transition-colors"
            >
              ＋ プランを追加
            </button>
          )}
        </Card>

        {error && (
          <p className="text-[13px] text-[#dc2626] bg-[#dc2626]/8 border border-[#dc2626]/25 rounded-[8px] px-3.5 py-2.5 mb-4">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-[13px] text-[#16a34a] bg-[#4ade80]/8 border border-[#4ade80]/25 rounded-[8px] px-3.5 py-2.5 mb-4">
            保存しました
          </p>
        )}

        <Button type="button" variant="primary" size="lg" loading={loading} onClick={handleSave} className="w-full">
          設定を保存する
        </Button>
      </Container>
    </div>
  )
}
