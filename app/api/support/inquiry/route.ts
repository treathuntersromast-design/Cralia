import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/aiGuard'
import { logError } from '@/lib/logError'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { allowed } = await checkRateLimit(user.id, 'support/inquiry')
  if (!allowed) {
    return NextResponse.json(
      { error: '本日の問い合わせ上限に達しました。時間をおいて再度お試しください。' },
      { status: 429 }
    )
  }

  let body: { body?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です' }, { status: 400 })
  }

  const text = body.body
  if (typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: '問い合わせ内容を入力してください' }, { status: 400 })
  }
  if (text.length > 500) {
    return NextResponse.json({ error: '500文字以内で入力してください' }, { status: 400 })
  }

  // createClient() のみ使用。RLS の support_inquiries_insert_own により auth.uid() = user_id を検証
  const { error } = await supabase.from('support_inquiries').insert({
    user_id: user.id,
    body: text.trim(),
  })

  if (error) {
    await logError({
      endpoint: 'support/inquiry',
      message: error.message,
      userId: user.id,
      // 問い合わせ本文は渡さない
    })
    return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
