'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CREATOR_TYPES } from '@/lib/constants/lists'

type Tab = 'create' | 'review'
type Step = 'info' | 'chat'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface FormInfo {
  title: string
  orderType: 'paid' | 'free'
  budgetMin: string
  budgetMax: string
  deadline: string
  creatorTypes: string[]
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
  color: '#f0eff8', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', color: '#a9a8c0', fontSize: '12px',
  marginBottom: '6px', fontWeight: '600', letterSpacing: '0.04em',
}

function RequestDraftInner() {
  const params = useSearchParams()
  const router = useRouter()
  const [tab,       setTab]       = useState<Tab>((params.get('tab') as Tab) ?? 'create')
  const [step,      setStep]      = useState<Step>('info')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [form, setForm] = useState<FormInfo>({
    title:        params.get('title')       ?? '',
    orderType:   (params.get('orderType') ?? 'paid') as 'paid' | 'free',
    budgetMin:    params.get('budgetMin')   ?? '',
    budgetMax:    params.get('budgetMax')   ?? '',
    deadline:     params.get('deadline')    ?? '',
    creatorTypes: params.get('creatorTypes') ? params.get('creatorTypes')!.split(',').filter(Boolean) : [],
  })
  const [existingDraft, setExistingDraft] = useState(params.get('existingDraft') ?? '')
  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState('')
  const [sending,      setSending]      = useState(false)
  const [aiError,      setAiError]      = useState<string | null>(null)
  const [proposedDraft, setProposedDraft] = useState<string | null>(null)
  const [copied,       setCopied]       = useState(false)
  const [remaining,    setRemaining]    = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => {
      if (!r.ok) {
        router.replace('/login?next=/request-draft')
      } else {
        setIsLoggedIn(true)
      }
    }).catch(() => router.replace('/login?next=/request-draft'))
  }, [router])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const apiEndpoint = '/api/ai/request-draft'

  function budgetLabel(): string {
    if (form.orderType === 'free') return '無償'
    const min = form.budgetMin ? `¥${Number(form.budgetMin).toLocaleString()}` : ''
    const max = form.budgetMax ? `¥${Number(form.budgetMax).toLocaleString()}` : ''
    if (min && max) return `${min} 〜 ${max}`
    if (min) return `${min} 〜`
    if (max) return `〜 ${max}`
    return '未設定'
  }

  function toggleCreatorType(t: string) {
    setForm((f) => ({
      ...f,
      creatorTypes: f.creatorTypes.includes(t)
        ? f.creatorTypes.filter((x) => x !== t)
        : [...f.creatorTypes, t],
    }))
  }

  async function startChat() {
    setStep('chat')
    setMessages([])
    setProposedDraft(null)
    setAiError(null)

    const contextParts = [
      form.title ? `案件タイトル: ${form.title}` : null,
      `報酬: ${form.orderType === 'paid' ? '有償' : '無償'}`,
      form.orderType === 'paid' && (form.budgetMin || form.budgetMax) ? `予算: ${budgetLabel()}` : null,
      form.deadline ? `希望納期: ${form.deadline}` : null,
      form.creatorTypes.length > 0 ? `募集クリエイタータイプ: ${form.creatorTypes.join('、')}` : null,
    ].filter(Boolean).join('\n')

    const initMessage: Message = tab === 'review'
      ? { role: 'user', content: `添削をお願いします。\n\n${existingDraft}` }
      : { role: 'user', content: `依頼文を一緒に作成していただけますか？\n\n【依頼の基本情報】\n${contextParts}` }

    await sendToAI([initMessage], initMessage.content)
  }

  async function sendToAI(history: Message[], userText: string) {
    setSending(true)
    setAiError(null)

    const body: Record<string, unknown> = {
      messages:  history,
      mode:      tab,
      orderType: form.orderType,
    }
    if (form.orderType === 'paid' && (form.budgetMin || form.budgetMax)) {
      body.budget = budgetLabel()
    }
    if (form.deadline) body.deadline = form.deadline
    if (tab === 'review' && existingDraft) body.existingDraft = existingDraft
    if (isLoggedIn) {
      body.displayName = undefined
    }

    try {
      const res  = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setAiError(data.error ?? 'エラーが発生しました')
        setSending(false)
        return
      }

      if (data.remaining !== undefined) setRemaining(data.remaining)

      const assistantMsg: Message = { role: 'assistant', content: data.text }
      setMessages((prev) => [...prev, assistantMsg])
      if (data.proposedDraft) setProposedDraft(data.proposedDraft)

    } catch {
      setAiError('通信エラーが発生しました。再度お試しください。')
    }
    setSending(false)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    await sendToAI(next, text)
  }

  function handleCopy() {
    if (!proposedDraft) return
    navigator.clipboard.writeText(proposedDraft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function buildJobsNewUrl(): string {
    const params = new URLSearchParams()
    if (form.title)      params.set('title',     form.title)
    if (form.deadline)   params.set('deadline',  form.deadline)
    if (form.budgetMin)  params.set('budgetMin', form.budgetMin)
    if (form.budgetMax)  params.set('budgetMax', form.budgetMax)
    params.set('orderType', form.orderType)
    if (proposedDraft)   params.set('description', proposedDraft)
    if (form.creatorTypes.length > 0) params.set('creatorTypes', form.creatorTypes.join(','))
    return `/jobs/new?${params.toString()}`
  }

  // 認証確認中はブランク表示（リダイレクト or 表示の切り替えを待つ）
  if (isLoggedIn === null) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c7b99' }}>
        確認中...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--c-accent)', textDecoration: 'none' }}>
          Cralia
        </Link>
        <Link href="/dashboard" style={{ color: '#a9a8c0', fontSize: '13px', textDecoration: 'none' }}>
          ← ダッシュボード
        </Link>
      </div>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 20px' }}>

        {/* タイトル */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px' }}>
            ✨ AI 依頼文アシスタント
          </h1>
          <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>
            ゼロから作る・既存の文章を添削する — どちらも AI がサポートします
          </p>
        </div>

        {/* 外部依頼の注意喚起 */}
        <div style={{
          marginBottom: '24px', padding: '16px 20px', borderRadius: '14px',
          background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)',
        }}>
          <p style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '14px', color: '#fbbf24' }}>
            ⚠️ Cralia 外でのやり取りについて
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#a9a8c0', lineHeight: '1.7' }}>
            この依頼文ツールで作成した文章を Cralia 外（SNS・知人経由など）でのやり取りに使う場合、<strong style={{ color: '#f0eff8' }}>報酬トラブル・成果物の権利問題・不正行為などについて Cralia は一切の補償・仲介を行いません</strong>。クリエイターへの依頼は Cralia のプラットフォーム上で行うことを推奨します。
          </p>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {(['create', 'review'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setStep('info'); setMessages([]); setProposedDraft(null) }}
              style={{
                padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                cursor: 'pointer', border: 'none',
                background: tab === t
                  ? 'linear-gradient(135deg, #ff6b9d, #c77dff)'
                  : 'rgba(255,255,255,0.06)',
                color: tab === t ? '#fff' : '#a9a8c0',
              }}
            >
              {t === 'create' ? '✏️ 依頼文を作る' : '🔍 依頼文を添削する'}
            </button>
          ))}
        </div>

        {/* ─── STEP 1: 基本情報 ─── */}
        {step === 'info' && (
          <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* 案件タイトル（任意） */}
            <div>
              <label style={labelStyle}>案件タイトル <span style={{ color: '#5c5b78' }}>（任意）</span></label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例: MVのイラスト制作"
                maxLength={100}
                style={inputStyle}
              />
            </div>

            {/* 有償 / 無償 */}
            <div>
              <label style={labelStyle}>報酬の有無 <span style={{ color: '#ff6b9d', fontSize: '11px' }}>必須</span></label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['paid', 'free'] as const).map((v) => (
                  <button
                    key={v} type="button"
                    onClick={() => setForm((f) => ({ ...f, orderType: v }))}
                    style={{
                      padding: '8px 24px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer',
                      border: form.orderType === v ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.12)',
                      background: form.orderType === v ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                      color: form.orderType === v ? '#4ade80' : '#a9a8c0',
                      fontWeight: form.orderType === v ? '700' : '400',
                    }}
                  >
                    {v === 'paid' ? '有償' : '無償'}
                  </button>
                ))}
              </div>
            </div>

            {/* 予算（有償時） */}
            {form.orderType === 'paid' && (
              <div>
                <label style={labelStyle}>予算（円） <span style={{ color: '#5c5b78' }}>（任意）</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number" value={form.budgetMin} min={0}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
                    placeholder="下限（例: 5000）"
                    style={{ ...inputStyle, maxWidth: '180px' }}
                  />
                  <span style={{ color: '#7c7b99', flexShrink: 0 }}>〜</span>
                  <input
                    type="number" value={form.budgetMax} min={0}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
                    placeholder="上限（例: 30000）"
                    style={{ ...inputStyle, maxWidth: '180px' }}
                  />
                </div>
              </div>
            )}

            {/* 希望納期 */}
            <div>
              <label style={labelStyle}>希望納期 <span style={{ color: '#5c5b78' }}>（任意）</span></label>
              <input
                type="date" value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                style={{ ...inputStyle, maxWidth: '200px', colorScheme: 'dark' }}
              />
            </div>

            {/* クリエイタータイプ */}
            <div>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>
                募集するクリエイタータイプ <span style={{ color: '#5c5b78' }}>（任意・複数可）</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CREATOR_TYPES.map((t) => {
                  const active = form.creatorTypes.includes(t)
                  return (
                    <button
                      key={t} type="button" onClick={() => toggleCreatorType(t)}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                        border: active ? '2px solid #c77dff' : '1px solid rgba(255,255,255,0.15)',
                        background: active ? 'rgba(199,125,255,0.15)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#c77dff' : '#a9a8c0',
                        fontWeight: active ? '700' : '400',
                      }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 添削モード: 既存の依頼文 */}
            {tab === 'review' && (
              <div>
                <label style={labelStyle}>
                  現在の依頼文 <span style={{ color: '#ff6b9d', fontSize: '11px' }}>必須</span>
                </label>
                <textarea
                  value={existingDraft}
                  onChange={(e) => setExistingDraft(e.target.value)}
                  placeholder="添削してほしい依頼文をここに貼り付けてください..."
                  rows={8}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.7' }}
                />
                <p style={{ color: '#7c7b99', fontSize: '12px', marginTop: '4px' }}>
                  {existingDraft.length} 文字
                </p>
              </div>
            )}

            {/* 開始ボタン */}
            <button
              onClick={startChat}
              disabled={tab === 'review' && existingDraft.trim().length === 0}
              style={{
                padding: '14px', borderRadius: '14px', border: 'none', fontSize: '15px', fontWeight: '700',
                cursor: tab === 'review' && existingDraft.trim().length === 0 ? 'not-allowed' : 'pointer',
                background: tab === 'review' && existingDraft.trim().length === 0
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                color: '#fff',
              }}
            >
              {tab === 'create' ? '✨ AI と一緒に依頼文を作る' : '🔍 AI に添削してもらう'}
            </button>
          </div>
        )}

        {/* ─── STEP 2: AI チャット ─── */}
        {step === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 基本情報サマリー */}
            <div style={{
              padding: '14px 18px', borderRadius: '14px',
              background: 'rgba(199,125,255,0.08)', border: '1px solid rgba(199,125,255,0.2)',
              display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center',
            }}>
              {form.title && <span style={{ fontSize: '13px', color: '#c77dff', fontWeight: '700' }}>「{form.title}」</span>}
              <span style={{ fontSize: '13px', color: '#a9a8c0' }}>
                {form.orderType === 'free' ? '無償' : budgetLabel()}
              </span>
              {form.deadline && (
                <span style={{ fontSize: '13px', color: '#a9a8c0' }}>📅 {form.deadline}</span>
              )}
              {form.creatorTypes.length > 0 && (
                <span style={{ fontSize: '13px', color: '#a9a8c0' }}>{form.creatorTypes.join(' / ')}</span>
              )}
              <button
                onClick={() => { setStep('info'); setMessages([]); setProposedDraft(null) }}
                style={{ marginLeft: 'auto', fontSize: '12px', color: '#7c7b99', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              >
                ← 情報を変更
              </button>
            </div>

            {/* チャット履歴 */}
            <div style={{
              background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px', padding: '20px',
              minHeight: '320px', maxHeight: '480px', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}>
              {messages.length === 0 && sending && (
                <div style={{ color: '#7c7b99', fontSize: '14px', textAlign: 'center', margin: 'auto' }}>
                  AI が準備中...
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.role === 'user' ? 'linear-gradient(135deg, #ff6b9d44, #c77dff44)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && messages.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.06)', color: '#7c7b99', fontSize: '14px' }}>
                    入力中...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* エラー */}
            {aiError && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
                color: '#f87171',
              }}>
                {aiError}
              </div>
            )}

            {/* 提案された依頼文 */}
            {proposedDraft && (
              <div style={{
                padding: '20px', borderRadius: '16px',
                background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#34d399' }}>✓ 生成された依頼文</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleCopy}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                        background: copied ? 'rgba(52,211,153,0.3)' : 'rgba(52,211,153,0.15)',
                        color: '#34d399',
                      }}
                    >
                      {copied ? '✓ コピーしました' : 'コピー'}
                    </button>
                    {isLoggedIn && (
                      <Link
                        href={buildJobsNewUrl()}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                          background: 'linear-gradient(135deg, #ff6b9d44, #c77dff44)',
                          border: '1px solid rgba(199,125,255,0.3)',
                          color: '#c77dff', textDecoration: 'none',
                        }}
                      >
                        案件として投稿 →
                      </Link>
                    )}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap', color: '#e0dff4' }}>
                  {proposedDraft}
                </p>
              </div>
            )}

            {/* 入力エリア */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder="AIへのメッセージ（Shift+Enter で改行）"
                rows={2}
                disabled={sending}
                style={{
                  ...inputStyle, flex: 1, resize: 'none', lineHeight: '1.6',
                  opacity: sending ? 0.6 : 1,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                style={{
                  padding: '0 20px', borderRadius: '12px', border: 'none', cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
                  background: !input.trim() || sending ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                  color: !input.trim() || sending ? '#5c5b78' : '#fff',
                  fontSize: '14px', fontWeight: '700', flexShrink: 0,
                }}
              >
                送信
              </button>
            </div>

            {remaining !== null && (
              <p style={{ margin: 0, fontSize: '12px', color: '#5c5b78', textAlign: 'right' }}>
                本日の残り利用回数: {remaining} 回
              </p>
            )}

            <p style={{ margin: 0, fontSize: '12px', color: '#5c5b78', textAlign: 'center' }}>
              AIの回答は参考情報です。内容を確認のうえご利用ください。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RequestDraftPage() {
  return (
    <Suspense>
      <RequestDraftInner />
    </Suspense>
  )
}
