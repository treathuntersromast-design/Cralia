/**
 * GET /api/calendar/status?creatorId=xxx
 * クリエイターのGoogleカレンダー連携状態を返す
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get('creatorId')
  if (!creatorId) {
    return NextResponse.json({ error: 'creatorId is required' }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await db
    .from('creator_tokens')
    .select('creator_id')
    .eq('creator_id', creatorId)
    .limit(1)

  if (error) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({ connected: (data?.length ?? 0) > 0 })
}
