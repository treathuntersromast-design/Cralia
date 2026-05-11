'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, RotateCcw, ArrowLeft, Send, ChevronRight } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type View = 'select' | 'chat' | 'inquiry'

const TOPICS = [
  {
    label: '今やることを整理したい',
    apiMessage: '今やることを整理したいです。現在の状況を教えてください。',
    action: 'chat',
  },
  {
    label: 'クリエイター・仕事を探したい',
    apiMessage: 'クリエイターや仕事を探したいです。どこに行けばいいか教えてください。',
    action: 'chat',
  },
  {
    label: '管理者に問い合わせる',
    apiMessage: '',
    action: 'inquiry',
  },
  {
    label: 'その他・自由に質問する',
    apiMessage: '',
    action: 'other',
  },
] as const satisfies ReadonlyArray<{ label: string; apiMessage: string; action: string }>

export default function DashboardChatBot() {
  const [isOpen,         setIsOpen]         = useState(false)
  const [view,           setView]           = useState<View>('select')
  const [messages,       setMessages]       = useState<Message[]>([])
  const [input,          setInput]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [inquiryText,    setInquiryText]    = useState('')
  const [inquirySent,    setInquirySent]    = useState(false)
  const [inquiryError,   setInquiryError]   = useState<string | null>(null)
  const [inquiryLoading, setInquiryLoading] = useState(false)

  const msgBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function callChat(msgs: Message[]) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/dashboard-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setError('本日の利用上限に達しました。明日またご利用ください。')
        } else if (res.status === 401) {
          setError('ログインが必要です。')
        } else {
          setError('エラーが発生しました。再度お試しください。')
        }
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
    } catch {
      setError('エラーが発生しました。再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  async function handleTopicSelect(topic: typeof TOPICS[number]) {
    if (topic.action === 'inquiry') {
      setView('inquiry')
      setInquirySent(false)
      setInquiryError(null)
      return
    }

    setView('chat')

    if (topic.action === 'other') {
      await callChat([])
      return
    }

    const userMsg: Message = { role: 'user', content: topic.label }
    setMessages([userMsg])
    await callChat([userMsg])
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    await callChat(next)
  }

  function handleReset() {
    setMessages([])
    setError(null)
    setInput('')
    setView('select')
  }

  async function handleInquirySubmit() {
    if (!inquiryText.trim() || inquiryLoading) return
    setInquiryLoading(true)
    setInquiryError(null)
    try {
      const res = await fetch('/api/support/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: inquiryText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          setInquiryError('ログインが必要です。')
        } else {
          setInquiryError(data.error ?? 'エラーが発生しました。再度お試しください。')
        }
        return
      }
      setInquirySent(true)
    } catch {
      setInquiryError('エラーが発生しました。再度お試しください。')
    } finally {
      setInquiryLoading(false)
    }
  }

  function openInquiry() {
    setView('inquiry')
    setInquirySent(false)
    setInquiryError(null)
  }

  function backFromInquiry() {
    setView(messages.length > 0 ? 'chat' : 'select')
  }

  return (
    <>
      {/* チャットパネル */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', bottom: '88px', right: '24px', zIndex: 50,
            width: '340px', maxHeight: '500px',
            background: 'var(--c-surface)', border: '1px solid var(--c-border-2)',
            borderRadius: '16px', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column',
          }}
          role="dialog"
          aria-label="ダッシュボードアシスタント"
        >
          {/* ── 選択画面 ── */}
          {view === 'select' && (
            <>
              <div style={{
                padding: '14px 14px 12px',
                borderBottom: '1px solid var(--c-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--c-text)' }}>
                  ダッシュボードアシスタント
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  title="閉じる"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: 'var(--c-text-3)', borderRadius: '6px', display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={14} aria-hidden />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--c-text-2)', margin: '0 0 14px', fontWeight: '600' }}>
                  何のお手伝いをしますか？
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {TOPICS.map((topic) => (
                    <button
                      key={topic.label}
                      onClick={() => void handleTopicSelect(topic)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '12px 14px',
                        background: 'var(--c-surface-2)', border: '1px solid var(--c-border)',
                        borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.12s, border-color 0.12s',
                      }}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--c-surface-3, rgba(0,0,0,0.04))'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgb(var(--brand-rgb))'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--c-surface-2)'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-border)'
                      }}
                    >
                      <span style={{ fontSize: '13px', color: 'var(--c-text)', lineHeight: '1.4' }}>
                        {topic.label}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--c-text-3)', flexShrink: 0, marginLeft: '8px' }} aria-hidden />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── チャット画面 ── */}
          {view === 'chat' && (
            <>
              <div style={{
                padding: '12px 14px 0',
                borderBottom: '1px solid var(--c-border)',
                background: 'var(--c-surface)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--c-text)' }}>
                    ダッシュボードアシスタント
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={handleReset}
                      title="最初の選択に戻る"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                        color: 'var(--c-text-3)', borderRadius: '6px', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <RotateCcw size={14} aria-hidden />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      title="閉じる"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                        color: 'var(--c-text-3)', borderRadius: '6px', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '10px', color: 'var(--c-text-4)', margin: '0 0 8px' }}>
                  会話内容は保存されません
                </p>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.length === 0 && !loading && !error && (
                  <p style={{ fontSize: '13px', color: 'var(--c-text-3)', margin: 0, textAlign: 'center', paddingTop: '20px' }}>
                    読み込み中...
                  </p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
                  >
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: m.role === 'user' ? 'rgb(var(--brand-rgb))' : 'var(--c-surface-2)',
                      color: m.role === 'user' ? '#fff' : 'var(--c-text)',
                      fontSize: '13px', lineHeight: '1.6',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ alignSelf: 'flex-start' }}>
                    <div style={{
                      padding: '8px 12px', borderRadius: '12px 12px 12px 2px',
                      background: 'var(--c-surface-2)',
                      fontSize: '13px', color: 'var(--c-text-3)',
                    }}>
                      考え中...
                    </div>
                  </div>
                )}
                {error && (
                  <p style={{ fontSize: '12px', color: '#f87171', margin: 0, textAlign: 'center' }}>
                    {error}
                  </p>
                )}
                <div ref={msgBottomRef} />
              </div>

              <div style={{ borderTop: '1px solid var(--c-border)', padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void handleSend()
                      }
                    }}
                    placeholder="メッセージを入力（Enterで送信）"
                    maxLength={500}
                    rows={2}
                    disabled={loading}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '8px',
                      border: '1px solid var(--c-border)', background: 'var(--c-surface-2)',
                      color: 'var(--c-text)', fontSize: '13px', lineHeight: '1.5',
                      resize: 'none', outline: 'none',
                      opacity: loading ? 0.6 : 1,
                    }}
                  />
                  <button
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || loading}
                    style={{
                      padding: '8px', borderRadius: '8px', border: 'none',
                      background: !input.trim() || loading ? 'rgba(30,64,255,0.3)' : 'rgb(var(--brand-rgb))',
                      color: '#fff', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    aria-label="送信"
                  >
                    <Send size={15} aria-hidden />
                  </button>
                </div>
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  <button
                    onClick={openInquiry}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '11px', color: 'var(--c-text-3)',
                      textDecoration: 'underline',
                    }}
                  >
                    管理者への問い合わせ
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── 問い合わせ画面 ── */}
          {view === 'inquiry' && (
            <>
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--c-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <button
                  onClick={backFromInquiry}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '13px', color: 'var(--c-text-2)', padding: '4px',
                  }}
                >
                  <ArrowLeft size={14} aria-hidden />
                  {messages.length > 0 ? 'チャットに戻る' : '最初に戻る'}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: 'var(--c-text-3)', display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={14} aria-hidden />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--c-text)', margin: '0 0 10px' }}>
                  管理者への問い合わせ
                </p>

                <div style={{
                  background: 'var(--c-surface-2)', border: '1px solid var(--c-border)',
                  borderRadius: '8px', padding: '10px 12px', marginBottom: '12px',
                }}>
                  <p style={{ fontSize: '11px', color: 'var(--c-text-3)', margin: '0 0 4px', fontWeight: '600' }}>注意事項</p>
                  <ul style={{ fontSize: '11px', color: 'var(--c-text-3)', margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
                    <li>送信内容はサポート対応のため保存され、管理者が確認します。</li>
                    <li>パスワード・認証コード・クレジットカード情報などは入力しないでください。</li>
                    <li>チャット履歴は保存されませんが、問い合わせ内容は記録されます。</li>
                  </ul>
                </div>

                {inquirySent ? (
                  <div style={{
                    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
                    borderRadius: '10px', padding: '14px', textAlign: 'center',
                  }}>
                    <p style={{ fontSize: '13px', color: '#4ade80', fontWeight: '700', margin: 0 }}>
                      送信しました
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--c-text-3)', margin: '4px 0 0' }}>
                      2〜3営業日以内にメールにてご回答します。
                    </p>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={inquiryText}
                      onChange={e => setInquiryText(e.target.value)}
                      placeholder="問い合わせ内容を入力（500文字以内）"
                      maxLength={500}
                      rows={6}
                      disabled={inquiryLoading}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid var(--c-border)', background: 'var(--c-surface-2)',
                        color: 'var(--c-text)', fontSize: '13px', lineHeight: '1.6',
                        resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                        opacity: inquiryLoading ? 0.6 : 1,
                      }}
                    />
                    <p style={{ fontSize: '11px', color: 'var(--c-text-3)', textAlign: 'right', margin: '3px 0 10px' }}>
                      {inquiryText.length}/500
                    </p>
                    {inquiryError && (
                      <p style={{
                        fontSize: '12px', color: '#f87171',
                        background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                        borderRadius: '6px', padding: '8px 10px', margin: '0 0 10px',
                      }}>
                        {inquiryError}
                      </p>
                    )}
                    <button
                      onClick={() => void handleInquirySubmit()}
                      disabled={!inquiryText.trim() || inquiryLoading}
                      style={{
                        width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                        background: !inquiryText.trim() || inquiryLoading ? 'rgba(30,64,255,0.3)' : 'rgb(var(--brand-rgb))',
                        color: '#fff', fontSize: '13px', fontWeight: '700',
                        cursor: !inquiryText.trim() || inquiryLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {inquiryLoading ? '送信中...' : '送信する'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'チャットを閉じる' : 'アシスタントを開く'}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 50,
          width: '48px', height: '48px', borderRadius: '50%', border: 'none',
          background: 'rgb(var(--brand-rgb))',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'
        }}
      >
        {isOpen ? <X size={20} aria-hidden /> : <MessageCircle size={20} aria-hidden />}
      </button>
    </>
  )
}
