'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

interface Props {
  creatorName:   string
  displayName:   string
  existingDraft: string
  onApplyDraft:  (draft: string) => void
}

type Mode = 'create' | 'review'

export default function RequestDraftAssistant({ creatorName, displayName, existingDraft, onApplyDraft }: Props) {
  const [open,          setOpen]          = useState(false)
  const [mode,          setMode]          = useState<Mode | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [latestDraft,   setLatestDraft]   = useState<string | null>(null)
  const [profileSent,   setProfileSent]   = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const reset = () => {
    setMode(null)
    setMessages([])
    setInput('')
    setError(null)
    setLatestDraft(null)
    setProfileSent(false)
  }

  const startSession = async (selectedMode: Mode) => {
    setMode(selectedMode)
    setLoading(true)
    setError(null)

    // 初回メッセージ：自己紹介を自動で含める
    const profileIntro = displayName
      ? `依頼者名: ${displayName}`
      : ''

    const res = await fetch('/api/ai/request-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages:      [],
        mode:          selectedMode,
        displayName,
        creatorName,
        existingDraft: selectedMode === 'review' ? existingDraft : undefined,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'エラーが発生しました')
      setMode(null)
      return
    }

    // 初回の送信メッセージをメッセージ履歴に追加
    const firstUserMsg: Message = selectedMode === 'review' && existingDraft
      ? { role: 'user', content: `添削をお願いします。現在の依頼文は以下のとおりです。\n\n${existingDraft}` }
      : { role: 'user', content: 'こんにちは。依頼文を一緒に作成していただけますか？' }

    const assistantMsg: Message = { role: 'assistant', content: data.text }

    setMessages([firstUserMsg, assistantMsg])
    setProfileSent(true)
    if (data.proposedDraft) setLatestDraft(data.proposedDraft)
  }

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    // プロフィールは初回のみ送る
    const res = await fetch('/api/ai/request-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages:      nextMessages,
        mode,
        displayName:   profileSent ? undefined : displayName,
        creatorName,
        existingDraft: mode === 'review' ? existingDraft : undefined,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'エラーが発生しました')
      return
    }

    const assistantMsg: Message = { role: 'assistant', content: data.text }
    setMessages([...nextMessages, assistantMsg])
    if (data.proposedDraft) setLatestDraft(data.proposedDraft)
  }

  // メッセージテキストから ```draft ブロックを除去して表示
  function renderMessageText(text: string): string {
    return text.replace(/```draft\n[\s\S]*?```/g, '').trim()
  }

  // draft ブロックを抽出して表示（メッセージ内に複数ある場合は最後のもの）
  function extractDraftFromMessage(text: string): string | null {
    const matches = [...text.matchAll(/```draft\n([\s\S]*?)```/g)]
    if (matches.length === 0) return null
    return matches[matches.length - 1][1].trim()
  }

  const btnBase: React.CSSProperties = {
    padding: '10px 20px', borderRadius: '10px', fontSize: '13px',
    fontWeight: '700', cursor: 'pointer', border: 'none',
  }

  return (
    <>
      {/* トリガーボタン */}
      <button
        type="button"
        onClick={() => { setOpen(true); reset() }}
        style={{
          width: '100%', padding: '13px', borderRadius: '12px', fontSize: '14px',
          fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px',
          border: '1px solid rgba(199,125,255,0.35)',
          background: 'rgba(199,125,255,0.08)',
          color: '#c77dff',
        }}
      >
        ✨ AIで依頼文を作成・添削する
      </button>

      {/* モーダルオーバーレイ */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{
            width: '100%', maxWidth: '640px', maxHeight: '90vh',
            background: '#16161f', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* ヘッダー */}
            <div style={{
              padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: '800', fontSize: '16px', color: '#f0eff8' }}>
                  ✨ AI 依頼文アシスタント
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#7c7b99' }}>
                  依頼先：{creatorName} さん
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: '#5c5b78', fontSize: '20px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* コンテンツ */}
            {!mode ? (
              /* モード選択画面 */
              <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#a9a8c0', lineHeight: '1.7', textAlign: 'center' }}>
                  依頼文をどうしますか？
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* 作成モード */}
                  <button
                    type="button"
                    onClick={() => startSession('create')}
                    style={{
                      padding: '20px', borderRadius: '14px', textAlign: 'left',
                      border: '1px solid rgba(199,125,255,0.3)',
                      background: 'rgba(199,125,255,0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <p style={{ margin: '0 0 4px', fontWeight: '800', fontSize: '15px', color: '#c77dff' }}>
                      ✍️ 一から作成する
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#7c7b99', lineHeight: '1.6' }}>
                      概要・用途を伝えながら、AIと一緒に依頼文を作ります
                    </p>
                  </button>

                  {/* 添削モード */}
                  <button
                    type="button"
                    onClick={() => startSession('review')}
                    disabled={!existingDraft.trim()}
                    style={{
                      padding: '20px', borderRadius: '14px', textAlign: 'left',
                      border: `1px solid ${existingDraft.trim() ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      background: existingDraft.trim() ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)',
                      cursor: existingDraft.trim() ? 'pointer' : 'not-allowed',
                      opacity: existingDraft.trim() ? 1 : 0.5,
                    }}
                  >
                    <p style={{ margin: '0 0 4px', fontWeight: '800', fontSize: '15px', color: existingDraft.trim() ? '#fbbf24' : '#5c5b78' }}>
                      🔍 既存の依頼文を添削する
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#7c7b99', lineHeight: '1.6' }}>
                      {existingDraft.trim()
                        ? '入力済みの依頼文を確認し、改善点を提案します'
                        : '依頼内容フォームに文章を入力してから利用できます'}
                    </p>
                  </button>
                </div>

                {/* 注意書き */}
                <div style={{
                  padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#5c5b78', lineHeight: '1.7' }}>
                    📌 AIは概要・用途が含まれているか確認します。<br />
                    外部SNSや連絡先への誘導は原則禁止です（双方の合意がある場合を除く）。
                  </p>
                </div>
              </div>
            ) : (
              /* チャット画面 */
              <>
                {/* モード表示 + リセット */}
                <div style={{
                  padding: '8px 16px', background: 'rgba(255,255,255,0.03)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '12px', color: '#7c7b99' }}>
                    {mode === 'create' ? '✍️ 作成モード' : '🔍 添削モード'}
                  </span>
                  <button
                    type="button"
                    onClick={reset}
                    style={{ background: 'none', border: 'none', color: '#5c5b78', fontSize: '12px', cursor: 'pointer' }}
                  >
                    ← モードを変える
                  </button>
                </div>

                {/* メッセージ一覧 */}
                <div
                  ref={scrollRef}
                  style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  {messages.map((msg, i) => {
                    const isUser = msg.role === 'user'
                    const displayText = isUser ? msg.content : renderMessageText(msg.content)
                    const inlineDraft = isUser ? null : extractDraftFromMessage(msg.content)

                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: '8px' }}>
                        <div style={{
                          maxWidth: '85%', padding: '10px 14px', borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isUser ? 'rgba(199,125,255,0.2)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isUser ? 'rgba(199,125,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          fontSize: '13px', color: '#f0eff8', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {displayText || (isUser ? '' : '...')}
                        </div>

                        {/* 依頼文の案が含まれている場合 */}
                        {inlineDraft && (
                          <div style={{
                            maxWidth: '90%', padding: '14px 16px', borderRadius: '14px',
                            background: 'rgba(199,125,255,0.08)', border: '1px solid rgba(199,125,255,0.25)',
                          }}>
                            <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: '700', color: '#c77dff', letterSpacing: '0.06em' }}>
                              依頼文（案）
                            </p>
                            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#d0cfea', lineHeight: '1.8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {inlineDraft}
                            </p>
                            <button
                              type="button"
                              onClick={() => { onApplyDraft(inlineDraft); setOpen(false) }}
                              style={{
                                ...btnBase,
                                background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                                color: '#fff', fontSize: '13px', padding: '8px 16px',
                              }}
                            >
                              この依頼文をフォームに使う
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {loading && (
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <div style={{
                        padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '13px', color: '#7c7b99',
                      }}>
                        考え中...
                      </div>
                    </div>
                  )}

                  {error && (
                    <p style={{ fontSize: '13px', color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '10px 14px', margin: 0 }}>
                      {error}
                    </p>
                  )}
                </div>

                {/* 最新の依頼文案がある場合、下部に固定表示 */}
                {latestDraft && (
                  <div style={{
                    padding: '10px 16px', borderTop: '1px solid rgba(199,125,255,0.2)',
                    background: 'rgba(199,125,255,0.05)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#c77dff' }}>✨ 依頼文の案があります</p>
                    <button
                      type="button"
                      onClick={() => { onApplyDraft(latestDraft); setOpen(false) }}
                      style={{
                        ...btnBase,
                        background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                        color: '#fff', fontSize: '12px', padding: '7px 14px', flexShrink: 0,
                      }}
                    >
                      フォームに使う
                    </button>
                  </div>
                )}

                {/* 入力フォーム */}
                <div style={{
                  padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', gap: '8px', flexShrink: 0,
                }}>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                    }}
                    placeholder="メッセージを入力... (Shift+Enter で改行)"
                    rows={2}
                    disabled={loading}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: '10px', resize: 'none',
                      border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(255,255,255,0.05)',
                      color: '#f0eff8', fontSize: '14px', outline: 'none', lineHeight: '1.5',
                    }}
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    style={{
                      ...btnBase,
                      alignSelf: 'flex-end',
                      background: loading || !input.trim()
                        ? 'rgba(199,125,255,0.2)'
                        : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                      color: '#fff', padding: '10px 16px',
                      cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    送信
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
