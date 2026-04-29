'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1px solid var(--c-input-border)',
  background: 'var(--c-input-bg)',
  color: 'var(--c-text)', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--c-surface)', backdropFilter: 'blur(20px)',
  border: '1px solid var(--c-accent-a20)', borderRadius: '24px', padding: '40px',
}

export default function SignupPage() {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [done,        setDone]        = useState(false)

  const supabase = createClient()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
    })
    if (error) {
      if (error.message.includes('already registered')) {
        setError('このメールアドレスはすでに登録されています。')
      } else if (error.message.includes('Password should be at least')) {
        setError('パスワードは6文字以上で入力してください。')
      } else {
        setError('登録に失敗しました。しばらく後に再度お試しください。')
      }
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    })
    if (error) { setError('Googleでの登録に失敗しました。'); setLoading(false) }
  }

  if (done) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
        <h2 style={{ color: 'var(--c-text)', fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>
          確認メールを送信しました
        </h2>
        <p style={{ color: 'var(--c-text-2)', fontSize: '15px', lineHeight: '1.6' }}>
          <strong style={{ color: 'var(--c-accent)' }}>{email}</strong> に確認メールを送信しました。
          メール内のリンクをクリックして登録を完了してください。
        </p>
        <p style={{ color: 'var(--c-text-3)', fontSize: '13px', marginTop: '16px' }}>
          メールが届かない場合は迷惑メールフォルダをご確認ください。
        </p>
        <Link href="/login" style={{ display: 'inline-block', marginTop: '24px', color: 'var(--c-accent)', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
          ← ログインページへ
        </Link>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      {/* ロゴ */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '800', color: 'var(--c-accent)', margin: 0 }}>
          Cralia
        </h1>
        <p style={{ color: 'var(--c-text-3)', marginTop: '8px', fontSize: '14px' }}>
          クリエイターマッチングプラットフォーム
        </p>
      </div>

      <h2 style={{ color: 'var(--c-text)', fontSize: '20px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>
        新規登録
      </h2>

      {/* Googleで登録 */}
      <button type="button" onClick={handleGoogleSignup} disabled={loading} style={{
        width: '100%', padding: '12px', borderRadius: '12px',
        border: '1px solid var(--c-border-3)', background: 'var(--c-input-bg)',
        color: 'var(--c-text)', fontSize: '15px', fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        marginBottom: '20px', opacity: loading ? 0.6 : 1,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Googleで登録
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--c-border-2)' }} />
        <span style={{ color: 'var(--c-text-3)', fontSize: '13px' }}>または</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--c-border-2)' }} />
      </div>

      <form onSubmit={handleEmailSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--c-text-2)', fontSize: '13px', marginBottom: '6px' }}>
            メールアドレス
          </label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', color: 'var(--c-text-2)', fontSize: '13px', marginBottom: '6px' }}>
            パスワード（6文字以上）
          </label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" style={inputStyle} />
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)}
            style={{ marginTop: '3px', flexShrink: 0, accentColor: 'var(--c-accent)', width: '16px', height: '16px' }} />
          <span style={{ fontSize: '13px', color: 'var(--c-text-2)', lineHeight: '1.6' }}>
            <Link href="/terms"   target="_blank" style={{ color: 'var(--c-accent)', textDecoration: 'none', fontWeight: '600' }}>利用規約</Link>
            {' '}および{' '}
            <Link href="/privacy" target="_blank" style={{ color: 'var(--c-accent)', textDecoration: 'none', fontWeight: '600' }}>プライバシーポリシー</Link>
            に同意します（18歳未満の方は保護者の同意が必要です）
          </span>
        </label>

        {error && (
          <p style={{ color: 'var(--c-accent-alt)', fontSize: '13px', background: 'var(--c-alt-a10)', border: '1px solid var(--c-alt-a30)', borderRadius: '8px', padding: '10px 14px', margin: 0 }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading || !termsAgreed} style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
          background: loading ? 'var(--c-accent-a40)' : 'var(--c-grad-primary)',
          color: '#fff', fontSize: '16px', fontWeight: '700',
          cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
        }}>
          {loading ? '登録中...' : '登録する'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--c-text-3)', fontSize: '14px' }}>
        すでにアカウントをお持ちの方は{' '}
        <Link href="/login" style={{ color: 'var(--c-accent)', textDecoration: 'none', fontWeight: '600' }}>ログイン</Link>
      </p>
    </div>
  )
}
