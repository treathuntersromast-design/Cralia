/**
 * GET /api/calendar/events?year=YYYY&month=M
 * ログインユーザーのGoogleカレンダーイベントを取得する
 * - トークン期限切れの場合は自動でリフレッシュ
 * - 未連携の場合は connected: false を返す
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_at: string } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString()
  return { access_token: data.access_token, expires_at }
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // トークン取得
  const { data: tokenRow } = await db
    .from('creator_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('creator_id', user.id)
    .single()

  if (!tokenRow) return NextResponse.json({ connected: false })

  let accessToken = tokenRow.access_token

  // 期限切れなら自動リフレッシュ
  const isExpired = tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date(Date.now() + 60_000)
  if (isExpired && tokenRow.refresh_token) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token)
    if (!refreshed) return NextResponse.json({ connected: true, events: [], error: 'token_expired' })
    accessToken = refreshed.access_token
    await db.from('creator_tokens').update({
      access_token: refreshed.access_token,
      expires_at:   refreshed.expires_at,
    }).eq('creator_id', user.id)
  }

  // 対象月の範囲を計算
  const { searchParams } = new URL(request.url)
  const now   = new Date()
  const year  = parseInt(searchParams.get('year')  ?? String(now.getFullYear()),  10)
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1), 10)

  const timeMin = new Date(year, month - 1, 1).toISOString()
  const timeMax = new Date(year, month,     1).toISOString()

  // Google Calendar API 呼び出し
  const gcalUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  gcalUrl.searchParams.set('timeMin',      timeMin)
  gcalUrl.searchParams.set('timeMax',      timeMax)
  gcalUrl.searchParams.set('singleEvents', 'true')
  gcalUrl.searchParams.set('orderBy',      'startTime')
  gcalUrl.searchParams.set('maxResults',   '50')
  gcalUrl.searchParams.set('fields',       'items(id,summary,start,end,colorId)')

  const gcalRes = await fetch(gcalUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!gcalRes.ok) {
    // 401 はトークン無効（revoked）
    if (gcalRes.status === 401) return NextResponse.json({ connected: true, events: [], error: 'token_invalid' })
    return NextResponse.json({ connected: true, events: [], error: 'gcal_error' })
  }

  const gcalData = await gcalRes.json()

  // 必要なフィールドだけに絞って返す
  const events = (gcalData.items ?? []).map((item: any) => ({
    id:      item.id,
    title:   item.summary ?? '（タイトルなし）',
    start:   item.start?.date ?? item.start?.dateTime ?? '',
    end:     item.end?.date   ?? item.end?.dateTime   ?? '',
    allDay:  !!item.start?.date,
    colorId: item.colorId ?? null,
  }))

  return NextResponse.json({ connected: true, events })
}
