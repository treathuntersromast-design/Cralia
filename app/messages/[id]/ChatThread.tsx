'use client'

import { useState, useEffect, useRef } from 'react'

type Message = {
  id:         string
  sender_id:  string
  body:       string
  created_at: string
  read_at:    string | null
}

export default function ChatThread({
  projectId, currentUserId, initialMessages,
}: {
  projectId:       string
  currentUserId:   string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // 末尾にスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ポーリング（10秒ごとに更新）
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?projectId=${projectId}`)
        if (res.ok) {
          const d = await res.json()
          setMessages(d.messages ?? [])
        }
      } catch { /* ignore */ }
    }, 10_000)
    return () => clearInterval(interval)
  }, [projectId])

  const handleSend = async () => {
    const body = input.trim()
    if (!body) return
    setSending(true)
    setError(null)

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, message: body }),
    })
    const data = await res.json()
    setSending(false)

    if (!res.ok) {
      setError(data.error ?? '送信に失敗しました')
      return
    }

    setMessages((prev) => [...prev, data.message])
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 日付区切りを挿入
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    const last = grouped[grouped.length - 1]
    if (!last || last.date !== date) {
      grouped.push({ date, msgs: [msg] })
    } else {
      last.msgs.push(msg)
    }
  }

  return (
    <>
      {/* メッセージ一覧 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#5c5b78', fontSize: '14px' }}>
            まだメッセージはありません。最初のメッセージを送りましょう。
          </div>
        )}

        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            {/* 日付区切り */}
            <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
              <span style={{ fontSize: '11px', color: '#5c5b78', background: 'rgba(255,255,255,0.04)', padding: '3px 12px', borderRadius: '20px' }}>
                {date}
              </span>
            </div>

            {msgs.map((msg) => {
              const isMe = msg.sender_id === currentUserId
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ maxWidth: '72%' }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMe ? 'linear-gradient(135deg, #ff6b9d, #c77dff)' : 'rgba(255,255,255,0.08)',
                      color: '#f0eff8', fontSize: '14px', lineHeight: '1.6',
                      wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                    }}>
                      {msg.body}
                    </div>
                    <p style={{
                      fontSize: '11px', color: '#5c5b78', margin: '3px 4px 0',
                      textAlign: isMe ? 'right' : 'left',
                    }}>
                      {new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      {isMe && msg.read_at && ' · 既読'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', flexShrink: 0 }}>
        {error && (
          <p style={{ color: '#f87171', fontSize: '12px', margin: '0 0 8px', background: 'rgba(248,113,113,0.1)', borderRadius: '8px', padding: '6px 12px' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力…（Enter で送信 / Shift+Enter で改行）"
            maxLength={2000}
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '12px',
              border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(255,255,255,0.05)',
              color: '#f0eff8', fontSize: '14px', resize: 'none', outline: 'none',
              lineHeight: '1.5', minHeight: '42px', maxHeight: '120px', overflowY: 'auto',
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || input.trim().length === 0}
            style={{
              width: '44px', height: '44px', borderRadius: '12px', border: 'none', flexShrink: 0,
              background: sending || input.trim().length === 0
                ? 'rgba(199,125,255,0.3)'
                : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
              color: '#fff', fontSize: '18px', cursor: sending || input.trim().length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="送信"
          >
            {sending ? '…' : '↑'}
          </button>
        </div>
        <p style={{ color: '#5c5b78', fontSize: '11px', margin: '4px 0 0', textAlign: 'right' }}>{input.length}/2000</p>
      </div>
    </>
  )
}
