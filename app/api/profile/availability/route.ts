import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_VALUES = ['open', 'one_slot', 'full']

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let availability: unknown
  try {
    const body = await request.json()
    availability = body.availability
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  if (!VALID_VALUES.includes(availability as string)) {
    return NextResponse.json({ error: '不正な値です' }, { status: 400 })
  }

  const { error, count } = await supabase
    .from('creator_profiles')
    .update({ availability, updated_at: new Date().toISOString() })
    .eq('creator_id', user.id)

  if (error) {
    console.error('[availability]', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
  if (count === 0) {
    return NextResponse.json({ error: 'クリエイタープロフィールが見つかりません' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
