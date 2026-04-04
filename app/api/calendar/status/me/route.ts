/**
 * GET /api/calendar/status/me
 * ログインユーザー自身のGoogleカレンダー連携状態を返す
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await db
    .from('creator_tokens')
    .select('creator_id')
    .eq('creator_id', user.id)
    .limit(1)

  if (error) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({ connected: (data?.length ?? 0) > 0 })
}
