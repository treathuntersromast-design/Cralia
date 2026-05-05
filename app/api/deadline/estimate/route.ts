/**
 * GET /api/deadline/estimate?orderId=xxx
 *
 * 依頼者向け想定完了日を返す（クライアント向け・非技術的な理由文のみ）
 *
 * - 同クリエイターの完了依頼から平均所要日数を算出
 * - 今日から平均日数を加算して推定日を計算
 * - reason はカレンダー/スケジュール詳細を含まない抽象文言のみ
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const DEFAULT_WORKING_DAYS = 14

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const orderId = req.nextUrl.searchParams.get('orderId')
    if (!orderId) return NextResponse.json({ error: 'orderId は必須です' }, { status: 400 })

    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 対象依頼の取得（依頼者本人のみ閲覧可）
    const { data: order, error: orderError } = await db
      .from('projects')
      .select('id, creator_id, client_id, status, created_at, updated_at')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
    }
    if (order.client_id !== user.id) {
      return NextResponse.json({ error: 'アクセス権がありません' }, { status: 403 })
    }
    if (!['accepted', 'in_progress'].includes(order.status)) {
      return NextResponse.json({ error: '対象の依頼状態ではありません' }, { status: 400 })
    }

    // 同クリエイターの完了依頼から平均所要日数を算出
    const { data: completedOrders } = await db
      .from('projects')
      .select('created_at, updated_at')
      .eq('creator_id', order.creator_id)
      .eq('status', 'completed')
      .not('id', 'eq', orderId)
      .limit(20)

    let avgDays = DEFAULT_WORKING_DAYS
    if (completedOrders && completedOrders.length > 0) {
      const durations = completedOrders.map((o) => {
        const start = new Date(o.created_at).getTime()
        const end   = new Date(o.updated_at).getTime()
        return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)))
      })
      avgDays = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      // 外れ値を補正（1日 〜 90日）
      avgDays = Math.max(1, Math.min(90, avgDays))
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const estimatedDate = toDateString(addDays(today, avgDays))

    const reason = completedOrders && completedOrders.length > 0
      ? `現在のスケジュールを考慮した目安です（変動する場合があります）`
      : `クリエイターの標準的な作業期間をもとにした目安です（変動する場合があります）`

    return NextResponse.json({ estimatedDate, reason })
  } catch (e) {
    const message = e instanceof Error ? e.message : '予期しないエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
