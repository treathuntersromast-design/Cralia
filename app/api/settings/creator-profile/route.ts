/**
 * GET  /api/settings/creator-profile  — 受注上限・料金表取得
 * POST /api/settings/creator-profile  — 受注上限・料金表保存
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

type PricingPlan = {
  label:       string
  price:       number
  description: string
}

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('creator_profiles')
    .select('order_limit, pricing_plans')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({
    orderLimit:    data?.order_limit    ?? null,
    pricingPlans:  data?.pricing_plans  ?? [],
  })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { orderLimit, pricingPlans } = body

  // 受注上限バリデーション
  if (orderLimit !== null && orderLimit !== undefined) {
    const n = Number(orderLimit)
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      return NextResponse.json({ error: '受注上限は1〜999の整数で入力してください' }, { status: 400 })
    }
  }

  // 料金表バリデーション
  if (!Array.isArray(pricingPlans)) {
    return NextResponse.json({ error: '料金表の形式が正しくありません' }, { status: 400 })
  }
  if (pricingPlans.length > 10) {
    return NextResponse.json({ error: '料金プランは最大10件まで設定できます' }, { status: 400 })
  }
  for (const plan of pricingPlans as PricingPlan[]) {
    if (typeof plan.label !== 'string' || plan.label.trim().length === 0) {
      return NextResponse.json({ error: 'プラン名を入力してください' }, { status: 400 })
    }
    if (plan.label.trim().length > 50) {
      return NextResponse.json({ error: 'プラン名は50文字以内で入力してください' }, { status: 400 })
    }
    const price = Number(plan.price)
    if (!Number.isInteger(price) || price < 0) {
      return NextResponse.json({ error: '料金は0以上の整数で入力してください' }, { status: 400 })
    }
    if (typeof plan.description === 'string' && plan.description.length > 200) {
      return NextResponse.json({ error: 'プラン説明は200文字以内で入力してください' }, { status: 400 })
    }
  }

  const safeOrderLimit   = orderLimit != null && orderLimit !== '' ? Number(orderLimit) : null
  const safePricingPlans = (pricingPlans as PricingPlan[]).map((p) => ({
    label:       p.label.trim(),
    price:       Number(p.price),
    description: typeof p.description === 'string' ? p.description.trim() : '',
  }))

  const db = getDb()
  const { error } = await db
    .from('creator_profiles')
    .upsert({
      user_id:       user.id,
      order_limit:   safeOrderLimit,
      pricing_plans: safePricingPlans,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    // カラム未追加フォールバック
    if (error.code === '42703') {
      return NextResponse.json({ success: true, warning: 'order_limit/pricing_plans はマイグレーション未適用です' })
    }
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
