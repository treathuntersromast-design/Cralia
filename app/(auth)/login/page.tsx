'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'

const inputCls = 'w-full h-11 px-3.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[15px] outline-none focus:border-brand transition'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/dashboard'
  const errorParam = searchParams.get('error')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(
    errorParam === 'auth_callback_failed' ? '認証に失敗しました。再度お試しください。' : null
  )

  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('メールアドレスまたはパスワードが正しくありません。'); setLoading(false); return }
    router.push(nextPath)
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/api/auth/callback?next=${nextPath}` },
    })
    if (error) { setError('Googleログインに失敗しました。'); setLoading(false) }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-[32px] font-bold text-brand leading-none">Cralia</h1>
        <p className="text-[14px] text-[var(--c-text-3)] mt-1.5">クリエイターマッチングプラットフォーム</p>
      </div>

      <Card padded bordered>
        <h2 className="text-[20px] font-bold text-center mb-6">ログイン</h2>

        <button
          type="button" onClick={handleGoogleLogin} disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 h-11 px-4 rounded-[8px] border border-[var(--c-border-3)] bg-white text-[14px] font-semibold text-[#3c4043] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-5"
        >
          <GoogleLogo /> Googleでログイン
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[var(--c-border-2)]" />
          <span className="text-[13px] text-[var(--c-text-3)]">または</span>
          <div className="flex-1 h-px bg-[var(--c-border-2)]" />
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <Field label="メールアドレス" htmlFor="email" required>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="your@email.com" className={inputCls} />
          </Field>

          <Field label="パスワード" htmlFor="password" required>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required placeholder="••••••••" className={inputCls} />
          </Field>

          {error && (
            <p className="text-[13px] text-[#dc2626] bg-[#dc2626]/8 border border-[#dc2626]/25 rounded-[8px] px-3.5 py-2.5 m-0">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-1">
            ログイン
          </Button>
        </form>

        <p className="text-center mt-5 text-[14px] text-[var(--c-text-3)]">
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className="text-brand font-semibold no-underline hover:underline">新規登録</Link>
        </p>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}
