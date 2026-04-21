import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── GET /api/events ───────────────────────────────────────────
// 公開中のイベント一覧（申込数・自分の申込状態含む）
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description, event_date, location, capacity, tags, status')
    .in('status', ['open', 'closed'])
    .order('event_date', { ascending: true })

  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })

  if (!events || events.length === 0) return NextResponse.json({ data: [] })

  const eventIds = events.map((e) => e.id)

  // 申込数と自分の申込状態を取得
  const [{ data: registrations }, { data: myRegs }] = await Promise.all([
    supabase
      .from('event_registrations')
      .select('event_id')
      .in('event_id', eventIds),
    supabase
      .from('event_registrations')
      .select('event_id')
      .in('event_id', eventIds)
      .eq('user_id', user.id),
  ])

  const countMap: Record<string, number> = {}
  for (const r of registrations ?? []) {
    countMap[r.event_id] = (countMap[r.event_id] ?? 0) + 1
  }

  const myRegSet = new Set((myRegs ?? []).map((r) => r.event_id))

  const data = events.map((e) => ({
    ...e,
    applicants: countMap[e.id] ?? 0,
    isRegistered: myRegSet.has(e.id),
  }))

  return NextResponse.json({ data })
}
