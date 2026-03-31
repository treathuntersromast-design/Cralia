import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_CATEGORIES = ['楽曲', '動画', 'イラスト', 'ゲーム', 'ポッドキャスト', 'その他']

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { title, description, category, isPublic, roles } = body

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'タイトルを入力してください' }, { status: 400 })
  }
  if (title.trim().length > 60) {
    return NextResponse.json({ error: 'タイトルは60文字以内にしてください' }, { status: 400 })
  }
  if (description && typeof description === 'string' && description.length > 1000) {
    return NextResponse.json({ error: '概要は1000文字以内にしてください' }, { status: 400 })
  }
  if (!Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json({ error: '役職を1つ以上追加してください' }, { status: 400 })
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
  const safeCategory = typeof category === 'string' && VALID_CATEGORIES.includes(category) ? category : null

  // プロジェクト作成
  const { data: project, error: projErr } = await supabase
    .from('project_boards')
    .insert({
      owner_id: user.id,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() || null : null,
      category: safeCategory,
      is_public: isPublic !== false,
    })
    .select('id')
    .single()

  if (projErr || !project) {
    console.error('[projects] create:', projErr)
    return NextResponse.json({ error: 'プロジェクトの作成に失敗しました' }, { status: 500 })
  }

  // 役職一括挿入
  const roleRows = (roles as { role_name: string; description?: string; is_owner_role?: boolean }[]).map((r, i) => ({
    project_id: project.id,
    role_name: r.role_name.trim(),
    description: r.description?.trim() || null,
    is_owner_role: r.is_owner_role === true,
    assigned_user_id: r.is_owner_role === true ? user.id : null,
    display_order: i,
  }))

  const { error: rolesErr } = await supabase.from('project_roles').insert(roleRows)
  if (rolesErr) {
    console.error('[projects] roles:', rolesErr)
    // プロジェクト本体を削除してロールバック
    await supabase.from('project_boards').delete().eq('id', project.id)
    return NextResponse.json({ error: '役職の保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ id: project.id })
}
