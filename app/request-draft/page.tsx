'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PenLine, SearchCheck, Calendar, Sparkles, AlertTriangle, Copy, Check, Send, ArrowLeft } from 'lucide-react'
import { CREATOR_TYPES } from '@/lib/constants/lists'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

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

const inputCls = 'w-full h-10 px-3.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition'

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
    const p = new URLSearchParams()
    if (form.title)      p.set('title',     form.title)
    if (form.deadline)   p.set('deadline',  form.deadline)
    if (form.budgetMin)  p.set('budgetMin', form.budgetMin)
    if (form.budgetMax)  p.set('budgetMax', form.budgetMax)
    p.set('orderType', form.orderType)
    if (proposedDraft)   p.set('description', proposedDraft)
    if (form.creatorTypes.length > 0) p.set('creatorTypes', form.creatorTypes.join(','))
    return `/jobs/new?${p.toString()}`
  }

  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center text-[var(--c-text-3)]">
        確認中...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">

        {/* タイトル */}
        <div className="mb-6">
          <h1 className="text-[24px] font-bold mb-1.5 flex items-center gap-2">
            <Sparkles size={22} className="text-brand" aria-hidden />
            AI 依頼文アシスタント
          </h1>
          <p className="text-[14px] text-[var(--c-text-3)]">
            ゼロから作る・既存の文章を添削する — どちらも AI がサポートします
          </p>
        </div>

        {/* 外部依頼の注意喚起 */}
        <div className="mb-6 px-5 py-4 rounded-[14px] bg-[#fbbf24]/7 border border-[#fbbf24]/25">
          <p className="font-bold text-[14px] text-[#d97706] mb-1.5 flex items-center gap-1.5">
            <AlertTriangle size={15} aria-hidden />
            Cralia 外でのやり取りについて
          </p>
          <p className="text-[13px] text-[var(--c-text-2)] leading-[1.7] m-0">
            この依頼文ツールで作成した文章を Cralia 外（SNS・知人経由など）でのやり取りに使う場合、
            <strong className="text-[var(--c-text)]">報酬トラブル・成果物の権利問題・不正行為などについて Cralia は一切の補償・仲介を行いません</strong>。
            クリエイターへの依頼は Cralia のプラットフォーム上で行うことを推奨します。
          </p>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-6">
          {(['create', 'review'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setStep('info'); setMessages([]); setProposedDraft(null) }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[14px] font-bold transition-colors ${
                tab === t
                  ? 'bg-brand text-white border-0'
                  : 'bg-[var(--c-surface)] border border-[var(--c-border)] text-[var(--c-text-2)] hover:bg-[var(--c-surface-2)]'
              }`}
            >
              {t === 'create'
                ? <><PenLine size={15} aria-hidden /> 依頼文を作る</>
                : <><SearchCheck size={15} aria-hidden /> 依頼文を添削する</>
              }
            </button>
          ))}
        </div>

        {/* ─── STEP 1: 基本情報 ─── */}
        {step === 'info' && (
          <Card bordered padded className="flex flex-col gap-5">

            {/* 案件タイトル */}
            <div>
              <label className="block text-[12px] text-[var(--c-text-3)] font-semibold tracking-wider uppercase mb-1.5">
                案件タイトル <span className="text-[var(--c-text-4)] normal-case font-normal">（任意）</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例: MVのイラスト制作"
                maxLength={100}
                className={inputCls}
              />
            </div>

            {/* 有償 / 無償 */}
            <div>
              <label className="block text-[12px] text-[var(--c-text-3)] font-semibold tracking-wider uppercase mb-2">
                報酬の有無 <span className="text-[#dc2626] text-[11px] normal-case font-normal">必須</span>
              </label>
              <div className="flex gap-2.5">
                {(['paid', 'free'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, orderType: v }))}
                    className={`px-6 py-2 rounded-[12px] text-[14px] transition-colors ${
                      form.orderType === v
                        ? 'border-2 border-brand bg-brand-soft text-brand font-bold'
                        : 'border border-[var(--c-border)] text-[var(--c-text-3)] hover:bg-[var(--c-surface-2)]'
                    }`}
                  >
                    {v === 'paid' ? '有償' : '無償'}
                  </button>
                ))}
              </div>
            </div>

            {/* 予算（有償時） */}
            {form.orderType === 'paid' && (
              <div>
                <label className="block text-[12px] text-[var(--c-text-3)] font-semibold tracking-wider uppercase mb-1.5">
                  予算（円） <span className="text-[var(--c-text-4)] normal-case font-normal">（任意）</span>
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="number"
                    value={form.budgetMin}
                    min={0}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
                    placeholder="下限（例: 5000）"
                    className={`${inputCls} max-w-[180px]`}
                  />
                  <span className="text-[var(--c-text-3)] shrink-0">〜</span>
                  <input
                    type="number"
                    value={form.budgetMax}
                    min={0}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
                    placeholder="上限（例: 30000）"
                    className={`${inputCls} max-w-[180px]`}
                  />
                </div>
              </div>
            )}

            {/* 希望納期 */}
            <div>
              <label htmlFor="draft-deadline" className="block text-[12px] text-[var(--c-text-3)] font-semibold tracking-wider uppercase mb-1.5">
                希望納期 <span className="text-[var(--c-text-4)] normal-case font-normal">（任意）</span>
              </label>
              <input
                id="draft-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                title="希望納期"
                className={`${inputCls} max-w-[200px]`}
              />
            </div>

            {/* クリエイタータイプ */}
            <div>
              <label className="block text-[12px] text-[var(--c-text-3)] font-semibold tracking-wider uppercase mb-2.5">
                募集クリエイタータイプ <span className="text-[var(--c-text-4)] normal-case font-normal">（任意・複数可）</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CREATOR_TYPES.map((t) => {
                  const active = form.creatorTypes.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleCreatorType(t)}
                      className={`px-3.5 py-1 rounded-full text-[13px] transition-colors ${
                        active
                          ? 'border-2 border-brand bg-brand-soft text-brand font-bold'
                          : 'border border-[var(--c-border)] text-[var(--c-text-3)] hover:bg-[var(--c-surface-2)]'
                      }`}
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
                <label className="block text-[12px] text-[var(--c-text-3)] font-semibold tracking-wider uppercase mb-1.5">
                  現在の依頼文 <span className="text-[#dc2626] text-[11px] normal-case font-normal">必須</span>
                </label>
                <textarea
                  value={existingDraft}
                  onChange={(e) => setExistingDraft(e.target.value)}
                  placeholder="添削してほしい依頼文をここに貼り付けてください..."
                  rows={8}
                  className="w-full px-3.5 py-2.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition resize-y leading-[1.7]"
                />
                <p className="text-[12px] text-[var(--c-text-4)] mt-1">{existingDraft.length} 文字</p>
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={tab === 'review' && existingDraft.trim().length === 0}
              onClick={startChat}
              className="w-full"
            >
              {tab === 'create'
                ? <><Sparkles size={16} aria-hidden /> AI と一緒に依頼文を作る</>
                : <><SearchCheck size={16} aria-hidden /> AI に添削してもらう</>
              }
            </Button>
          </Card>
        )}

        {/* ─── STEP 2: AI チャット ─── */}
        {step === 'chat' && (
          <div className="flex flex-col gap-4">

            {/* 基本情報サマリー */}
            <div className="px-4.5 py-3.5 rounded-[14px] bg-brand-soft border border-brand/20 flex flex-wrap gap-3 items-center">
              {form.title && <span className="text-[13px] text-brand font-bold">「{form.title}」</span>}
              <span className="text-[13px] text-[var(--c-text-3)]">
                {form.orderType === 'free' ? '無償' : budgetLabel()}
              </span>
              {form.deadline && (
                <span className="text-[13px] text-[var(--c-text-3)] flex items-center gap-1">
                  <Calendar size={13} aria-hidden />
                  {form.deadline}
                </span>
              )}
              {form.creatorTypes.length > 0 && (
                <span className="text-[13px] text-[var(--c-text-3)]">{form.creatorTypes.join(' / ')}</span>
              )}
              <button
                type="button"
                onClick={() => { setStep('info'); setMessages([]); setProposedDraft(null) }}
                className="ml-auto text-[12px] text-[var(--c-text-3)] bg-transparent border-0 cursor-pointer hover:text-brand transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={12} aria-hidden />
                情報を変更
              </button>
            </div>

            {/* チャット履歴 */}
            <Card bordered className="p-5 min-h-[320px] max-h-[480px] overflow-y-auto flex flex-col gap-3.5">
              {messages.length === 0 && sending && (
                <div className="text-[var(--c-text-4)] text-[14px] text-center m-auto">
                  AI が準備中...
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-3 text-[14px] leading-[1.7] whitespace-pre-wrap break-words border ${
                    m.role === 'user'
                      ? 'rounded-[18px_18px_4px_18px] bg-brand/10 border-brand/15 text-[var(--c-text)]'
                      : 'rounded-[18px_18px_18px_4px] bg-[var(--c-surface-2)] border-[var(--c-border)] text-[var(--c-text)]'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && messages.length > 0 && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-[18px_18px_18px_4px] bg-[var(--c-surface-2)] border border-[var(--c-border)] text-[var(--c-text-4)] text-[14px]">
                    入力中...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </Card>

            {/* エラー */}
            {aiError && (
              <div className="px-4 py-3 rounded-[10px] text-[13px] bg-[#dc2626]/8 border border-[#dc2626]/25 text-[#dc2626]">
                {aiError}
              </div>
            )}

            {/* 生成された依頼文 */}
            {proposedDraft && (
              <div className="p-5 rounded-[16px] bg-[#4ade80]/8 border border-[#4ade80]/25">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-bold text-[#16a34a] flex items-center gap-1.5">
                    <Check size={14} aria-hidden />
                    生成された依頼文
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] border-0 cursor-pointer text-[12px] font-semibold transition-colors ${
                        copied
                          ? 'bg-[#4ade80]/30 text-[#16a34a]'
                          : 'bg-[#4ade80]/15 text-[#16a34a] hover:bg-[#4ade80]/25'
                      }`}
                    >
                      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                      {copied ? 'コピーしました' : 'コピー'}
                    </button>
                    {isLoggedIn && (
                      <Link
                        href={buildJobsNewUrl()}
                        className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold bg-brand-soft border border-brand/30 text-brand no-underline hover:bg-brand/10 transition-colors"
                      >
                        案件として投稿 →
                      </Link>
                    )}
                  </div>
                </div>
                <p className="m-0 text-[14px] leading-[1.8] whitespace-pre-wrap text-[var(--c-text)]">
                  {proposedDraft}
                </p>
              </div>
            )}

            {/* 入力エリア */}
            <div className="flex gap-2.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder="AIへのメッセージ（Shift+Enter で改行）"
                rows={2}
                disabled={sending}
                className={`flex-1 px-3.5 py-2.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition resize-none leading-[1.6] ${sending ? 'opacity-60' : ''}`}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || sending}
                title="送信"
                className={`px-5 rounded-[12px] border-0 text-[14px] font-bold shrink-0 flex items-center justify-center transition-colors ${
                  !input.trim() || sending
                    ? 'bg-[var(--c-surface-2)] text-[var(--c-text-4)] cursor-not-allowed'
                    : 'bg-brand text-white cursor-pointer hover:bg-brand-ink'
                }`}
              >
                <Send size={16} aria-hidden />
              </button>
            </div>

            {remaining !== null && (
              <p className="m-0 text-[12px] text-[var(--c-text-4)] text-right">
                本日の残り利用回数: {remaining} 回
              </p>
            )}

            <p className="m-0 text-[12px] text-[var(--c-text-4)] text-center">
              AIの回答は参考情報です。内容を確認のうえご利用ください。
            </p>
          </div>
        )}
      </Container>
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
