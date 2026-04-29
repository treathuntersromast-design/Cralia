'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, CheckCircle2 } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function CalendarSettingsContent() {
  const searchParams = useSearchParams()
  const cal = searchParams.get('cal')
  const calMsg = searchParams.get('msg')
  const justConnected = cal === 'connected'
  const justErrored = cal === 'error'

  const [connected, setConnected]     = useState<boolean | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage]         = useState<{ text: string; ok: boolean } | null>(
    justConnected ? { text: 'Googleカレンダーの連携が完了しました！', ok: true }
    : justErrored ? { text: calMsg ? decodeURIComponent(calMsg) : 'Google連携中にエラーが発生しました。', ok: false }
    : null
  )

  useEffect(() => {
    fetch('/api/calendar/status/me')
      .then((r) => r.json())
      .then((d) => setConnected(d.connected ?? false))
      .catch(() => setConnected(false))
  }, [])

  useEffect(() => {
    if (justConnected) setConnected(true)
  }, [justConnected])

  const handleDisconnect = async () => {
    if (!window.confirm(
      'Googleカレンダーの連携を解除しますか？\n解除後、依頼フォームでの納期自動提案が利用できなくなります。'
    )) return

    setDisconnecting(true)
    setMessage(null)
    const res = await fetch('/api/calendar/disconnect', { method: 'DELETE' })
    if (res.ok) {
      setConnected(false)
      setMessage({ text: 'Googleカレンダーの連携を解除しました。', ok: true })
    } else {
      const data = await res.json()
      setMessage({ text: data.error ?? '解除に失敗しました', ok: false })
    }
    setDisconnecting(false)
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <div className="mb-8">
          <h1 className="text-[26px] font-bold mb-2 flex items-center gap-3">
            <Calendar size={24} className="text-brand" aria-hidden />
            Googleカレンダー連携
          </h1>
          <p className="text-[14px] text-[var(--c-text-3)]">
            連携すると、クライアントが依頼を作成する際にあなたのカレンダーを考慮した納期提案が自動で行われます。
          </p>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-card mb-6 text-[14px] ${message.ok ? 'bg-[#4ade80]/8 border border-[#4ade80]/25 text-[#16a34a]' : 'bg-[#dc2626]/8 border border-[#dc2626]/25 text-[#dc2626]'}`}>
            {message.text}
          </div>
        )}

        {/* ステータスカード */}
        <Card bordered padded className="mb-5">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-[14px] shrink-0 flex items-center justify-center ${connected ? 'bg-[#4ade80]/10 text-[#16a34a]' : 'bg-brand-soft text-brand'}`}>
              {connected === null
                ? <Calendar size={22} aria-hidden />
                : connected
                ? <CheckCircle2 size={22} aria-hidden />
                : <Calendar size={22} aria-hidden />
              }
            </div>
            <div>
              <p className="font-bold text-[16px] mb-1">
                {connected === null ? '確認中...' : connected ? '連携済み' : '未連携'}
              </p>
              <p className="text-[13px] text-[var(--c-text-3)]">
                {connected
                  ? 'Googleカレンダーと連携しています。依頼フォームで納期自動提案が有効です。'
                  : '連携することで、依頼時の納期提案機能が利用できます。'}
              </p>
            </div>
          </div>

          {connected === false && (
            <a
              href="/api/auth/google"
              className="flex items-center justify-center gap-2.5 h-11 px-4 rounded-[8px] border border-[var(--c-border-3)] bg-white text-[14px] font-semibold text-[#3c4043] hover:bg-gray-50 no-underline transition-colors"
            >
              <GoogleIcon />
              Googleカレンダーを連携する
            </a>
          )}

          {connected === true && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full h-11 rounded-[8px] border border-[#dc2626]/30 bg-[#dc2626]/5 text-[#dc2626] text-[14px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#dc2626]/10 transition-colors"
            >
              {disconnecting ? '処理中...' : '連携を解除する'}
            </button>
          )}
        </Card>

        {/* 機能説明 */}
        <div className="bg-brand-soft border border-brand/15 rounded-card p-6">
          <h2 className="text-[14px] font-bold text-brand mb-3">連携するとできること</h2>
          <ul className="text-[13px] text-[var(--c-text-2)] leading-[2] m-0 pl-5">
            <li>依頼を受けた際、カレンダーの予定（不在・出張・休暇等）を自動考慮</li>
            <li>日本の祝日を自動スキップした納期を提案</li>
            <li>クライアント側の依頼フォームに「カレンダーを考慮した納期提案」ボタンが表示される</li>
          </ul>
          <p className="text-[12px] text-[var(--c-text-4)] mt-3">
            ※ 閲覧されるのは「終日の不在イベント」のみです。予定の詳細内容はCraliaには共有されません。
          </p>
        </div>
      </Container>
    </div>
  )
}

export default function CalendarSettingsPage() {
  return (
    <Suspense>
      <CalendarSettingsContent />
    </Suspense>
  )
}
