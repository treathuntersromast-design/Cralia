// 手動調整記録（MVP では支払額に非反映。記録のみ）
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!isAdmin(user.id)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  let body: { amount?: unknown; reason?: unknown } = {}
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'リクエスト形式が不正です' }, { status: 400 }) }

  if (typeof body.amount !== 'number' || body.amount === 0) {
    return NextResponse.json({ error: 'amount が必要です（0 以外の整数）' }, { status: 400 })
  }
  if (typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    return NextResponse.json({ error: 'reason が必要です' }, { status: 400 })
  }
  if (body.reason.length > 500) {
    return NextResponse.json({ error: 'reason は 500 文字以内で入力してください' }, { status: 400 })
  }

  const db = getDb()

  const { data: payment } = await db
    .from('payments')
    .select('id')
    .eq('id', params.id)
    .single()

  if (!payment) return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 })

  const { error } = await db.from('payment_adjustments').insert({
    payment_id: params.id,
    admin_id:   user.id,
    amount:     body.amount,
    reason:     body.reason.trim(),
  })

  if (error) return NextResponse.json({ error: '記録に失敗しました' }, { status: 500 })

  return NextResponse.json({
    ok: true,
    note: 'この調整は支払額の計算に影響しません（記録のみ）',
  })
}
