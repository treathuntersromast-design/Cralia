/**
 * POST /api/pitch/[id]/reply
 * 依頼者が営業メッセージに返信する
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NOTIFICATION_TYPE } from '@/lib/constants/statuses'
import { VALIDATION } from '@/lib/constants/validation'
import { sendEmail, pitchRepliedEmail } from '@/lib/sendEmail'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: { replyBody?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { replyBody } = body
  if (!replyBody || typeof replyBody !== 'string' || !replyBody.trim()) {
    return NextResponse.json({ error: '返信内容を入力してください' }, { status: 400 })
  }
  if (replyBody.length > VALIDATION.PITCH_MESSAGE_MAX) {
    return NextResponse.json({ error: `返信は${VALIDATION.PITCH_MESSAGE_MAX}文字以内にしてください` }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 該当 pitch を取得（client_id = 本人のみ操作可）
  const { data: pitch } = await db
    .from('pitch_messages')
    .select('id, creator_id, client_id, replied_at')
    .eq('id', params.id)
    .eq('client_id', user.id)
    .single()

  if (!pitch) return NextResponse.json({ error: '対象のメッセージが見つかりません' }, { status: 404 })
  if (pitch.replied_at) return NextResponse.json({ error: 'すでに返信済みです' }, { status: 409 })

  const now = new Date().toISOString()
  const { error: updateError } = await db
    .from('pitch_messages')
    .update({ reply_body: replyBody.trim(), replied_at: now, read_at: now })
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: '返信の送信に失敗しました' }, { status: 500 })

  // 依頼者の表示名取得
  const { data: clientUser } = await db.from('users').select('display_name').eq('id', user.id).single()

  // クリエイターに通知 + メール送信
  try {
    await db.from('notifications').insert({
      user_id: pitch.creator_id,
      type:    NOTIFICATION_TYPE.PITCH_REPLIED,
      title:   `${clientUser?.display_name ?? '依頼者'} さんが営業メッセージに返信しました`,
      body:    replyBody.trim().slice(0, 80) + (replyBody.length > 80 ? '...' : ''),
      read_at: null,
    })
  } catch { /* 通知失敗は無視 */ }

  try {
    const { data: creatorAuth } = await db.auth.admin.getUserById(pitch.creator_id)
    const creatorEmail = creatorAuth?.user?.email
    const { data: creatorUser } = await db.from('users').select('display_name').eq('id', pitch.creator_id).single()
    if (creatorEmail) {
      await sendEmail(pitchRepliedEmail({
        recipientEmail: creatorEmail,
        recipientName:  creatorUser?.display_name ?? 'クリエイター',
        recipientId:    pitch.creator_id,
        clientName:     clientUser?.display_name ?? '依頼者',
        pitchId:        params.id,
      }))
    }
  } catch { /* メール送信失敗は無視 */ }

  return NextResponse.json({ ok: true })
}
