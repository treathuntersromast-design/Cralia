import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!isAdmin(user.id)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  let body: { admin_note?: unknown } = {}
  try { body = await req.json() } catch { /* noop */ }

  const db = getDb()
  const { data: existing } = await db
    .from('payments').select('id').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: '決済が見つかりません' }, { status: 404 })

  const { error } = await db
    .from('payments')
    .update({
      admin_note: typeof body.admin_note === 'string' ? body.admin_note : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
