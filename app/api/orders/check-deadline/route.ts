/**
 * GET /api/orders/check-deadline?creatorId=xxx&deadline=YYYY-MM-DD
 *
 * 依頼の希望納期がクリエイターの納品期間に対してタイトかを判定する。
 * - クリエイターの delivery_days（テキスト）を日数に変換
 * - Googleカレンダー連携済みなら不在日を除いた実稼働可能日数を計算
 * - 未連携なら土日のみ除外して概算
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { fetchBusyDays } from '@/lib/calculateDeadline'

export const dynamic = 'force-dynamic'

// ── delivery_days テキスト → 必要カレンダー日数 ────────────────
// 例: "2週間" → 14, "1ヶ月" → 30, "10日" → 10, "2〜4週間" → 28
function parseDeliveryDays(text: string | null): number | null {
  if (!text) return null
  const t = text.trim()

  // 範囲表記は大きい方を採用 (例: "2〜4週間")
  const rangeMatch = t.match(/(\d+)[〜~～](\d+)\s*(週間?|ヶ月|日)/)
  if (rangeMatch) {
    const num  = parseInt(rangeMatch[2], 10)
    const unit = rangeMatch[3]
    return convertUnit(num, unit)
  }

  // 単一表記 (例: "2週間", "10日", "1ヶ月")
  const singleMatch = t.match(/(\d+)\s*(週間?|ヶ月|日)/)
  if (singleMatch) {
    const num  = parseInt(singleMatch[1], 10)
    const unit = singleMatch[2]
    return convertUnit(num, unit)
  }

  // 数字のみ (例: "14")
  const numOnly = t.match(/^(\d+)$/)
  if (numOnly) return parseInt(numOnly[1], 10)

  return null
}

function convertUnit(num: number, unit: string): number {
  if (unit.startsWith('週'))  return num * 7
  if (unit.startsWith('ヶ月')) return num * 30
  return num // 日
}

// ── 土日を除いた稼働日数をカウント ──────────────────────────────
function countWeekdays(from: Date, to: Date): number {
  let count = 0
  const cur = new Date(from)
  cur.setDate(cur.getDate() + 1) // 今日は含まない
  while (cur <= to) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// ── トークン自動リフレッシュ ─────────────────────────────────────
async function getValidAccessToken(db: any, creatorId: string): Promise<string | null> {
  const { data } = await db
    .from('creator_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('creator_id', creatorId)
    .single() as { data: { access_token: string; refresh_token: string | null; expires_at: string | null } | null }

  if (!data) return null

  const isExpired = data.expires_at && new Date(data.expires_at) <= new Date(Date.now() + 60_000)
  if (!isExpired) return data.access_token

  if (!data.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) return null

  const refreshed = await res.json()
  const expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await (db as any).from('creator_tokens').update({
    access_token: refreshed.access_token,
    expires_at,
  }).eq('creator_id', creatorId)

  return refreshed.access_token
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const creatorId = searchParams.get('creatorId')
  const deadline  = searchParams.get('deadline') // YYYY-MM-DD

  if (!creatorId || !deadline) {
    return NextResponse.json({ error: 'creatorId と deadline は必須です' }, { status: 400 })
  }

  const deadlineDate = new Date(deadline + 'T23:59:59')
  const today        = new Date()
  today.setHours(0, 0, 0, 0)

  if (deadlineDate <= today) {
    return NextResponse.json({
      feasible:     false,
      warningLevel: 'danger',
      message:      '納期が過去の日付です',
      requiredDays: null,
      availableDays: 0,
      busyDays:     0,
      calConnected: false,
    })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // クリエイターの納品期間を取得
  const { data: profile } = await db
    .from('creator_profiles')
    .select('delivery_days')
    .eq('creator_id', creatorId)
    .single()

  const requiredDays = parseDeliveryDays(profile?.delivery_days ?? null)

  // 必要日数が設定されていなければチェック不要
  if (requiredDays === null) {
    return NextResponse.json({ feasible: true, requiredDays: null, warningLevel: null, message: null })
  }

  // Googleカレンダー連携確認 & 不在日取得
  const accessToken = await getValidAccessToken(db, creatorId)
  const calConnected = !!accessToken

  let busyDayCount = 0
  if (accessToken) {
    try {
      const busySet = await fetchBusyDays(accessToken, today, deadlineDate)
      // 不在日のうち平日のみをカウント（土日は元々除外）
      for (const dateStr of Array.from(busySet)) {
        const d = new Date(dateStr)
        const dow = d.getDay()
        if (dow !== 0 && dow !== 6) busyDayCount++
      }
    } catch {
      // カレンダー取得失敗は無視
    }
  }

  // 利用可能稼働日数 = 平日日数 - 不在日数
  const weekdayCount  = countWeekdays(today, deadlineDate)
  const availableDays = Math.max(0, weekdayCount - busyDayCount)

  // 判定
  const feasible     = availableDays >= requiredDays
  const ratio        = availableDays / requiredDays

  let warningLevel: 'danger' | 'caution' | null = null
  let message: string | null = null

  if (!feasible) {
    warningLevel = 'danger'
    const deliveryText = profile?.delivery_days ?? `${requiredDays}日`
    if (calConnected && busyDayCount > 0) {
      message = `クリエイターの納品期間（${deliveryText}）に対し、Googleカレンダーの不在予定（${busyDayCount}日）を考慮すると実稼働可能日数が${availableDays}日しかありません。納期の延長を検討してください。`
    } else {
      message = `クリエイターの納品期間（${deliveryText}）に対し、希望納期までの稼働可能日数が${availableDays}日しかありません。納期の延長を検討してください。`
    }
  } else if (ratio < 1.2) {
    // 余裕が20%未満
    warningLevel = 'caution'
    const deliveryText = profile?.delivery_days ?? `${requiredDays}日`
    if (calConnected && busyDayCount > 0) {
      message = `納期に対して余裕がやや少ない状態です。クリエイターの納品期間（${deliveryText}）に加え、カレンダー上の不在予定（${busyDayCount}日）があります。`
    } else {
      message = `納期に対して余裕がやや少ない状態です。クリエイターの納品期間の目安は${deliveryText}です。`
    }
  }

  return NextResponse.json({
    feasible,
    warningLevel,
    message,
    requiredDays,
    availableDays,
    busyDays: busyDayCount,
    calConnected,
  })
}
