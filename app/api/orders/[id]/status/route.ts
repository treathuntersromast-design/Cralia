import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// 許可するステータス遷移 [現在のステータス]: 遷移可能なステータス[]
const TRANSITIONS: Record<string, { next: string; role: 'creator' | 'client' | 'both' }[]> = {
  pending: [
    { next: 'accepted',  role: 'creator' },
    { next: 'cancelled', role: 'creator' },
    { next: 'cancelled', role: 'client'  },
  ],
  accepted: [
    { next: 'in_progress', role: 'creator' },
    { next: 'cancelled',   role: 'both'    },
  ],
  in_progress: [
    { next: 'delivered', role: 'creator' },
    { next: 'cancelled', role: 'both'    },
  ],
  delivered: [
    { next: 'completed', role: 'client'  },
    { next: 'disputed',  role: 'client'  },
    { next: 'in_progress', role: 'creator' }, // 差し戻し対応
  ],
}

const STATUS_LABELS: Record<string, string> = {
  accepted:    '承認',
  in_progress: '進行中に変更',
  delivered:   '納品',
  completed:   '完了',
  cancelled:   'キャンセル',
  disputed:    '異議申し立て',
}

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

  const { status: nextStatus } = body
  if (typeof nextStatus !== 'string') {
    return NextResponse.json({ error: 'ステータスを指定してください' }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order } = await db
    .from('projects')
    .select('id, client_id, creator_id, status, title')
    .eq('id', params.id)
    .single()

  if (!order) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })

  const isClient  = order.client_id  === user.id
  const isCreator = order.creator_id === user.id
  if (!isClient && !isCreator) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  const allowed = TRANSITIONS[order.status] ?? []
  const match = allowed.find((t) => {
    if (t.next !== nextStatus) return false
    if (t.role === 'both')    return isClient || isCreator
    if (t.role === 'client')  return isClient
    if (t.role === 'creator') return isCreator
    return false
  })

  if (!match) {
    return NextResponse.json({ error: 'この操作は現在実行できません' }, { status: 400 })
  }

  const { error } = await db
    .from('projects')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) {
    console.error('[api/orders/[id]/status PATCH]', error)
    return NextResponse.json({ error: 'ステータスの更新に失敗しました' }, { status: 500 })
  }

  // 相手への通知
  const notifyUserId = isCreator ? order.client_id : order.creator_id
  const actionLabel = STATUS_LABELS[nextStatus] ?? nextStatus
  await db.from('notifications').insert({
    user_id: notifyUserId,
    type: 'order_status',
    title: `依頼のステータスが更新されました`,
    body: `「${order.title}」が「${actionLabel}」に変更されました。`,
  })

  return NextResponse.json({ success: true })
}
