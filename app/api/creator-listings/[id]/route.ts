import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── PATCH /api/creator-listings/[id] ──────────────────────
// 仕事募集を締め切る（status='closed'、本人のみ）
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

  if (body.status !== 'closed') {
    return NextResponse.json({ error: '変更できるステータスは "closed" のみです' }, { status: 400 })
  }

  const { error } = await supabase
    .from('creator_listings')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('creator_id', user.id) // RLS に加えてアプリ側でも確認

  if (error) return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
