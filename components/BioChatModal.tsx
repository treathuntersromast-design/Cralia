'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  creatorTypes: string[]
  skills: string[]
  onApply: (bio: string) => void
  onClose: () => void
}

export default function BioChatModal({ creatorTypes, skills, onApply, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [proposedBio, setProposedBio] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  // 初回メッセージ（Strict Mode の二重実行を防ぐ）
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    sendToAI([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendToAI = async (msgs: Message[]) => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, creatorTypes, skills }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました')

      const assistantMsg: Message = { role: 'assistant', content: data.text }
      setMessages((prev) => [...prev, assistantMsg])
      if (data.proposedBio) setProposedBio(data.proposedBio)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'エラーが発生しました'
      setMessages((prev) => [...prev, { role: 'assistant', content: msg }])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setProposedBio(null)
    sendToAI(next)
  }

  // コードブロックを除いた表示用テキスト
  const renderText = (text: string) => text.replace(/```bio\n[\s\S]*?```/g, '').trim()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: '540px', maxHeight: '80vh',
        background: 'linear-gradient(135deg, #13131f, #1a0a2e)',
        border: '1px solid rgba(199,125,255,0.25)',
        borderRadius: '20px',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* ヘッダー */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#f0eff8', fontWeight: '700', fontSize: '15px', margin: 0 }}>✨ AI 自己紹介アシスタント</p>
            <p style={{ color: '#7c7b99', fontSize: '12px', margin: '2px 0 0' }}>質問に答えると自己紹介文を提案します</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7c7b99', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>

        {/* メッセージ一覧 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.role === 'user' ? 'linear-gradient(135deg, #ff6b9d, #c77dff)' : 'rgba(255,255,255,0.07)',
                color: '#f0eff8',
                fontSize: '14px',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
              }}>
                {renderText(m.content)}
              </div>
            </div>
          ))}

          {/* 提案された自己紹介文 */}
          {proposedBio && (
            <div style={{
              background: 'rgba(199,125,255,0.08)',
              border: '1px solid rgba(199,125,255,0.3)',
              borderRadius: '12px',
              padding: '14px',
            }}>
              <p style={{ color: '#c77dff', fontSize: '12px', fontWeight: '700', margin: '0 0 8px' }}>📝 自己紹介文の案（{proposedBio.length}文字）</p>
              <p style={{ color: '#f0eff8', fontSize: '14px', lineHeight: '1.8', margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{proposedBio}</p>
              <button
                onClick={() => { onApply(proposedBio); onClose() }}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                  color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                }}
              >
                この文章を使う
              </button>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '10px 16px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.07)', color: '#7c7b99', fontSize: '14px' }}>
                考え中...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 入力欄 */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="メッセージを入力..."
            disabled={loading}
            style={{
              flex: 1, padding: '10px 14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px', color: '#f0eff8', fontSize: '14px', outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              padding: '10px 16px', borderRadius: '10px', border: 'none',
              background: !input.trim() || loading ? 'rgba(199,125,255,0.3)' : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
              color: '#fff', fontSize: '14px', fontWeight: '700',
              cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            }}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  )
}
