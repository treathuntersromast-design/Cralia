import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { ACTIVITY_STYLE_ID } from '@/lib/constants/activity'
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/adminAuth'

// 管理者メールリスト（小文字に正規化して比較）
const ADMIN_EMAILS_LIST = (process.env.ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

// 認証が必要なパス（前方一致）
const PROTECTED_PATHS = ['/dashboard', '/profile', '/chat', '/orders', '/settings', '/clients', '/projects', '/notifications', '/messages', '/events', '/admin']

// 認証済みユーザーがアクセスすべきでないパス
const AUTH_PATHS = ['/login', '/signup']

// プロフィール未設定でもアクセス可能な認証済み専用パス
const SETUP_ALLOWED_PATHS = ['/profile/setup', '/profile/setup-prompt']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected    = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPage     = AUTH_PATHS.some((p) => pathname.startsWith(p))
  const isSetupAllowed = SETUP_ALLOWED_PATHS.some((p) => pathname.startsWith(p))

  // ── 管理者 OTP チェック ─────────────────────────────────────────
  // 管理者ユーザーが /admin/otp 以外の保護ページにアクセスする場合、
  // OTP 検証済みクッキーが必要。
  // email/password ログインは auth callback を経由しないためここで捕捉する。
  const isAdminUser = !!user
    && ADMIN_EMAILS_LIST.length > 0
    && ADMIN_EMAILS_LIST.includes((user.email ?? '').toLowerCase())

  if (isAdminUser && !pathname.startsWith('/admin/otp')) {
    const needsOtpCheck = isProtected || pathname.startsWith('/admin')
    if (needsOtpCheck) {
      const cookie   = request.cookies.get(ADMIN_COOKIE_NAME)?.value
      const verified = await verifyAdminToken(cookie)
      if (!verified || verified !== user.id) {
        return NextResponse.redirect(new URL('/admin/otp', request.url))
      }
    }
    // /admin/* はプロフィールチェック不要なのでここで抜ける
    if (pathname.startsWith('/admin')) return response
  }
  // ────────────────────────────────────────────────────────────────

  // 未ログインで保護されたページにアクセス → /login へ
  if (!user && (isProtected || isSetupAllowed)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ログイン済みで /login や /signup にアクセス → /dashboard へ
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ログイン済み・保護ページ・セットアップページ以外はそのまま通す
  if (!user || isSetupAllowed) {
    return response
  }

  // ログイン済みで /dashboard などにアクセス時、プロフィール未設定なら /profile/setup へ
  if (isProtected) {
    const { data: profile } = await supabase
      .from('users')
      .select('activity_style_id, display_name')
      .eq('id', user.id)
      .single()

    const needsSetup = !profile || (
      !Object.values(ACTIVITY_STYLE_ID).includes(profile.activity_style_id as 1 | 2 | 3) &&
      !profile.display_name
    )
    if (needsSetup) {
      return NextResponse.redirect(new URL('/profile/setup-prompt', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
