/**
 * PATCH /api/orders/[id]/edit
 * pending ステータスの依頼のみ、依頼者本人が編集可能
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order } = await db
    .from('projects')
    .select('id, client_id, status')
    .eq('id', params.id)
    .single()

  if (!order) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
  if (order.client_id !== user.id) return NextResponse.json({ error: '編集権限がありません' }, { status: 403 })
  if (order.status !== 'pending') return NextResponse.json({ error: '提案中の依頼のみ編集できます' }, { status: 400 })

  const { title, description, budget, deadline } = body

  if (typeof title === 'string' && title.trim().length === 0) {
    return NextResponse.json({ error: 'タイトルを入力してください' }, { status: 400 })
  }
  if (typeof title === 'string' && title.trim().length > 100) {
    return NextResponse.json({ error: 'タイトルは100文字以内で入力してください' }, { status: 400 })
  }
  if (typeof description === 'string' && description.trim().length > 2000) {
    return NextResponse.json({ error: '依頼内容は2000文字以内で入力してください' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof title === 'string')       patch.title       = title.trim()
  if (typeof description === 'string') patch.description = description.trim()
  if (budget !== undefined)            patch.budget      = budget !== '' && budget != null ? parseInt(String(budget), 10) : null
  if (deadline !== undefined)          patch.deadline    = deadline || null

  const { error } = await db.from('projects').update(patch).eq('id', params.id)
  if (error) return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
