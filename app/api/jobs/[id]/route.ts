import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── PATCH /api/jobs/[id] ──────────────────────────────────
// 案件のステータス変更（open ↔ closed）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const status = body.status === 'closed' ? 'closed' : 'open'

  const { error } = await supabase
    .from('job_listings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('client_id', user.id) // 本人のみ変更可

  if (error) return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })

  return NextResponse.json({ success: true })
}

// ── DELETE /api/jobs/[id] ─────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { error } = await supabase
    .from('job_listings')
    .delete()
    .eq('id', params.id)
    .eq('client_id', user.id)

  if (error) return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })

  return NextResponse.json({ success: true })
}
