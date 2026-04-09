import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { roles, previousRoles } = body

  if (!Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json({ error: '活動スタイルを1つ以上選択してください' }, { status: 400 })
  }
  const VALID_ROLES = ['creator', 'client']
  if ((roles as unknown[]).some((r) => !VALID_ROLES.includes(r as string))) {
    return NextResponse.json({ error: '不正な活動スタイルが含まれています' }, { status: 400 })
  }

  const prev: string[] = Array.isArray(previousRoles) ? (previousRoles as string[]) : []
  const removingCreator = prev.includes('creator') && !(roles as string[]).includes('creator')
  const removingClient  = prev.includes('client')  && !(roles as string[]).includes('client')

  // ロールを削除する場合のみ依頼チェックを実施
  if (removingCreator || removingClient) {
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const checks = await Promise.all([
      removingCreator
        ? db.from('projects').select('id').eq('creator_id', user.id)
            .not('status', 'in', '(completed,cancelled,disputed)').limit(1)
        : Promise.resolve({ data: [] }),
      removingClient
        ? db.from('projects').select('id').eq('client_id', user.id)
            .not('status', 'in', '(completed,cancelled,disputed)').limit(1)
        : Promise.resolve({ data: [] }),
    ])

    if (removingCreator && (checks[0].data?.length ?? 0) > 0) {
      return NextResponse.json(
        { error: '未完了の受注依頼があるため、クリエイターの役割を外せません。すべての受注依頼を完了してから変更してください。' },
        { status: 409 }
      )
    }
    if (removingClient && (checks[1].data?.length ?? 0) > 0) {
      return NextResponse.json(
        { error: '未完了の発注依頼があるため、依頼者の役割を外せません。すべての発注依頼を完了してから変更してください。' },
        { status: 409 }
      )
    }
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await db
    .from('users')
    .update({ roles, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    console.error('[profile/roles PATCH]', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
