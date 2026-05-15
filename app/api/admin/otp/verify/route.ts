import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createAdminToken, ADMIN_COOKIE_NAME } from '@/lib/adminAuth'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  let body: { code?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 }) }

  const { code } = body
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: '6桁の数字を入力してください' }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 有効なコードを検索（最新のものを優先）
  const { data: token } = await db
    .from('admin_otp_tokens')
    .select('id')
    .eq('user_id', user.id)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!token) {
    return NextResponse.json(
      { error: 'コードが正しくないか、有効期限が切れています' },
      { status: 400 }
    )
  }

  // 使用済みにして再利用を防ぐ
  await db.from('admin_otp_tokens').update({ used: true }).eq('id', token.id)

  // 検証済みクッキーを発行
  const { value, maxAge } = await createAdminToken(user.id)
  const response = NextResponse.json({ verified: true })
  response.cookies.set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path:     '/',
  })
  return response
}
