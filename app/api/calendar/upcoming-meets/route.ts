/**
 * GET /api/calendar/upcoming-meets
 * 今から12時間以内にある Google Meet 付きの予定を返す
 */
import { NextResponse } from 'next/server'
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

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tokenRow } = await db
    .from('creator_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('creator_id', user.id)
    .single()

  if (!tokenRow) return NextResponse.json({ meets: [] })

  let accessToken = tokenRow.access_token

  const isExpired = tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date(Date.now() + 60_000)
  if (isExpired && tokenRow.refresh_token) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token)
    if (!refreshed) return NextResponse.json({ meets: [] })
    accessToken = refreshed.access_token
    await db.from('creator_tokens').update({
      access_token: refreshed.access_token,
      expires_at:   refreshed.expires_at,
    }).eq('creator_id', user.id)
  }

  const now  = new Date()
  const in12h = new Date(now.getTime() + 12 * 60 * 60 * 1000)

  const gcalUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  gcalUrl.searchParams.set('timeMin',      now.toISOString())
  gcalUrl.searchParams.set('timeMax',      in12h.toISOString())
  gcalUrl.searchParams.set('singleEvents', 'true')
  gcalUrl.searchParams.set('orderBy',      'startTime')
  gcalUrl.searchParams.set('maxResults',   '20')
  gcalUrl.searchParams.set('fields',       'items(id,summary,start,hangoutLink,conferenceData)')

  const gcalRes = await fetch(gcalUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!gcalRes.ok) return NextResponse.json({ meets: [] })

  const gcalData = await gcalRes.json()

  const meets = (gcalData.items ?? []).flatMap((item: any) => {
    const hangoutLink: string | null =
      item.hangoutLink ??
      (item.conferenceData?.entryPoints ?? []).find(
        (ep: any) => ep.entryPointType === 'video'
      )?.uri ??
      null

    if (!hangoutLink) return []

    return [{
      id:          item.id,
      title:       item.summary ?? '（タイトルなし）',
      start:       item.start?.dateTime ?? item.start?.date ?? '',
      hangoutLink,
    }]
  })

  return NextResponse.json({ meets })
}
