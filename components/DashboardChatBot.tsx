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

  /* ─────────────── Render ─────────────── */
  return (
    <>
      {/* ──────── チャットパネル ──────── */}
      {/*
        Always in DOM for exit animation.
        PC:     fixed above FAB, 380px wide.
        Mobile: full-width bottom sheet (85vh).
      */}
      <div
        className={[
          'fixed z-50 flex flex-col overflow-hidden',
          'bg-[var(--c-surface)] border border-[var(--c-border)]',
          'shadow-[0_12px_32px_rgba(11,21,48,.14)]',
          'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          // PC base (mobile overrides below)
          'bottom-[88px] right-6 w-[380px] max-h-[560px] rounded-[20px]',
          // Mobile: full-width slide-up bottom sheet
          'max-sm:inset-x-0 max-sm:bottom-0 max-sm:w-full max-sm:max-w-none',
          'max-sm:max-h-[85vh] max-sm:rounded-t-[20px] max-sm:rounded-b-none',
          // Open / close animation
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-3 scale-[0.97] pointer-events-none',
        ].join(' ')}
        role="dialog"
        aria-label="Craliaサポート"
        aria-hidden={!isOpen ? true : undefined}
      >

        {/* ════════ SELECT VIEW ════════ */}
        {view === 'select' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)] flex-shrink-0">
              <h3 className="text-[15px] font-bold text-[var(--c-text)]">
                Craliaサポート
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="閉じる"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--c-text-3)] hover:text-brand hover:bg-[var(--c-surface-3)] transition-colors"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {/* Bot greeting bubble */}
              <div className="flex justify-start">
                <div className="max-w-[85%] px-4 py-2.5 rounded-[16px] rounded-bl-[4px] bg-[var(--c-surface-3)] text-[var(--c-text)] text-[14px] leading-relaxed">
                  こんにちは！Craliaへようこそ。<br />
                  何かお手伝いできることはありますか？
                </div>
              </div>

              {/* Topic chips */}
              <div className="flex flex-col gap-1.5 pt-1">
                {TOPICS.map((topic) => (
                  <button
                    type="button"
                    key={topic.label}
                    onClick={() => void handleTopicSelect(topic)}
                    className="
                      w-full text-left px-4 py-2.5 rounded-[10px]
                      bg-[#dbeafe] hover:bg-[#bfdbfe]
                      border border-[#bfdbfe]
                      text-[14px] font-medium text-[#1535d4]
                      transition-colors duration-150
                      flex items-center justify-between gap-2
                    "
                  >
                    <span>{topic.label}</span>
                    <ChevronRight size={16} strokeWidth={2.5} className="text-[#1e40ff] flex-shrink-0" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ════════ CHAT VIEW ════════ */}
        {view === 'chat' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)] flex-shrink-0">
              <h3 className="text-[15px] font-bold text-[var(--c-text)]">
                Craliaサポート
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="会話をリセット"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--c-text-3)] hover:text-brand hover:bg-[var(--c-surface-3)] transition-colors"
                >
                  <RotateCcw size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="閉じる"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--c-text-3)] hover:text-brand hover:bg-[var(--c-surface-3)] transition-colors"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 && !loading && !error && (
                <p className="text-[13px] text-[var(--c-text-4)] text-center pt-5">
                  読み込み中...
                </p>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={[
                    'max-w-[80%] px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words',
                    m.role === 'user'
                      ? 'rounded-[16px] rounded-br-[4px] bg-[#1e40ff] text-white'
                      : 'rounded-[16px] rounded-bl-[4px] bg-[var(--c-surface-3)] text-[var(--c-text)]',
                  ].join(' ')}>
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 px-3.5 py-3 rounded-[14px] rounded-bl-[4px] bg-[var(--c-surface-3)] w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-text-4)] animate-typing-dot [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-text-4)] animate-typing-dot [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-text-4)] animate-typing-dot [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-[12px] text-red-400 text-center px-2">
                  {error}
                </p>
              )}

              <div ref={msgBottomRef} />
            </div>

            {/* Input + footer */}
            <div className="flex-shrink-0 border-t border-[var(--c-border)] px-3 py-3 bg-[var(--c-surface)]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && input.trim() && !loading) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                  placeholder="メッセージを入力（Enterで送信）"
                  maxLength={500}
                  disabled={loading}
                  className="
                    flex-1 h-10 px-3 rounded-[10px]
                    border border-[var(--c-input-border)]
                    bg-[var(--c-input-bg)]
                    text-[13.5px] text-[var(--c-text)]
                    placeholder:text-[var(--c-text-4)]
                    outline-none focus:border-brand
                    transition-colors
                    disabled:opacity-60
                  "
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || loading}
                  aria-label="送信"
                  className="
                    w-10 h-10 rounded-[10px] flex-shrink-0
                    flex items-center justify-center
                    transition-colors duration-150
                    disabled:bg-[var(--c-surface-3)] disabled:text-[var(--c-text-5)] disabled:cursor-not-allowed
                    enabled:bg-[#1e40ff] enabled:text-white enabled:hover:bg-[#1535d4]
                  "
                >
                  <Send size={16} aria-hidden />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2 px-0.5">
                <span className="text-[11px] text-[var(--c-text-4)]">
                  会話内容は保存されません
                </span>
                <button
                  type="button"
                  onClick={openInquiry}
                  className="text-[11px] text-brand hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  管理者への問い合わせ
                </button>
              </div>
            </div>
          </>
        )}

        {/* ════════ INQUIRY VIEW ════════ */}
        {view === 'inquiry' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)] flex-shrink-0">
              <button
                type="button"
                onClick={backFromInquiry}
                className="flex items-center gap-1.5 text-[13px] text-[var(--c-text-2)] hover:text-brand transition-colors bg-transparent border-none cursor-pointer p-0"
              >
                <ArrowLeft size={14} aria-hidden />
                {messages.length > 0 ? 'チャットに戻る' : '最初に戻る'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="閉じる"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--c-text-3)] hover:text-brand hover:bg-[var(--c-surface-3)] transition-colors"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-[15px] font-bold text-[var(--c-text)] mb-3">
                管理者への問い合わせ
              </p>

              {/* Notice */}
              <div className="bg-[var(--c-surface-3)] border border-[var(--c-border)] rounded-[10px] px-4 py-3 mb-4">
                <p className="text-[11px] font-semibold text-[var(--c-text-3)] mb-1.5">注意事項</p>
                <ul className="text-[11px] text-[var(--c-text-3)] space-y-1 pl-4 leading-relaxed">
                  <li>送信内容はサポート対応のため保存され、管理者が確認します。</li>
                  <li>パスワード・認証コード・クレジットカード情報などは入力しないでください。</li>
                  <li>チャット履歴は保存されませんが、問い合わせ内容は記録されます。</li>
                </ul>
              </div>

              {inquirySent ? (
                <div className="bg-green-50 border border-green-200 rounded-[12px] px-4 py-5 text-center">
                  <p className="text-[14px] font-bold text-green-600 mb-1">送信しました</p>
                  <p className="text-[12px] text-[var(--c-text-3)]">
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
                    rows={5}
                    disabled={inquiryLoading}
                    className="
                      w-full px-3 py-2.5 rounded-[10px]
                      border border-[var(--c-input-border)]
                      bg-[var(--c-input-bg)]
                      text-[13px] text-[var(--c-text)]
                      placeholder:text-[var(--c-text-4)]
                      outline-none focus:border-brand
                      transition-colors resize-none
                      disabled:opacity-60
                    "
                  />
                  <div className="flex justify-end mt-1 mb-3">
                    <span className="text-[11px] text-[var(--c-text-4)]">
                      {inquiryText.length}/500
                    </span>
                  </div>

                  {inquiryError && (
                    <p className="text-[12px] text-red-500 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2 mb-3">
                      {inquiryError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleInquirySubmit()}
                    disabled={!inquiryText.trim() || inquiryLoading}
                    className="
                      w-full py-2.5 rounded-[10px]
                      text-[13px] font-bold
                      transition-colors duration-150
                      disabled:bg-[var(--c-surface-3)] disabled:text-[var(--c-text-4)] disabled:cursor-not-allowed
                      enabled:bg-[#1e40ff] enabled:text-white enabled:hover:bg-[#1535d4]
                    "
                  >
                    {inquiryLoading ? '送信中...' : '送信する'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ──────── FAB ──────── */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'アシスタントを閉じる' : 'アシスタントを開く'}
        className="
          fixed bottom-6 right-6 z-50
          w-12 h-12 sm:w-14 sm:h-14 rounded-full
          flex items-center justify-center
          bg-[#1e40ff] hover:bg-[#1535d4]
          text-white
          shadow-[0_8px_24px_rgba(30,64,255,.35)]
          transition-all duration-200
          hover:scale-105 active:scale-95
        "
      >
        {isOpen
          ? <X size={22} strokeWidth={2.2} aria-hidden />
          : <MessageCircle size={22} strokeWidth={2.2} aria-hidden />
        }
      </button>
    </>
  )
}
