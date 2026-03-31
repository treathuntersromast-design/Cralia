import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['recruiting', 'in_progress', 'completed', 'cancelled']

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

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

  const { status } = body
  if (!VALID_STATUSES.includes(status as string)) {
    return NextResponse.json({ error: '不正なステータスです' }, { status: 400 })
  }

  const { error } = await supabase
    .from('project_boards')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) {
    console.error('[status] patch:', error)
    return NextResponse.json({ error: 'ステータスの更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
