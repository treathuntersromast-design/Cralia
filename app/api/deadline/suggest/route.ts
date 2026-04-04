/**
 * POST /api/deadline/suggest
 *
 * カレンダーへの書き込みなしで納期を提案する（依頼フォーム用）
 *
 * body: {
 *   creator_id: string
 *   working_days_required?: number  // 省略時はクリエイターのデフォルト値
 * }
 *
 * response: {
 *   deadline: string          // "YYYY-MM-DD"
 *   summary: string           // 人間向けの説明文
 *   skipped_calendar: number  // カレンダーでスキップした日数
 *   skipped_holidays: number
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  calculateDeadline,
  toDateString,
  type CreatorSchedule,
} from '@/lib/calculateDeadline'

export const dynamic = 'force-dynamic'

async function getValidAccessToken(creatorId: string): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('creator_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('creator_id', creatorId)
    .single()

  if (error || !data) throw new Error('カレンダー未連携')

  const isExpired = new Date(data.expires_at) <= new Date(Date.now() + 60_000)
  if (!isExpired) return data.access_token

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!refreshRes.ok) throw new Error('トークンのリフレッシュに失敗しました')

  const { access_token, expires_in } = await refreshRes.json()
  const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

  await supabase
    .from('creator_tokens')
    .update({ access_token, expires_at: newExpiresAt })
    .eq('creator_id', creatorId)

  return access_token
}

async function getCreatorSchedule(creatorId: string): Promise<CreatorSchedule> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('creator_profiles')
    .select('schedule')
    .eq('creator_id', creatorId)
    .single()

  const schedule = data?.schedule ?? {}
  const rawDays: unknown[] = Array.isArray(schedule.days) ? schedule.days : []

  let workDays: number[]
  if (rawDays.length > 0 && typeof rawDays[0] === 'number') {
    // DBには数値配列で保存されている（0=日, 1=月, ..., 6=土）
    workDays = rawDays as number[]
  } else if (rawDays.length > 0 && typeof rawDays[0] === 'string') {
    // 日本語曜日名の場合
    const dayMap: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 }
    workDays = (rawDays as string[]).map((d) => dayMap[d]).filter((n): n is number => n !== undefined)
  } else {
    workDays = [1, 2, 3, 4, 5] // デフォルト平日
  }

  return {
    workDays: workDays.length ? workDays : [1, 2, 3, 4, 5],
    defaultWorkingDays: (schedule.default_working_days as number) ?? 10,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { creator_id, working_days_required } = body

    if (!creator_id) {
      return NextResponse.json({ error: 'creator_id は必須です' }, { status: 400 })
    }
    const workDaysNum = working_days_required ?? undefined
    if (workDaysNum !== undefined && (!Number.isInteger(workDaysNum) || workDaysNum < 1)) {
      return NextResponse.json({ error: '作業日数は1以上の整数を指定してください' }, { status: 400 })
    }
    if (workDaysNum !== undefined && workDaysNum > 90) {
      return NextResponse.json({ error: '作業日数は90日以内で指定してください' }, { status: 400 })
    }

    const [accessToken, creatorSchedule] = await Promise.all([
      getValidAccessToken(creator_id),
      getCreatorSchedule(creator_id),
    ])

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const workDays = working_days_required ?? creatorSchedule.defaultWorkingDays

    const result = await calculateDeadline(accessToken, today, workDays, creatorSchedule)

    const skippedCalendar = result.skippedDays.filter((s) => s.reason === 'calendar_event').length
    const skippedHolidays = result.skippedDays.filter((s) => s.reason === 'holiday').length
    const deadline = toDateString(result.deadline)

    let summary = `${workDays}営業日で計算した納期目安: ${deadline}`
    if (skippedHolidays > 0) summary += `（祝日${skippedHolidays}日スキップ）`
    if (skippedCalendar > 0) summary += `（カレンダーの不在${skippedCalendar}日スキップ）`

    return NextResponse.json({
      deadline,
      summary,
      skipped_calendar: skippedCalendar,
      skipped_holidays: skippedHolidays,
      working_days: workDays,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
