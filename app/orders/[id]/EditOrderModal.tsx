'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EditOrderModal({
  orderId,
  initialTitle,
  initialDescription,
  initialBudget,
  initialDeadline,
}: {
  orderId:            string
  initialTitle:       string
  initialDescription: string
  initialBudget:      number | null
  initialDeadline:    string | null
}) {
  const router = useRouter()
  const [open,        setOpen]        = useState(false)
  const [title,       setTitle]       = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [budget,      setBudget]      = useState(initialBudget != null ? String(initialBudget) : '')
  const [deadline,    setDeadline]    = useState(initialDeadline ?? '')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const resetForm = () => {
    setTitle(initialTitle)
    setDescription(initialDescription)
    setBudget(initialBudget != null ? String(initialBudget) : '')
    setDeadline(initialDeadline ?? '')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    setOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('タイトルを入力してください'); return }
    if (title.trim().length > 100) { setError('タイトルは100文字以内で入力してください'); return }
    if (description.trim().length > 2000) { setError('依頼内容は2000文字以内で入力してください'); return }

    setLoading(true)
    setError(null)

    const res = await fetch(`/api/orders/${orderId}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:       title.trim(),
        description: description.trim(),
        budget:      budget !== '' ? budget : null,
        deadline:    deadline || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '更新に失敗しました')
      setLoading(false)
      return
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(255,255,255,0.05)',
    color: '#f0eff8', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          width: '100%', padding: '14px 20px', borderRadius: '12px', marginBottom: '12px',
          border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(199,125,255,0.06)',
          color: '#c77dff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', justifyContent: 'center',
        }}
      >
        ✏️ 依頼内容を編集する
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div style={{
            background: '#16161f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px',
            padding: '32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>依頼内容を編集</h2>
              <button
                type="button"
                onClick={handleClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c7b99', fontSize: '20px', lineHeight: 1 }}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* タイトル */}
              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                  依頼タイトル <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                  style={inputStyle}
                />
                <p style={{ color: '#5c5b78', fontSize: '12px', margin: '4px 0 0', textAlign: 'right' }}>{title.length}/100</p>
              </div>

              {/* 依頼内容 */}
              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                  依頼内容
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={8}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
                />
                <p style={{ color: '#5c5b78', fontSize: '12px', margin: '4px 0 0', textAlign: 'right' }}>{description.length}/2000</p>
              </div>

              {/* 予算 */}
              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                  予算（任意）
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#7c7b99', fontSize: '14px' }}>¥</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    min={0}
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                  />
                </div>
              </div>

              {/* 納期 */}
              <div>
                <label style={{ display: 'block', color: '#a9a8c0', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
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

              {error && (
                <p style={{ color: '#f87171', fontSize: '13px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '10px 14px', margin: 0 }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{ flex: 1, padding: '13px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#a9a8c0', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 2, padding: '13px', borderRadius: '10px', border: 'none', background: loading ? 'rgba(199,125,255,0.4)' : 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? '更新中...' : '更新する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
