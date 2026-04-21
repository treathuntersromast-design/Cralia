import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logError'

// ── POST /api/events/[id] — 参加申込 ─────────────────────────
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const eventId = params.id

    // イベント存在・受付中確認
    const { data: event } = await supabase
      .from('events')
      .select('id, status, capacity')
      .eq('id', eventId)
      .single()

    if (!event) return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 })
    if (event.status !== 'open') return NextResponse.json({ error: 'このイベントは現在受付していません' }, { status: 409 })

    // 定員チェック
    const { count } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if ((count ?? 0) >= event.capacity) {
      return NextResponse.json({ error: '定員に達しているため申込できません' }, { status: 409 })
    }

    // 申込登録（重複は UNIQUE で弾かれる）
    const { error: insertError } = await supabase
      .from('event_registrations')
      .insert({ event_id: eventId, user_id: user.id })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'すでに申込済みです' }, { status: 409 })
      }
      return NextResponse.json({ error: '申込に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })

  } catch (e) {
    const message = e instanceof Error ? e.message : '予期しないエラー'
    const stack   = e instanceof Error ? e.stack   : undefined
    await logError({ endpoint: 'events/[id]', message, stack })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── DELETE /api/events/[id] — 申込キャンセル ─────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('event_id', params.id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: 'キャンセルに失敗しました' }, { status: 500 })

    return NextResponse.json({ success: true })

  } catch (e) {
    const message = e instanceof Error ? e.message : '予期しないエラー'
    const stack   = e instanceof Error ? e.stack   : undefined
    await logError({ endpoint: 'events/[id] DELETE', message, stack })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
