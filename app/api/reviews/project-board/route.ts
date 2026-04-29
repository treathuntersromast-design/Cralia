/**
 * GET  /api/reviews/project-board?boardId=xxx  — ボードの評価一覧
 * POST /api/reviews/project-board              — メンバー全員への一括評価投稿
 *
 * 一括評価ルール:
 *   - 評価なし（空配列）または他メンバー全員分を一度に投稿するかのどちらか
 *   - 例外: オーナーのみが評価者であることは許容（他メンバーの提出を強制しない）
 *   - 自分自身への評価は不可
 *   - completed ステータスのボードのみ
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { VALIDATION } from '@/lib/constants/validation'

export const dynamic = 'force-dynamic'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const boardId = searchParams.get('boardId')
  if (!boardId) return NextResponse.json({ error: 'boardId は必須です' }, { status: 400 })

  const db = getDb()
  const { data, error } = await db
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer_id, reviewee_id, review_type')
    .eq('project_board_id', boardId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  return NextResponse.json({ reviews: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const { boardId, evaluations } = body

  if (typeof boardId !== 'string') {
    return NextResponse.json({ error: 'boardId は必須です' }, { status: 400 })
  }
  if (!Array.isArray(evaluations)) {
    return NextResponse.json({ error: 'evaluations は配列で指定してください' }, { status: 400 })
  }

  const db = getDb()

  // ボード情報取得
  const { data: board } = await db
    .from('project_boards')
    .select('id, owner_id, status')
    .eq('id', boardId)
    .single()

  if (!board) return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
  if (board.status !== 'completed') {
    return NextResponse.json({ error: '完了したプロジェクトのみ評価できます' }, { status: 400 })
  }

  // 現ユーザーがメンバーかチェック（役職に割り当てられているか）
  const { data: myRole } = await db
    .from('project_roles')
    .select('id')
    .eq('project_id', boardId)
    .eq('assigned_user_id', user.id)
    .limit(1)

  if (!myRole || myRole.length === 0) {
    return NextResponse.json({ error: 'プロジェクトメンバーのみ評価できます' }, { status: 403 })
  }

  // 他のメンバー全員を取得（重複排除）
  const { data: allRoles } = await db
    .from('project_roles')
    .select('assigned_user_id')
    .eq('project_id', boardId)
    .not('assigned_user_id', 'is', null)

  const otherMemberIds = Array.from(new Set(
    (allRoles ?? [])
      .map((r) => r.assigned_user_id as string)
      .filter((id) => id !== user.id)
  ))

  // 空配列の場合はスキップ（評価しない）
  if (evaluations.length === 0) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // 評価数が他メンバー全員分と一致するかチェック
  if (evaluations.length !== otherMemberIds.length) {
    return NextResponse.json({
      error: `全メンバー（${otherMemberIds.length}人）への評価を一括で投稿してください。一部だけの評価は受け付けていません。`,
    }, { status: 400 })
  }

  // 各評価のバリデーション
  for (const ev of evaluations) {
    if (typeof (ev as Record<string, unknown>).revieweeId !== 'string') {
      return NextResponse.json({ error: 'revieweeId が不正です' }, { status: 400 })
    }
    const evAny = ev as Record<string, unknown>
    const r = Number(evAny.rating)
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: '評価は1〜5の整数で入力してください' }, { status: 400 })
    }
    if (typeof evAny.comment === 'string' && evAny.comment.length > VALIDATION.REVIEW_COMMENT_MAX) {
      return NextResponse.json({ error: `コメントは${VALIDATION.REVIEW_COMMENT_MAX}文字以内で入力してください` }, { status: 400 })
    }
    if (evAny.revieweeId === user.id) {
      return NextResponse.json({ error: '自分自身を評価することはできません' }, { status: 400 })
    }
    if (!otherMemberIds.includes(evAny.revieweeId as string)) {
      return NextResponse.json({ error: 'プロジェクトメンバー以外は評価できません' }, { status: 400 })
    }
  }

  // revieweeId の重複チェック
  const revieweeIds = (evaluations as Record<string, unknown>[]).map((ev) => ev.revieweeId as string)
  if (new Set(revieweeIds).size !== revieweeIds.length) {
    return NextResponse.json({ error: '同じメンバーへの評価が重複しています' }, { status: 400 })
  }

  // 既に投稿済みか確認
  const { data: existingReviews } = await db
    .from('reviews')
    .select('id')
    .eq('project_board_id', boardId)
    .eq('reviewer_id', user.id)
    .limit(1)

  if (existingReviews && existingReviews.length > 0) {
    return NextResponse.json({ error: 'すでにこのプロジェクトへの評価を投稿しています' }, { status: 409 })
  }

  // 一括挿入
  const insertData = (evaluations as Record<string, unknown>[]).map((ev) => ({
    review_type:      'project_member',
    project_board_id: boardId,
    reviewer_id:      user.id,
    reviewee_id:      ev.revieweeId as string,
    rating:           Number(ev.rating),
    comment:          typeof ev.comment === 'string' ? ev.comment.trim() || null : null,
  }))

  const { error } = await db.from('reviews').insert(insertData)
  if (error) return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
