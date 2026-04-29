'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type PricingPlan = {
  label:       string
  price:       string   // フォームでは文字列として扱う
  description: string
}

const EMPTY_PLAN: PricingPlan = { label: '', price: '', description: '' }

export default function CreatorProfileSettingsPage() {
  const [orderLimit,       setOrderLimit]       = useState('')
  const [plans,            setPlans]            = useState<PricingPlan[]>([])
  const [aiSuggEnabled,    setAiSuggEnabled]    = useState(true)
  const [loading,          setLoading]          = useState(false)
  const [fetching,         setFetching]         = useState(true)
  const [saved,            setSaved]            = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/creator-profile').then((r) => r.json()),
      fetch('/api/settings/ai-suggestion').then((r) => r.json()),
    ]).then(([cp, ai]) => {
      if (cp.orderLimit != null) setOrderLimit(String(cp.orderLimit))
      if (Array.isArray(cp.pricingPlans)) {
        setPlans(cp.pricingPlans.map((p: { label: string; price: number; description: string }) => ({
          label:       p.label,
          price:       String(p.price),
          description: p.description ?? '',
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
            label:       p.label,
            price:       p.price !== '' ? parseInt(p.price, 10) : 0,
            description: p.description,
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

    if (!res1.ok) {
      const d = await res1.json()
      setError(d.error ?? '保存に失敗しました')
      return
    }
    if (!res2.ok) {
      const d = await res2.json()
      setError(d.error ?? 'AI設定の保存に失敗しました')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const addPlan = () => {
    if (plans.length >= 10) return
    setPlans([...plans, { ...EMPTY_PLAN }])
  }

  const removePlan = (i: number) => {
    setPlans(plans.filter((_, idx) => idx !== i))
  }

  const updatePlan = (i: number, field: keyof PricingPlan, value: string) => {
    setPlans(plans.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--c-accent-a25)', background: 'var(--c-input-bg)',
    color: 'var(--c-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  }

  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text)' }}>
        読み込み中...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-text)' }}>
      <div style={{ borderBottom: '1px solid var(--c-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--c-accent)', textDecoration: 'none' }}>
          Cralia
        </Link>
        <Link href="/settings" style={{ color: 'var(--c-text-2)', fontSize: '14px', textDecoration: 'none' }}>← 設定へ戻る</Link>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px' }}>クリエイター設定</h1>
          <p style={{ color: 'var(--c-text-3)', fontSize: '14px', margin: 0 }}>受注上限・料金プランを設定します</p>
        </div>

        {/* 受注上限 */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--c-text-3)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 16px' }}>同時受注上限</h2>
          <p style={{ color: 'var(--c-text-2)', fontSize: '13px', margin: '0 0 14px', lineHeight: '1.6' }}>
            同時に受け付ける依頼の最大件数を設定します。未設定の場合は無制限です。
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="number"
              value={orderLimit}
              onChange={(e) => setOrderLimit(e.target.value)}
              placeholder="例: 3"
              min={1}
              max={999}
              style={{ ...inputStyle, width: '120px' }}
            />
            <span style={{ color: 'var(--c-text-3)', fontSize: '13px' }}>件まで（空欄 = 無制限）</span>
          </div>
        </div>

        {/* AIクリエイター提案トグル */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--c-text-3)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 16px' }}>AIクリエイター提案</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '14px', color: 'var(--c-text)' }}>
                依頼者へのAI提案を許可する
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--c-text-3)', lineHeight: '1.6' }}>
                無効にすると、依頼者が依頼内容からAIでクリエイターを探す際にあなたが提案対象から除外されます
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAiSuggEnabled((v) => !v)}
              role="switch"
              aria-checked={aiSuggEnabled}
              aria-label="AIクリエイター提案を許可する"
              style={{
                flexShrink: 0, width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                background: aiSuggEnabled ? 'var(--c-grad-primary)' : 'var(--c-border-2)',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: '4px',
                left: aiSuggEnabled ? '28px' : '4px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>

        {/* 料金プラン */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ color: 'var(--c-text-3)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: 0 }}>料金プラン</h2>
            <span style={{ color: 'var(--c-text-4)', fontSize: '12px' }}>{plans.length}/10</span>
          </div>
          <p style={{ color: 'var(--c-text-2)', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.6' }}>
            プロフィールページに表示される料金プランです。依頼者の参考になります。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: plans.length > 0 ? '16px' : '0' }}>
            {plans.map((plan, i) => (
              <div key={i} style={{ background: 'var(--c-input-bg-2)', border: '1px solid var(--c-border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', color: 'var(--c-text-3)', fontSize: '11px', fontWeight: '600', marginBottom: '6px' }}>プラン名 <span style={{ color: '#f87171' }}>*</span></label>
                    <input
                      value={plan.label}
                      onChange={(e) => updatePlan(i, 'label', e.target.value)}
                      placeholder="例: ライトプラン"
                      maxLength={50}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: 'var(--c-text-3)', fontSize: '11px', fontWeight: '600', marginBottom: '6px' }}>料金（円）</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', fontSize: '13px' }}>¥</span>
                      <input
                        type="number"
                        value={plan.price}
                        onChange={(e) => updatePlan(i, 'price', e.target.value)}
                        placeholder="5000"
                        min={0}
                        style={{ ...inputStyle, paddingLeft: '24px' }}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', color: 'var(--c-text-3)', fontSize: '11px', fontWeight: '600', marginBottom: '6px' }}>説明（任意）</label>
                  <input
                    value={plan.description}
                    onChange={(e) => updatePlan(i, 'description', e.target.value)}
                    placeholder="例: イラスト1枚・修正2回まで"
                    maxLength={200}
                    style={inputStyle}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePlan(i)}
                  style={{ fontSize: '12px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>

          {plans.length < 10 && (
            <button
              type="button"
              onClick={addPlan}
              style={{
                width: '100%', padding: '11px', borderRadius: '10px',
                border: '1px dashed var(--c-accent-a30)', background: 'transparent',
                color: 'var(--c-accent)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              ＋ プランを追加
            </button>
          )}
        </div>

        {error && (
          <p style={{ color: '#f87171', fontSize: '13px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
            {error}
          </p>
        )}

        {saved && (
          <p style={{ color: '#4ade80', fontSize: '13px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
            ✅ 保存しました
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: loading ? 'var(--c-accent-a40)' : 'var(--c-grad-primary)',
            color: '#fff', fontSize: '14px', fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '保存中...' : '設定を保存する'}
        </button>
      </div>
    </div>
  )
}
