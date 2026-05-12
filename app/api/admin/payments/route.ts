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

  const { data: payments, error } = await db
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
    .limit(200)

  if (error) {
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ payments: payments ?? [] })
}
