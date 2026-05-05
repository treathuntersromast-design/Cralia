import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ACTIVITY_STYLE_ID } from '@/lib/constants/activity'

// Supabase Auth のコールバック処理
// - メール確認リンクのクリック後
// - Google/X OAuth ログイン後
// に呼ばれる。code を session に交換してからプロフィール有無でリダイレクト先を決定。
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // プロフィール登録済みか確認
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('activity_style_id, display_name')
          .eq('id', user.id)
          .single()

        // activity_style_id 未設定かつ display_name も未設定の場合のみプロフィール登録へ
        const needsSetup = !profile || (
          !Object.values(ACTIVITY_STYLE_ID).includes(profile.activity_style_id as 1 | 2 | 3) &&
          !profile.display_name
        )
        if (needsSetup) {
          return NextResponse.redirect(`${origin}/profile/setup-prompt`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
