import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // auth.users を削除（CASCADE で public.users も連動して削除される）
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[account/delete]', error)
    return NextResponse.json({ error: 'アカウントの削除に失敗しました' }, { status: 500 })
  }

  // auth 削除後に残存する public.users を念のりクリア（CASCADE で消えているはずだが二重保証）
  await admin.from('users').delete().eq('id', user.id)

  return NextResponse.json({ success: true })
}
