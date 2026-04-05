/**
 * GET  /api/messages?projectId=xxx  — メッセージ一覧取得
 * POST /api/messages                — メッセージ送信
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId は必須です' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const db = getDb()

  // 参加者確認
  const { data: order } = await db
    .from('projects')
    .select('client_id, creator_id')
    .eq('id', projectId)
    .single()

  if (!order) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
  if (order.client_id !== user.id && order.creator_id !== user.id) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  const { data: messages, error } = await db
    .from('messages')
    .select('id, sender_id, body, created_at, read_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })

  // 未読メッセージを既読にする（自分以外が送ったもの）
  const unreadIds = (messages ?? [])
    .filter((m) => m.sender_id !== user.id && !m.read_at)
    .map((m) => m.id)

  if (unreadIds.length > 0) {
    await db
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  return NextResponse.json({ messages: messages ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { projectId, message } = body

  if (typeof projectId !== 'string' || !projectId) {
    return NextResponse.json({ error: 'projectId は必須です' }, { status: 400 })
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'メッセージを入力してください' }, { status: 400 })
  }
  if (message.trim().length > 2000) {
    return NextResponse.json({ error: 'メッセージは2000文字以内で入力してください' }, { status: 400 })
  }

  const db = getDb()

  // 参加者確認
  const { data: order } = await db
    .from('projects')
    .select('client_id, creator_id')
    .eq('id', projectId)
    .single()

  if (!order) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
  if (order.client_id !== user.id && order.creator_id !== user.id) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  const { data: msg, error } = await db
    .from('messages')
    .insert({
      project_id: projectId,
      sender_id:  user.id,
      body:       message.trim(),
    })
    .select('id, sender_id, body, created_at, read_at')
    .single()

  if (error) return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 })

  // 相手への通知
  const recipientId = order.client_id === user.id ? order.creator_id : order.client_id
  const { data: senderUser } = await db.from('users').select('display_name').eq('id', user.id).single()
  await db.from('notifications').insert({
    user_id: recipientId,
    type:    'message_received',
    title:   '新しいメッセージ',
    body:    `${senderUser?.display_name ?? 'ユーザー'} さんからメッセージが届きました`,
  }).catch(() => {})

  return NextResponse.json({ message: msg })
}
