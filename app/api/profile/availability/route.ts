import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_VALUES = ['open', 'one_slot', 'full']

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { availability } = await request.json()
  if (!VALID_VALUES.includes(availability)) {
    return NextResponse.json({ error: '不正な値です' }, { status: 400 })
  }

  const { error } = await supabase
    .from('creator_profiles')
    .update({ availability, updated_at: new Date().toISOString() })
    .eq('creator_id', user.id)

  if (error) {
    console.error('[availability]', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
