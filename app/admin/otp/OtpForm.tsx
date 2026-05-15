'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Mail, RefreshCw, ArrowRight, Loader2 } from 'lucide-react'

interface Props {
  email: string
}

export default function OtpForm({ email }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [code, setCode]           = useState('')
  const [sending, setSending]     = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sent, setSent]           = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => { void sendOtp() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function sendOtp() {
    setSending(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/otp/send', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'コードの送信に失敗しました')
      } else {
        setSent(true)
        setCountdown(data.cooldown ?? 60)
        if (data._devNote) setError(`[開発用] ${data._devNote}`)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setSending(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setVerifying(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/otp/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '認証に失敗しました')
        setCode('')
        inputRef.current?.focus()
      } else {
        // フルリロードで遷移することで、直前に set された admin_verified クッキーが
        // 確実にリクエストに含まれるようにする
        window.location.href = '/admin/redirect'
      }
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setVerifying(false)
    }
  }

  const isLoading    = sending || verifying
  const canSubmit    = code.length === 6 && !isLoading
  const canResend    = countdown <= 0 && !sending

  return (
    <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-[var(--c-surface)] border border-[var(--c-border)] rounded-[20px] px-8 py-10 shadow-[0_8px_32px_var(--c-shadow)]">

        {/* アイコン + タイトル */}
        <div className="text-center mb-7">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-[14px] bg-[#dc2626]/10 mb-4">
            <ShieldCheck size={28} color="#dc2626" aria-hidden />
          </span>
          <h1 className="text-[20px] font-extrabold text-[var(--c-text)] m-0 mb-2">
            管理者認証
          </h1>
          <p className="text-[13px] text-[var(--c-text-3)] m-0 leading-relaxed">
            2 段階認証が必要です
          </p>
        </div>

        {/* 送信中インジケーター */}
        {sending && !sent && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-[10px] bg-[var(--c-accent-a08)] mb-5 text-[13px] text-[var(--c-text-2)]">
            <Loader2 size={15} className="animate-spin shrink-0" aria-hidden />
            コードを送信中…
          </div>
        )}

        {/* 送信完了バナー */}
        {sent && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-[10px] bg-[#4ade80]/8 border border-[#4ade80]/25 mb-5">
            <Mail size={15} color="#16a34a" className="mt-0.5 shrink-0" aria-hidden />
            <p className="m-0 text-[13px] text-[var(--c-text-2)] leading-relaxed">
              <strong className="text-[var(--c-text)]">{email}</strong> に<br />
              6 桁のコードを送信しました
            </p>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="px-3.5 py-2.5 rounded-[8px] bg-[#f87171]/8 border border-[#f87171]/25 mb-4 text-[13px] text-[#dc2626]">
            {error}
          </div>
        )}

        {/* OTP 入力フォーム */}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-[12px] font-bold text-[var(--c-text-3)] mb-2 tracking-[0.04em]">
              認証コード（6桁）
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              disabled={isLoading}
              autoComplete="one-time-code"
              className={[
                'w-full px-4 py-3.5 rounded-[10px] text-[24px] font-bold text-center tracking-[0.4em]',
                'bg-[var(--c-input-bg)] text-[var(--c-text)] outline-none transition-colors',
                'border-[1.5px]',
                error
                  ? 'border-[#f87171]/60'
                  : 'border-[var(--c-input-border)] focus:border-[var(--c-accent)]',
              ].join(' ')}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              'w-full py-3 rounded-[10px] text-[14px] font-bold flex items-center justify-center gap-2 transition-all',
              canSubmit
                ? 'bg-gradient-to-r from-[#dc2626] to-[#991b1b] text-white cursor-pointer hover:opacity-90'
                : 'bg-[var(--c-surface-3)] text-[var(--c-text-4)] cursor-not-allowed',
            ].join(' ')}
          >
            {verifying
              ? <><Loader2 size={16} className="animate-spin" aria-hidden /> 確認中…</>
              : <><ArrowRight size={16} aria-hidden /> 確認する</>
            }
          </button>
        </form>

        {/* 再送信 */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => void sendOtp()}
            disabled={!canResend}
            className={[
              'inline-flex items-center gap-1.5 px-2 py-1 text-[12px] font-semibold bg-transparent border-none',
              canResend
                ? 'text-[var(--c-accent)] cursor-pointer hover:opacity-75'
                : 'text-[var(--c-text-4)] cursor-not-allowed',
            ].join(' ')}
          >
            <RefreshCw size={12} aria-hidden />
            {countdown > 0 ? `再送信（${countdown}s）` : 'コードを再送信'}
          </button>
        </div>
      </div>
    </div>
  )
}
