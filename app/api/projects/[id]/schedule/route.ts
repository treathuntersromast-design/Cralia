/**
 * GET  /api/projects/[id]/schedule
 *   タスク一覧 + 担当者情報 + 依存関係 + ブロック状態を返す
 *
 * POST /api/projects/[id]/schedule
 *   タスク一覧を全置換（依存関係を含む）
 *   オーナーのみ実行可能
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const VALID_STATUSES = ['todo', 'in_progress', 'done'] as const

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── GET ───────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const db = getDb()

  const { data: project } = await db
    .from('project_boards')
    .select('id, owner_id, is_public')
    .eq('id', params.id)
    .single()

  if (!project) return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
  if (!project.is_public && project.owner_id !== user.id) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  // タスク取得（担当者情報つき）
  const { data: tasks, error: tasksErr } = await db
    .from('project_tasks')
    .select('id, title, description, status, due_date, display_order, role_id, assigned_user_id')
    .eq('project_id', params.id)
    .order('display_order')

  type TaskRow = { id: string; title: string; description: string | null; status: string; due_date: string | null; display_order: number; role_id: string | null; assigned_user_id: string | null }
  let taskList: TaskRow[]

  if (tasksErr) {
    // assigned_user_id / description カラム未追加時のフォールバック
    if (tasksErr.code === '42703') {
      const { data: fallback, error: e2 } = await db
        .from('project_tasks')
        .select('id, title, status, due_date, display_order, role_id')
        .eq('project_id', params.id)
        .order('display_order')
      if (e2) return NextResponse.json({ error: 'タスクの取得に失敗しました' }, { status: 500 })
      taskList = (fallback ?? []).map((t) => ({ ...t, description: null, assigned_user_id: null }))
    } else {
      return NextResponse.json({ error: 'タスクの取得に失敗しました' }, { status: 500 })
    }
  } else {
    taskList = tasks ?? []
  }
  const taskIds  = taskList.map((t) => t.id)

  // 依存関係取得
  const { data: deps } = taskIds.length > 0
    ? await db.from('project_task_deps').select('task_id, depends_on_id').in('task_id', taskIds)
    : { data: [] }

  // 担当者名解決（role 経由 + 直接割り当て）
  const userIds = [
    ...new Set([
      ...taskList.map((t) => t.assigned_user_id).filter(Boolean),
    ]),
  ] as string[]
  const userNameMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await db
      .from('users')
      .select('id, display_name')
      .in('id', userIds)
    for (const u of users ?? []) userNameMap[u.id] = u.display_name ?? u.id
  }

  // ブロック状態を計算
  // task_id → depends_on_id[] マップ
  const depMap: Record<string, string[]> = {}
  for (const d of deps ?? []) {
    if (!depMap[d.task_id]) depMap[d.task_id] = []
    depMap[d.task_id].push(d.depends_on_id)
  }
  // task_id → status マップ
  const statusMap: Record<string, string> = Object.fromEntries(taskList.map((t) => [t.id, t.status]))

  const enriched = taskList.map((t) => {
    const dependsOnIds = depMap[t.id] ?? []
    const blockedBy = dependsOnIds
      .filter((depId) => statusMap[depId] !== 'done')
      .map((depId) => ({
        id:    depId,
        title: taskList.find((x) => x.id === depId)?.title ?? '不明なタスク',
      }))

    return {
      id:               t.id,
      title:            t.title,
      description:      t.description ?? null,
      status:           t.status,
      due_date:         t.due_date ?? null,
      display_order:    t.display_order,
      role_id:          t.role_id ?? null,
      assigned_user_id: t.assigned_user_id ?? null,
      assigned_name:    t.assigned_user_id ? (userNameMap[t.assigned_user_id] ?? null) : null,
      depends_on_ids:   dependsOnIds,
      blocked_by:       blockedBy,   // 未完了の先行タスク一覧
      is_blocked:       blockedBy.length > 0,
    }
  })

  return NextResponse.json({ tasks: enriched })
}

// ── POST ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const db = getDb()

  const { data: project } = await db
    .from('project_boards')
    .select('owner_id')
    .eq('id', params.id)
    .single()

  if (!project) return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
  if (project.owner_id !== user.id) return NextResponse.json({ error: '権限がありません（オーナーのみ）' }, { status: 403 })

  type TaskInput = {
    id?:               string
    title:             string
    description?:      string | null
    status?:           string
    due_date?:         string | null
    assigned_user_id?: string | null
    role_id?:          string | null
    depends_on_ids?:   string[]
  }

  let body: { tasks?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const tasks = body.tasks
  if (!Array.isArray(tasks)) return NextResponse.json({ error: 'tasks は配列で指定してください' }, { status: 400 })
  if (tasks.length > 100) return NextResponse.json({ error: 'タスクは100件以内にしてください' }, { status: 400 })

  for (const t of tasks as TaskInput[]) {
    if (!t.title?.trim()) return NextResponse.json({ error: 'タスク名を入力してください' }, { status: 400 })
    if (t.title.trim().length > 100) return NextResponse.json({ error: 'タスク名は100文字以内にしてください' }, { status: 400 })
    if (t.description && t.description.length > 500) return NextResponse.json({ error: 'タスク説明は500文字以内にしてください' }, { status: 400 })
    if (t.status && !(VALID_STATUSES as readonly string[]).includes(t.status)) {
      return NextResponse.json({ error: '不正なステータスです' }, { status: 400 })
    }
  }

  // 既存タスク・依存関係を全削除して再挿入
  await db.from('project_task_deps').delete().in(
    'task_id',
    (await db.from('project_tasks').select('id').eq('project_id', params.id)).data?.map((t) => t.id) ?? []
  )
  await db.from('project_tasks').delete().eq('project_id', params.id)

  if ((tasks as TaskInput[]).length === 0) return NextResponse.json({ success: true })

  // タスク挿入
  const taskRows = (tasks as TaskInput[]).map((t, i) => ({
    project_id:       params.id,
    title:            t.title.trim(),
    description:      t.description?.trim() ?? null,
    status:           t.status ?? 'todo',
    due_date:         t.due_date ?? null,
    assigned_user_id: t.assigned_user_id ?? null,
    role_id:          t.role_id ?? null,
    display_order:    i,
    updated_at:       new Date().toISOString(),
  }))

  const { data: inserted, error: insertErr } = await db
    .from('project_tasks')
    .insert(taskRows)
    .select('id')

  if (insertErr || !inserted) {
    // assigned_user_id カラム未追加のフォールバック
    if (insertErr?.code === '42703') {
      const fallbackRows = taskRows.map(({ assigned_user_id: _a, description: _d, ...rest }) => rest)
      const { error: e2 } = await db.from('project_tasks').insert(fallbackRows)
      if (e2) return NextResponse.json({ error: 'タスクの保存に失敗しました' }, { status: 500 })
      return NextResponse.json({ success: true, warning: 'assigned_user_id/description はマイグレーション未適用です' })
    }
    return NextResponse.json({ error: 'タスクの保存に失敗しました' }, { status: 500 })
  }

  // 旧 id（既存タスク UUID or クライアント生成 temp id）→ 新 UUID のマッピングを構築
  const insertedIds = inserted.map((r) => r.id)
  const idMap: Record<string, string> = {}
  for (let i = 0; i < (tasks as TaskInput[]).length; i++) {
    const t = (tasks as TaskInput[])[i]
    if (t.id) idMap[t.id] = insertedIds[i]
  }

  const depRows: { task_id: string; depends_on_id: string }[] = []
  for (let i = 0; i < (tasks as TaskInput[]).length; i++) {
    const t = (tasks as TaskInput[])[i]
    for (const depId of t.depends_on_ids ?? []) {
      if (typeof depId !== 'string') continue
      const resolvedId = idMap[depId] ?? depId
      // 自己参照を除外し、同バッチ内に存在する ID のみ追加
      if (resolvedId !== insertedIds[i] && insertedIds.includes(resolvedId)) {
        depRows.push({ task_id: insertedIds[i], depends_on_id: resolvedId })
      }
    }
  }

  if (depRows.length > 0) {
    await db.from('project_task_deps').insert(depRows).catch(() => {
      // 依存関係の挿入失敗はサイレントに無視（タスク自体は保存済み）
    })
  }

  return NextResponse.json({ success: true, taskIds: insertedIds })
}
