/**
 * GET /api/pitch/inbox
 * 依頼者の営業メッセージ受信箱
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data, error } = await supabase
    .from('pitch_messages')
    .select(`
      id, message, read_at, replied_at, reply_body, created_at,
      creator_id,
      users!pitch_messages_creator_id_fkey (
        display_name, avatar_url
      )
    `)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })

  // 未読を既読にする
  const unreadIds = (data ?? []).filter((p) => !p.read_at).map((p) => p.id)
  if (unreadIds.length > 0) {
    try {
      await supabase
        .from('pitch_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds)
    } catch { /* 既読更新失敗は無視 */ }
  }

  return NextResponse.json({ data })
}
