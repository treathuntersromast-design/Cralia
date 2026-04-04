import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { creatorId, title, description, budget, deadline, orderType } = body

  if (typeof creatorId !== 'string' || !creatorId) {
    return NextResponse.json({ error: '依頼先クリエイターを指定してください' }, { status: 400 })
  }
  if (typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'タイトルを入力してください' }, { status: 400 })
  }
  if (title.trim().length > 100) {
    return NextResponse.json({ error: 'タイトルは100文字以内で入力してください' }, { status: 400 })
  }
  if (typeof description !== 'string' || description.trim().length === 0) {
    return NextResponse.json({ error: '依頼内容を入力してください' }, { status: 400 })
  }
  if (description.trim().length > 2000) {
    return NextResponse.json({ error: '依頼内容は2000文字以内で入力してください' }, { status: 400 })
  }
  if (creatorId === user.id) {
    return NextResponse.json({ error: '自分自身には依頼できません' }, { status: 400 })
  }

  const parsedBudget = budget !== '' && budget != null ? parseInt(String(budget), 10) : null
  const safeBudget = parsedBudget !== null && !isNaN(parsedBudget) && parsedBudget >= 0 ? parsedBudget : null
  const safeDeadline = typeof deadline === 'string' && deadline ? deadline : null
  const safeOrderType = orderType === 'free' ? 'free' : 'paid'

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 依頼先クリエイターが存在するか確認
  const { data: creator } = await db
    .from('users')
    .select('id, display_name')
    .eq('id', creatorId)
    .single()

  if (!creator) {
    return NextResponse.json({ error: 'クリエイターが見つかりません' }, { status: 404 })
  }

  const insertPayload = {
    client_id: user.id,
    creator_id: creatorId,
    title: title.trim(),
    description: description.trim(),
    budget: safeBudget,
    deadline: safeDeadline,
    status: 'pending',
    order_type: safeOrderType,
  }

  let { data: order, error } = await db
    .from('projects')
    .insert(insertPayload)
    .select('id')
    .single()

  // order_typeカラム未作成の場合（マイグレーション未実行）はフォールバック
  if (error?.code === '42703') {
    const { order_type: _removed, ...payloadWithoutType } = insertPayload;
    ({ data: order, error } = await db
      .from('projects')
      .insert(payloadWithoutType)
      .select('id')
      .single())
  }

  if (error || !order) {
    console.error('[api/orders POST]', error)
    return NextResponse.json({ error: '依頼の送信に失敗しました' }, { status: 500 })
  }

  // 依頼者の名前を取得して通知
  const { data: clientUser } = await db
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .single()
  const clientName = clientUser?.display_name ?? '依頼者'

  await db.from('notifications').insert({
    user_id: creatorId,
    type: 'order_received',
    title: '新しい依頼が届きました',
    body: `${clientName} さんから「${title.trim()}」の依頼が届きました。`,
  })

  return NextResponse.json({ id: order.id })
}
