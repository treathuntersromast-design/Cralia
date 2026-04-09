/**
 * GET  /api/orders/[id]/receipt?type=receipt|purchase_order
 *   — 既存の領収書/発注書を取得（なければ null）
 * POST /api/orders/[id]/receipt
 *   — 領収書または発注書を発行（completed のみ、当事者のみ）
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** 8 桁連番 receipt_no を生成 */
async function generateReceiptNo(db: ReturnType<typeof getDb>): Promise<string> {
  const { count } = await db
    .from('receipts')
    .select('*', { count: 'exact', head: true })
  const seq = ((count ?? 0) + 1).toString().padStart(8, '0')
  return `CM-${seq}`
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const type = new URL(request.url).searchParams.get('type') ?? 'receipt'

  const db = getDb()

  // 依頼の当事者確認
  const { data: order } = await db
    .from('projects')
    .select('id, client_id, creator_id, status')
    .eq('id', params.id)
    .single()

  if (!order) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
  if (order.client_id !== user.id && order.creator_id !== user.id) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  const { data: receipt } = await db
    .from('receipts')
    .select('*')
    .eq('project_id', params.id)
    .eq('type', type)
    .order('issued_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ receipt: receipt ?? null })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { type, memo } = body
  if (type !== 'receipt' && type !== 'purchase_order') {
    return NextResponse.json({ error: 'type は "receipt" または "purchase_order" で指定してください' }, { status: 400 })
  }
  if (memo !== undefined && memo !== null && typeof memo !== 'string') {
    return NextResponse.json({ error: 'memo は文字列で指定してください' }, { status: 400 })
  }
  if (typeof memo === 'string' && memo.length > 500) {
    return NextResponse.json({ error: 'メモは500文字以内で入力してください' }, { status: 400 })
  }

  const db = getDb()

  const { data: order } = await db
    .from('projects')
    .select('id, client_id, creator_id, status, budget, order_type')
    .eq('id', params.id)
    .single()

  if (!order) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
  if (order.client_id !== user.id && order.creator_id !== user.id) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }
  if (order.status !== 'completed') {
    return NextResponse.json({ error: '完了済みの依頼のみ発行できます' }, { status: 400 })
  }

  // 重複発行防止（同 type は 1 件まで）
  const { data: existing } = await db
    .from('receipts')
    .select('id, receipt_no')
    .eq('project_id', params.id)
    .eq('type', type)
    .limit(1)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'すでに発行済みです', receipt: existing }, { status: 409 })
  }

  const amount    = order.order_type !== 'free' && order.budget != null ? order.budget : 0
  const taxAmount = Math.floor(amount * 0.1)
  const receiptNo = await generateReceiptNo(db)

  const { data: receipt, error } = await db
    .from('receipts')
    .insert({
      project_id: params.id,
      type,
      issued_by:  user.id,
      amount,
      tax_amount: taxAmount,
      memo:       typeof memo === 'string' ? memo.trim() || null : null,
      receipt_no: receiptNo,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'receipts テーブルが未作成です（マイグレーションを実行してください）' }, { status: 503 })
    }
    return NextResponse.json({ error: '発行に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ receipt })
}
