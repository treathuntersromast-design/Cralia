import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// 通常遷移テーブル — cancel_requested は別途ハンドリング
const TRANSITIONS: Record<string, { next: string; role: 'creator' | 'client' | 'both' }[]> = {
  pending: [
    { next: 'accepted',         role: 'creator' },
    { next: 'cancelled',        role: 'creator' }, // 辞退
    { next: 'cancelled',        role: 'client'  }, // 提案前取り消し
  ],
  accepted: [
    { next: 'in_progress',      role: 'creator' },
    { next: 'cancel_requested', role: 'both'    }, // 2ステップキャンセル申請
  ],
  in_progress: [
    { next: 'delivered',        role: 'creator' },
    { next: 'cancel_requested', role: 'both'    }, // 2ステップキャンセル申請
  ],
  delivered: [
    { next: 'completed',        role: 'client'  },
    { next: 'disputed',         role: 'client'  },
    { next: 'in_progress',      role: 'creator' }, // 修正差し戻し
  ],
}

const STATUS_LABELS: Record<string, string> = {
  accepted:         '承認',
  in_progress:      '進行中に変更',
  delivered:        '納品',
  completed:        '完了',
  cancelled:        'キャンセル',
  disputed:         '異議申し立て',
  cancel_requested: 'キャンセル申請中',
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
    .select('id, client_id, creator_id, status, title, cancel_requested_by, cancel_prev_status')
    .eq('id', params.id)
    .single()

  if (!order) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })

  const isClient  = order.client_id  === user.id
  const isCreator = order.creator_id === user.id
  if (!isClient && !isCreator) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  // ── cancel_requested 状態の特殊ハンドリング ───────────────────
  if (order.status === 'cancel_requested') {
    const isRequester = order.cancel_requested_by === user.id
    const prevStatus  = order.cancel_prev_status ?? 'accepted'

    if (nextStatus === 'cancelled') {
      if (isRequester) {
        return NextResponse.json({ error: '自分が申請したキャンセルは自分で承認できません' }, { status: 400 })
      }
      // 相手方のみ承認可能
    } else if (nextStatus === prevStatus) {
      // 申請取り消し（requester）or 申請拒否（other party）— 両者OK
    } else {
      return NextResponse.json({ error: 'この操作は現在実行できません' }, { status: 400 })
    }

    const { error } = await db
      .from('projects')
      .update({
        status:              nextStatus,
        updated_at:          new Date().toISOString(),
        cancel_requested_by: null,
        cancel_prev_status:  null,
      })
      .eq('id', params.id)

    if (error) {
      console.error('[api/orders/[id]/status PATCH cancel_requested]', error)
      return NextResponse.json({ error: 'ステータスの更新に失敗しました' }, { status: 500 })
    }

    const notifyUserId = isCreator ? order.client_id : order.creator_id
    const actionLabel = nextStatus === 'cancelled'
      ? 'キャンセルが確定しました'
      : isRequester
        ? 'キャンセル申請を取り消しました'
        : 'キャンセル申請を拒否しました（依頼を継続）'

    try {
      await db.from('notifications').insert({
        user_id: notifyUserId,
        type:    'order_status',
        title:   '依頼のステータスが更新されました',
        body:    `「${order.title}」— ${actionLabel}`,
        read_at: null,
      })
    } catch { /* 通知失敗は無視 */ }

    return NextResponse.json({ success: true })
  }

  // ── 通常遷移チェック ──────────────────────────────────────────
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

  const updatePayload: Record<string, unknown> = {
    status:     nextStatus,
    updated_at: new Date().toISOString(),
  }

  // cancel_requested 遷移時に申請者と前ステータスを記録
  if (nextStatus === 'cancel_requested') {
    updatePayload.cancel_requested_by = user.id
    updatePayload.cancel_prev_status  = order.status
  }

  const { error } = await db
    .from('projects')
    .update(updatePayload)
    .eq('id', params.id)

  if (error) {
    console.error('[api/orders/[id]/status PATCH]', error)
    return NextResponse.json({ error: 'ステータスの更新に失敗しました' }, { status: 500 })
  }

  const notifyUserId = isCreator ? order.client_id : order.creator_id
  const actionLabel = STATUS_LABELS[nextStatus] ?? nextStatus

  const notifyBody = nextStatus === 'cancel_requested'
    ? `「${order.title}」にキャンセルが申請されました。承認・拒否を行ってください。`
    : `「${order.title}」が「${actionLabel}」に変更されました。`

  try {
    await db.from('notifications').insert({
      user_id: notifyUserId,
      type:    'order_status',
      title:   '依頼のステータスが更新されました',
      body:    notifyBody,
      read_at: null,
    })
  } catch { /* 通知失敗は無視 */ }

  return NextResponse.json({ success: true })
}
