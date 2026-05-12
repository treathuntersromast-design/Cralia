import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/isAdmin'

export const dynamic = 'force-dynamic'

const db = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/events/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { data, error } = await db()
    .from('events')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 })
  return NextResponse.json({ data })
}

// PATCH /api/admin/events/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const body = await req.json()
  const {
    title, description, event_date, ends_at, apply_deadline,
    location, venue_type, capacity, fee, target_audience,
    banner_url, cancel_policy, organizer_name, tags, status, is_featured,
  } = body

  if (!title || !event_date || !location) {
    return NextResponse.json({ error: 'タイトル・開催日時・場所は必須です' }, { status: 400 })
  }

  const { error } = await db()
    .from('events')
    .update({
      title: title.trim(),
      description: description?.trim() || null,
      event_date,
      ends_at: ends_at || null,
      apply_deadline: apply_deadline || null,
      location: location.trim(),
      venue_type: venue_type || 'online',
      capacity: Number(capacity) || 30,
      fee: Number(fee) || 0,
      target_audience: target_audience?.trim() || null,
      banner_url: banner_url?.trim() || null,
      cancel_policy: cancel_policy?.trim() || null,
      organizer_name: organizer_name?.trim() || null,
      tags: Array.isArray(tags) ? tags : [],
      status: status || 'open',
      is_featured: Boolean(is_featured),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/events/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { error } = await db()
    .from('events')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
