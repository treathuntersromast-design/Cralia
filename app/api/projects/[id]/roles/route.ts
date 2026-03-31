import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 役職のユーザー割り当て更新
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // オーナー確認
  const { data: project } = await supabase
    .from('project_boards')
    .select('owner_id')
    .eq('id', params.id)
    .single()
  if (!project) return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
  if (project.owner_id !== user.id) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { roles } = body
  if (!Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json({ error: '役職データが不正です' }, { status: 400 })
  }
  if (roles.length > 20) {
    return NextResponse.json({ error: '役職は20個以内にしてください' }, { status: 400 })
  }
  for (const r of roles) {
    if (!r.role_name?.trim()) return NextResponse.json({ error: '役職名を入力してください' }, { status: 400 })
    if (r.role_name.trim().length > 40) return NextResponse.json({ error: '役職名は40文字以内にしてください' }, { status: 400 })
  }
  const ownerRoleCount = (roles as { is_owner_role?: boolean }[]).filter((r) => r.is_owner_role === true).length
  if (ownerRoleCount !== 1) {
    return NextResponse.json({ error: 'オーナー役職は必ず1つ設定してください' }, { status: 400 })
  }

  // 削除→再挿入
  await supabase.from('project_roles').delete().eq('project_id', params.id)

  const roleRows = (roles as { role_name: string; description?: string; is_owner_role?: boolean; assigned_user_id?: string | null }[]).map((r, i) => ({
    project_id: params.id,
    role_name: r.role_name.trim(),
    description: r.description?.trim() || null,
    is_owner_role: r.is_owner_role === true,
    assigned_user_id: r.is_owner_role === true ? user.id : (r.assigned_user_id ?? null),
    display_order: i,
  }))

  const { error } = await supabase.from('project_roles').insert(roleRows)
  if (error) {
    console.error('[roles] update:', error)
    return NextResponse.json({ error: '役職の更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
