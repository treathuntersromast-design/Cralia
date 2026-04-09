'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/dashboard'
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam === 'auth_callback_failed' ? '認証に失敗しました。再度お試しください。' : null
  )

  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません。')
      setLoading(false)
      return
    }

    router.push(nextPath)
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/api/auth/callback?next=${nextPath}`,
      },
    })

    if (error) {
      setError('Googleログインに失敗しました。')
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(22, 22, 31, 0.9)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(199, 125, 255, 0.2)',
      borderRadius: '24px',
      padding: '40px',
    }}>
      {/* ロゴ */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          Cralia
        </h1>
        <p style={{ color: '#7c7b99', marginTop: '8px', fontSize: '14px' }}>
          クリエイターマッチングプラットフォーム
        </p>
      </div>

      <h2 style={{ color: '#f0eff8', fontSize: '20px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>
        ログイン
      </h2>

      {/* Googleログイン */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.05)',
          color: '#f0eff8',
          fontSize: '15px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '20px',
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Googleでログイン
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ color: '#7c7b99', fontSize: '13px' }}>または</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* メール・パスワードフォーム */}
      <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(199,125,255,0.25)',
              background: 'rgba(255,255,255,0.05)',
              color: '#f0eff8',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(199,125,255,0.25)',
              background: 'rgba(255,255,255,0.05)',
              color: '#f0eff8',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <p style={{
            color: '#ff6b9d',
            fontSize: '13px',
            background: 'rgba(255,107,157,0.1)',
            border: '1px solid rgba(255,107,157,0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            margin: 0,
          }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: loading
              ? 'rgba(199,125,255,0.4)'
              : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '20px', color: '#7c7b99', fontSize: '14px' }}>
        アカウントをお持ちでない方は{' '}
        <Link href="/signup" style={{ color: '#c77dff', textDecoration: 'none', fontWeight: '600' }}>
          新規登録
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
