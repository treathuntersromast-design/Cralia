/**
 * POST /api/pitch
 * クリエイターが依頼者に営業メッセージを送る
 * - クリエイターロールチェック
 * - 同日同クライアントへの重複送信防止
 * - 通知送信
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { hasCreatorRole, hasClientRole } from '@/lib/constants/activity'
import { VALIDATION } from '@/lib/constants/validation'
import { NOTIFICATION_TYPE } from '@/lib/constants/statuses'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // クリエイターロール確認
  const { data: userData } = await supabase
    .from('users')
    .select('activity_style_id, display_name')
    .eq('id', user.id)
    .single()

  if (!hasCreatorRole(userData?.activity_style_id as number | null)) {
    return NextResponse.json({ error: 'クリエイターとして登録されているアカウントのみ営業メッセージを送れます' }, { status: 403 })
  }

  let body: { clientId?: string; message?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { clientId, message } = body

  if (!clientId) return NextResponse.json({ error: 'clientId は必須です' }, { status: 400 })
  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'メッセージを入力してください' }, { status: 400 })
  }
  if (message.length > VALIDATION.PITCH_MESSAGE_MAX) {
    return NextResponse.json({ error: `メッセージは${VALIDATION.PITCH_MESSAGE_MAX}文字以内にしてください` }, { status: 400 })
  }
  if (clientId === user.id) {
    return NextResponse.json({ error: '自分自身に営業メッセージは送れません' }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 送信先が依頼者ロールか確認
  const { data: targetUser } = await db.from('users').select('activity_style_id, display_name').eq('id', clientId).single()
  if (!targetUser || !hasClientRole(targetUser.activity_style_id as number | null)) {
    return NextResponse.json({ error: '依頼者として登録されているユーザーにのみ送れます' }, { status: 400 })
  }

  // 同日同クライアントへの重複防止
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await db
    .from('pitch_messages')
    .select('id')
    .eq('creator_id', user.id)
    .eq('client_id', clientId)
    .gte('created_at', `${today}T00:00:00Z`)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: '本日はすでにこの依頼者に営業メッセージを送信済みです' }, { status: 409 })
  }

  // pitch_messages に insert
  const { data: pitch, error: insertError } = await db
    .from('pitch_messages')
    .insert({
      creator_id: user.id,
      client_id:  clientId,
      message:    message.trim(),
    })
    .select('id')
    .single()

  if (insertError || !pitch) {
    return NextResponse.json({ error: 'メッセージの送信に失敗しました' }, { status: 500 })
  }

  // 依頼者に通知送信
  try {
    await db.from('notifications').insert({
      user_id: clientId,
      type:    NOTIFICATION_TYPE.PITCH_RECEIVED,
      title:   `${userData?.display_name ?? 'クリエイター'} さんから営業メッセージが届きました`,
      body:    message.trim().slice(0, 80) + (message.length > 80 ? '...' : ''),
      read_at: null,
    })
  } catch { /* 通知失敗はサイレント */ }

  return NextResponse.json({ id: pitch.id }, { status: 201 })
}
