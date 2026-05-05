/**
 * GET /api/pitch/sent
 * クリエイターの送信済み営業メッセージ一覧
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
      client_id,
      users!pitch_messages_client_id_fkey (
        display_name, avatar_url
      )
    `)
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })

  return NextResponse.json({ data })
}
