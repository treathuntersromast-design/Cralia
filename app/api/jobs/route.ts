import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasClientRole } from '@/lib/constants/activity'
import { VALIDATION } from '@/lib/constants/validation'

export const dynamic = 'force-dynamic'

// ── GET /api/jobs ─────────────────────────────────────────
// 公開中の案件一覧を取得（creator_types フィルター対応）
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const creatorType = searchParams.get('creator_type') // 単一タイプでフィルター
  const orderType   = searchParams.get('order_type')   // 'paid' | 'free'

  let query = supabase
    .from('job_listings')
    .select(`
      id, title, description, creator_types, order_type,
      budget_min, budget_max, deadline, status, created_at,
      client_id,
      users!job_listings_client_id_fkey (
        display_name, avatar_url, entity_type
      )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)

  if (creatorType) {
    query = query.contains('creator_types', [creatorType])
  }
  if (orderType === 'paid' || orderType === 'free') {
    query = query.eq('order_type', orderType)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })

  return NextResponse.json({ data })
}

// ── POST /api/jobs ────────────────────────────────────────
// 新規案件を投稿（依頼者ロールチェック）
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // 依頼者ロール確認（activity_style_id: 2=依頼者, 3=両方）
  const { data: userData } = await supabase
    .from('users')
    .select('activity_style_id')
    .eq('id', user.id)
    .single()

  if (!hasClientRole(userData?.activity_style_id as number | null)) {
    return NextResponse.json({ error: '依頼者として登録されているアカウントのみ案件を投稿できます' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const title        = typeof body.title       === 'string' ? body.title.trim()       : ''
  const description  = typeof body.description === 'string' ? body.description.trim() : null
  const creatorTypes = Array.isArray(body.creatorTypes) ? (body.creatorTypes as string[]) : []
  const orderType    = body.orderType === 'free' ? 'free' : 'paid'
  const budgetMin    = typeof body.budgetMin === 'number' && body.budgetMin >= 0 ? body.budgetMin : null
  const budgetMax    = typeof body.budgetMax === 'number' && body.budgetMax >= 0 ? body.budgetMax : null
  const deadline     = typeof body.deadline === 'string' && body.deadline ? body.deadline : null

  if (!title) return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
  if (title.length > VALIDATION.JOB_TITLE_MAX) return NextResponse.json({ error: `タイトルは${VALIDATION.JOB_TITLE_MAX}文字以内にしてください` }, { status: 400 })
  if (description && description.length > VALIDATION.JOB_DESC_MAX) return NextResponse.json({ error: `説明文は${VALIDATION.JOB_DESC_MAX}文字以内にしてください` }, { status: 400 })
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    return NextResponse.json({ error: '予算の最小値が最大値を超えています' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('job_listings')
    .insert({
      client_id:     user.id,
      title,
      description,
      creator_types: creatorTypes,
      order_type:    orderType,
      budget_min:    budgetMin,
      budget_max:    budgetMax,
      deadline,
      status:        'open',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
