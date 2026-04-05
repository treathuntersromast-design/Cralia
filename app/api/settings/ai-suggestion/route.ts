/**
 * GET  /api/settings/ai-suggestion  — ai_suggestion_enabled 取得
 * POST /api/settings/ai-suggestion  — ai_suggestion_enabled 更新
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const db = getDb()
  const { data } = await db
    .from('users')
    .select('ai_suggestion_enabled')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ enabled: data?.ai_suggestion_enabled ?? true })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled は boolean で指定してください' }, { status: 400 })
  }

  const db = getDb()
  const { error } = await db
    .from('users')
    .update({ ai_suggestion_enabled: body.enabled, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    if (error.code === '42703') {
      // カラム未追加フォールバック
      return NextResponse.json({ success: true, warning: 'ai_suggestion_enabled はマイグレーション未適用です' })
    }
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
