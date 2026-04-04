'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function CalendarSettingsContent() {
  const searchParams = useSearchParams()
  const cal = searchParams.get('cal')
  const calMsg = searchParams.get('msg')
  const justConnected = cal === 'connected'
  const justErrored = cal === 'error'

  const [connected, setConnected] = useState<boolean | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
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

  // After successful OAuth, assume connected
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
        </Link>
        <Link href="/settings" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← 設定へ</Link>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 8px' }}>
            📅 Googleカレンダー連携
          </h1>
          <p style={{ color: '#7c7b99', fontSize: '14px', margin: 0 }}>
            連携すると、クライアントが依頼を作成する際にあなたのカレンダーを考慮した納期提案が自動で行われます。
          </p>
        </div>

        {/* メッセージ */}
        {message && (
          <div style={{
            padding: '12px 16px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px',
            background: message.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${message.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: message.ok ? '#4ade80' : '#f87171',
          }}>
            {message.text}
          </div>
        )}

        {/* ステータスカード */}
        <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '28px 24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
              background: connected ? 'rgba(74,222,128,0.12)' : 'rgba(199,125,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
            }}>
              {connected === null ? '⏳' : connected ? '✅' : '📅'}
            </div>
            <div>
              <p style={{ fontWeight: '700', fontSize: '16px', margin: '0 0 4px' }}>
                {connected === null ? '確認中...' : connected ? '連携済み' : '未連携'}
              </p>
              <p style={{ color: '#7c7b99', fontSize: '13px', margin: 0 }}>
                {connected
                  ? 'Googleカレンダーと連携しています。依頼フォームで納期自動提案が有効です。'
                  : '連携することで、依頼時の納期提案機能が利用できます。'}
              </p>
            </div>
          </div>

          {connected === false && (
            <a
              href="/api/auth/google"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                color: '#fff', fontSize: '15px', fontWeight: '700', textDecoration: 'none',
              }}
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
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)',
                color: '#f87171', fontSize: '14px', fontWeight: '600',
                cursor: disconnecting ? 'not-allowed' : 'pointer',
                opacity: disconnecting ? 0.6 : 1,
              }}
            >
              {disconnecting ? '処理中...' : '連携を解除する'}
            </button>
          )}
        </div>

        {/* 機能説明 */}
        <div style={{ background: 'rgba(199,125,255,0.06)', border: '1px solid rgba(199,125,255,0.15)', borderRadius: '16px', padding: '20px 24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#c77dff', margin: '0 0 12px' }}>
            連携するとできること
          </h2>
          <ul style={{ margin: 0, padding: '0 0 0 20px', color: '#a9a8c0', fontSize: '13px', lineHeight: '2' }}>
            <li>依頼を受けた際、カレンダーの予定（不在・出張・休暇等）を自動考慮</li>
            <li>日本の祝日を自動スキップした納期を提案</li>
            <li>クライアント側の依頼フォームに「カレンダーを考慮した納期提案」ボタンが表示される</li>
          </ul>
          <p style={{ color: '#5c5b78', fontSize: '12px', margin: '12px 0 0' }}>
            ※ 閲覧されるのは「終日の不在イベント」のみです。予定の詳細内容はCreMatchには共有されません。
          </p>
        </div>

        {/* 設定に戻るボタン */}
        <div style={{ marginTop: '32px' }}>
          <Link
            href="/settings"
            style={{
              display: 'block', textAlign: 'center', padding: '14px',
              borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: '#a9a8c0', fontSize: '15px',
              fontWeight: '600', textDecoration: 'none',
            }}
          >
            ← 設定に戻る
          </Link>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function CalendarSettingsPage() {
  return (
    <Suspense>
      <CalendarSettingsContent />
    </Suspense>
  )
}
