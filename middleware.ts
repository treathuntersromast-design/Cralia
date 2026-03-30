import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// 認証が必要なパス（前方一致）
const PROTECTED_PATHS = ['/dashboard', '/profile', '/chat', '/orders', '/settings']

// 認証済みユーザーがアクセスすべきでないパス
const AUTH_PATHS = ['/login', '/signup']

// プロフィール未設定でもアクセス可能な認証済み専用パス
const SETUP_ALLOWED_PATHS = ['/profile/setup']

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

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))
  const isSetupAllowed = SETUP_ALLOWED_PATHS.some((p) => pathname.startsWith(p))

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
      .select('roles, display_name')
      .eq('id', user.id)
      .single()

    const needsSetup = !profile || (
      (!profile.roles || profile.roles.length === 0) &&
      !profile.display_name
    )
    if (needsSetup) {
      return NextResponse.redirect(new URL('/profile/setup', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
