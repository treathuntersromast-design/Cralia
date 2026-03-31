import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['todo', 'in_progress', 'done']

// タスク一覧の保存（全置換）
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

  const { tasks } = body
  if (!Array.isArray(tasks)) return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  if (tasks.length > 50) return NextResponse.json({ error: 'タスクは50件以内にしてください' }, { status: 400 })
  for (const t of tasks) {
    if (!t.title?.trim()) return NextResponse.json({ error: 'タスク名を入力してください' }, { status: 400 })
    if (t.title.trim().length > 100) return NextResponse.json({ error: 'タスク名は100文字以内にしてください' }, { status: 400 })
    if (t.status && !VALID_STATUSES.includes(t.status)) return NextResponse.json({ error: '不正なステータスです' }, { status: 400 })
  }

  await supabase.from('project_tasks').delete().eq('project_id', params.id)

  if (tasks.length > 0) {
    const taskRows = (tasks as { title: string; status?: string; role_id?: string | null; due_date?: string | null }[]).map((t, i) => ({
      project_id: params.id,
      title: t.title.trim(),
      status: t.status ?? 'todo',
      role_id: t.role_id ?? null,
      due_date: t.due_date ?? null,
      display_order: i,
    }))
    const { error } = await supabase.from('project_tasks').insert(taskRows)
    if (error) {
      console.error('[tasks] insert:', error)
      return NextResponse.json({ error: 'タスクの保存に失敗しました' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

// タスクのステータス単体更新（ドラッグ不要のクリック操作用）
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

  const { taskId, status } = body
  if (!taskId || !VALID_STATUSES.includes(status as string)) {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }

  const { error } = await supabase
    .from('project_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('project_id', params.id)

  if (error) {
    console.error('[tasks] patch:', error)
    return NextResponse.json({ error: 'タスクの更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
