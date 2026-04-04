'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CREATOR_TYPES } from '@/lib/constants/lists'
import { VALIDATION } from '@/lib/constants/validation'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
  color: '#f0eff8', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px',
}

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
        </Link>
        <Link href="/jobs" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← 案件一覧へ戻る</Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px' }}>クリエイターを募集する</h1>
          <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>案件情報を投稿してクリエイターからの応募を待ちましょう</p>
        </div>

        <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* タイトル */}
            <div>
              <label style={labelStyle}>
                案件タイトル <span style={{ color: '#ff6b9d', fontSize: '11px' }}>必須</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例: MVのイラスト制作をお願いしたい"
                maxLength={VALIDATION.JOB_TITLE_MAX}
                style={inputStyle}
              />
              <p style={{ color: '#7c7b99', fontSize: '12px', marginTop: '4px' }}>{form.title.length} / 100文字</p>
            </div>

            {/* 説明 */}
            <div>
              <label style={labelStyle}>案件の詳細</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="依頼内容・制作物の仕様・参考資料・注意事項などを記載してください"
                maxLength={VALIDATION.JOB_DESC_MAX}
                rows={6}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.7' }}
              />
              <p style={{ color: '#7c7b99', fontSize: '12px', marginTop: '4px' }}>{form.description.length} / 2000文字</p>
            </div>

            {/* 募集クリエイタータイプ */}
            <div>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>
                募集するクリエイタータイプ <span style={{ color: '#ff6b9d', fontSize: '11px' }}>必須（複数選択可）</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CREATOR_TYPES.map((t) => {
                  const active = creatorTypes.includes(t)
                  return (
                    <button
                      key={t} type="button" onClick={() => toggleType(t)}
                      style={{
                        padding: '7px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                        border: active ? '2px solid #c77dff' : '1px solid rgba(255,255,255,0.15)',
                        background: active ? 'rgba(199,125,255,0.15)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#c77dff' : '#a9a8c0', fontWeight: active ? '700' : '400',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 有償/無償 */}
            <div>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>報酬の有無</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['paid', 'free'] as const).map((v) => {
                  const active = form.orderType === v
                  return (
                    <button
                      key={v} type="button" onClick={() => setForm((f) => ({ ...f, orderType: v }))}
                      style={{
                        padding: '8px 24px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer',
                        border: active ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.12)',
                        background: active ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#4ade80' : '#a9a8c0', fontWeight: active ? '700' : '400',
                      }}
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
                <label style={labelStyle}>予算（円）</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="number"
                    value={form.budgetMin}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
                    placeholder="下限（例: 5000）"
                    min={0}
                    style={{ ...inputStyle, maxWidth: '200px' }}
                  />
                  <span style={{ color: '#7c7b99' }}>〜</span>
                  <input
                    type="number"
                    value={form.budgetMax}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
                    placeholder="上限（例: 30000）"
                    min={0}
                    style={{ ...inputStyle, maxWidth: '200px' }}
                  />
                </div>
              </div>
            )}

            {/* 締切 */}
            <div>
              <label style={labelStyle}>希望納期</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                style={{ ...inputStyle, maxWidth: '200px', colorScheme: 'dark' }}
              />
            </div>

            {/* エラー */}
            {error && (
              <p style={{
                color: '#ff6b9d', fontSize: '13px', margin: 0,
                background: 'rgba(255,107,157,0.1)', border: '1px solid rgba(255,107,157,0.3)',
                borderRadius: '8px', padding: '10px 14px',
              }}>
                {error}
              </p>
            )}

            {/* 送信 */}
            <button
              type="submit" disabled={loading}
              style={{
                padding: '14px', borderRadius: '14px', border: 'none',
                background: loading ? 'rgba(199,125,255,0.3)' : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                color: '#fff', fontSize: '16px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '投稿中...' : '案件を投稿する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
