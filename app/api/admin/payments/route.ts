import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'

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
  if (!isAdmin(user.id)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const db = getDb()

  const [{ data: payments, error }, { data: adjustmentsRaw }] = await Promise.all([
    db
      .from('payments')
      .select(`
        id, project_id, amount, fee, status, refunded_amount, currency,
        paid_at, admin_note, created_at, updated_at,
        stripe_payment_intent_id, stripe_checkout_session_id,
        projects!inner(id, title, client_id, creator_id,
          client:users!projects_client_id_fkey(id, display_name),
          creator:users!projects_creator_id_fkey(id, display_name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200),
    db
      .from('payment_adjustments')
      .select('id, payment_id, admin_id, amount, reason, created_at')
      .order('created_at', { ascending: false }),
  ])

  if (error) {
    console.error('[admin/payments] Supabase error:', error)
    return NextResponse.json({ error: `データ取得に失敗しました: ${error.message}` }, { status: 500 })
  }

  // ユーザーIDを収集してメールアドレスを一括取得
  const userIds = new Set<string>()
  for (const p of payments ?? []) {
    const proj = p.projects as unknown as { client_id?: string; creator_id?: string }
    if (proj?.client_id)  userIds.add(proj.client_id)
    if (proj?.creator_id) userIds.add(proj.creator_id)
  }
  for (const a of adjustmentsRaw ?? []) userIds.add(a.admin_id)

  const emailMap: Record<string, string> = {}
  await Promise.all(
    Array.from(userIds).map(async (id) => {
      const { data } = await db.auth.admin.getUserById(id)
      if (data?.user?.email) emailMap[id] = data.user.email
    })
  )

  type EnrichedAdjustment = { id: string; payment_id: string; admin_id: string; amount: number; reason: string; created_at: string; admin_email: string }

  // 調整履歴を payment_id でグループ化
  const adjustmentsByPayment: Record<string, EnrichedAdjustment[]> = {}
  for (const a of adjustmentsRaw ?? []) {
    if (!adjustmentsByPayment[a.payment_id]) adjustmentsByPayment[a.payment_id] = []
    adjustmentsByPayment[a.payment_id]!.push({
      ...a,
      admin_email: emailMap[a.admin_id] ?? a.admin_id,
    })
  }

  // payments にメールと調整履歴を付与
  const enriched = (payments ?? []).map((p) => {
    const proj = p.projects as unknown as {
      id: string; title: string; client_id: string; creator_id: string
      client: { id: string; display_name: string }
      creator: { id: string; display_name: string }
    }
    return {
      ...p,
      client_email:   emailMap[proj?.client_id]  ?? null,
      creator_email:  emailMap[proj?.creator_id] ?? null,
      adjustments:    adjustmentsByPayment[p.id] ?? [],
    }
  })

  return NextResponse.json({ payments: enriched })
}
