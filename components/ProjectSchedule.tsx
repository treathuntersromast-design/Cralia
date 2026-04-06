'use client'

import { useState, useEffect, useCallback } from 'react'

// ── 型定義 ────────────────────────────────────────────────────────
type ScheduleTask = {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
  display_order: number
  role_id: string | null
  assigned_user_id: string | null
  assigned_name: string | null
  depends_on_ids: string[]
  blocked_by: { id: string; title: string }[]
  is_blocked: boolean
}

type DraftTask = {
  id: string           // 既存タスクの UUID or "new_<timestamp>" (新規)
  title: string
  description: string
  status: string
  due_date: string
  assigned_user_id: string
  depends_on_ids: string[]  // 他タスクの id フィールドを参照
}

type Member = {
  userId: string
  name: string
}

interface Props {
  projectId: string
  isOwner: boolean
  members: Member[]    // プロジェクトメンバー（役職割り当て済みユーザー）
  initialTaskCount: number  // 0 のときは fetch をスキップし空状態を即表示
}

// ── ヘルパー ──────────────────────────────────────────────────────
function dueDateInfo(dueDate: string | null): { label: string; color: string } {
  if (!dueDate) return { label: '', color: '#7c7b99' }
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000)
  if (days < 0)  return { label: `${Math.abs(days)}日超過`, color: '#ff6b9d' }
  if (days === 0) return { label: '今日まで', color: '#ff6b9d' }
  if (days <= 2)  return { label: `あと${days}日`, color: '#ff6b9d' }
  if (days <= 6)  return { label: `あと${days}日`, color: '#fbbf24' }
  return { label: `あと${days}日`, color: '#7c7b99' }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  todo:        { label: '未着手', color: '#a9a8c0', bg: 'rgba(169,168,192,0.12)' },
  in_progress: { label: '進行中', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  done:        { label: '完了',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(255,255,255,0.05)',
  color: '#f0eff8', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

// ── コンポーネント ────────────────────────────────────────────────
export default function ProjectSchedule({ projectId, isOwner, members, initialTaskCount }: Props) {
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  // タスクが0件のときはfetchしない（初期値 false）
  const [loading, setLoading] = useState(initialTaskCount > 0)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DraftTask[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── 取得 ────────────────────────────────────────────────────────
  const fetchSchedule = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`)
      if (!res.ok) throw new Error('取得失敗')
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch {
      setError('スケジュールの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    // タスクが1件以上あるときだけfetch（0件は空状態を即表示）
    if (initialTaskCount === 0) return
    fetchSchedule()
  }, [fetchSchedule, initialTaskCount])

  // ── 編集開始 ──────────────────────────────────────────────────
  const startEdit = () => {
    setDraft(tasks.map((t) => ({
      id:               t.id,
      title:            t.title,
      description:      t.description ?? '',
      status:           t.status,
      due_date:         t.due_date ?? '',
      assigned_user_id: t.assigned_user_id ?? '',
      depends_on_ids:   t.depends_on_ids,
    })))
    setSaveError(null)
    setEditing(true)
  }

  // ── ドラフト操作 ──────────────────────────────────────────────
  const addTask = () => {
    if (draft.length >= 100) return
    setDraft((prev) => [...prev, {
      id:               `new_${Date.now()}`,
      title:            '',
      description:      '',
      status:           'todo',
      due_date:         '',
      assigned_user_id: '',
      depends_on_ids:   [],
    }])
  }

  const updateTask = (i: number, field: keyof DraftTask, value: string | string[]) => {
    setDraft((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const removeTask = (i: number) => {
    const removedId = draft[i].id
    // 削除されたタスクへの依存も除去
    setDraft((prev) => prev
      .filter((_, j) => j !== i)
      .map((t) => ({ ...t, depends_on_ids: t.depends_on_ids.filter((d) => d !== removedId) }))
    )
  }

  const toggleDep = (taskIndex: number, depId: string) => {
    setDraft((prev) => {
      const next = [...prev]
      const deps = next[taskIndex].depends_on_ids
      next[taskIndex] = {
        ...next[taskIndex],
        depends_on_ids: deps.includes(depId)
          ? deps.filter((d) => d !== depId)
          : [...deps, depId],
      }
      return next
    })
  }

  // ── 保存 ────────────────────────────────────────────────────
  const save = async () => {
    if (draft.some((t) => !t.title.trim())) {
      setSaveError('すべてのタスク名を入力してください')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: draft.map((t, i) => ({
            id:               t.id,
            title:            t.title.trim(),
            description:      t.description.trim() || null,
            status:           t.status,
            due_date:         t.due_date || null,
            assigned_user_id: t.assigned_user_id || null,
            depends_on_ids:   t.depends_on_ids,
            display_order:    i,
          })),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSaveError(d.error ?? '保存に失敗しました')
        return
      }
      setEditing(false)
      await fetchSchedule()
    } finally {
      setSaving(false)
    }
  }

  // ── 表示 ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#7c7b99', fontSize: '14px' }}>
        読み込み中...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#ff6b9d', fontSize: '14px' }}>
        {error}
      </div>
    )
  }

  return (
    <section style={{ marginTop: '40px' }}>
      {/* セクションヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>スケジュール</h2>
        {isOwner && !editing && (
          <button
            onClick={startEdit}
            style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid rgba(199,125,255,0.35)', background: 'transparent', color: '#c77dff', fontSize: '13px', cursor: 'pointer' }}
          >
            スケジュールを編集
          </button>
        )}
      </div>

      {/* ── 編集モード ───────────────────────────────────────── */}
      {editing ? (
        <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(199,125,255,0.2)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '12px' }}>
            {draft.map((t, i) => (
              <div key={t.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '12px', padding: '14px' }}>
                {/* タイトル + 削除 */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input
                    value={t.title}
                    onChange={(e) => updateTask(i, 'title', e.target.value)}
                    placeholder="タスク名"
                    maxLength={100}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => removeTask(i)}
                    style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: 'pointer', fontSize: '20px', padding: '0 4px', lineHeight: 1 }}
                  >×</button>
                </div>

                {/* 説明 */}
                <textarea
                  value={t.description}
                  onChange={(e) => updateTask(i, 'description', e.target.value)}
                  placeholder="詳細説明（任意）"
                  maxLength={500}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical', marginBottom: '8px' }}
                />

                {/* 担当者 / 納期 / ステータス */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={t.assigned_user_id}
                    onChange={(e) => updateTask(i, 'assigned_user_id', e.target.value)}
                    style={{ ...inputStyle }}
                  >
                    <option value="">担当なし</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>{m.name}</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={t.due_date}
                    onChange={(e) => updateTask(i, 'due_date', e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  />

                  <select
                    value={t.status}
                    onChange={(e) => updateTask(i, 'status', e.target.value)}
                    style={{ ...inputStyle }}
                  >
                    <option value="todo">未着手</option>
                    <option value="in_progress">進行中</option>
                    <option value="done">完了</option>
                  </select>
                </div>

                {/* 前提タスク（他タスクへの依存） */}
                {draft.length > 1 && (
                  <div>
                    <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', margin: '0 0 6px', letterSpacing: '0.05em' }}>
                      前提タスク（完了後に着手可能）
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {draft
                        .filter((_, j) => j !== i)
                        .map((other) => {
                          const checked = t.depends_on_ids.includes(other.id)
                          return (
                            <label
                              key={other.id}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                padding: '4px 10px', borderRadius: '8px', cursor: 'pointer',
                                fontSize: '12px',
                                background: checked ? 'rgba(199,125,255,0.15)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${checked ? 'rgba(199,125,255,0.4)' : 'rgba(255,255,255,0.09)'}`,
                                color: checked ? '#c77dff' : '#a9a8c0',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDep(i, other.id)}
                                style={{ display: 'none' }}
                              />
                              {checked ? '✓ ' : ''}{other.title || `タスク ${draft.findIndex((x) => x.id === other.id) + 1}`}
                            </label>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {draft.length < 100 && (
            <button
              onClick={addTask}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px dashed rgba(199,125,255,0.3)', background: 'transparent', color: '#c77dff', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}
            >
              ＋ タスクを追加
            </button>
          )}

          {saveError && (
            <p style={{ color: '#ff6b9d', fontSize: '13px', margin: '0 0 12px' }}>{saveError}</p>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setEditing(false)}
              style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#a9a8c0', fontSize: '13px', cursor: 'pointer' }}
            >
              キャンセル
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

      ) : tasks.length === 0 ? (
        /* ── 空状態 ─────────────────────────────────────────── */
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(22,22,31,0.8)', borderRadius: '16px', border: '1px dashed rgba(199,125,255,0.2)' }}>
          <p style={{ color: '#7c7b99', fontSize: '14px', margin: '0 0 16px' }}>スケジュールがまだ設定されていません</p>
          {isOwner && (
            <button
              onClick={startEdit}
              style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
            >
              スケジュールを設定する
            </button>
          )}
        </div>

      ) : (
        /* ── 表示モード ─────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map((t) => {
            const st = STATUS_MAP[t.status] ?? STATUS_MAP.todo
            const dd = dueDateInfo(t.due_date)
            return (
              <div
                key={t.id}
                style={{
                  background: 'rgba(22,22,31,0.9)',
                  border: `1px solid ${t.is_blocked ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '14px',
                  padding: '14px 18px',
                  opacity: t.status === 'done' ? 0.6 : 1,
                }}
              >
                {/* メイン行 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* ステータスドット */}
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: st.color, flexShrink: 0 }} />

                  {/* タイトル */}
                  <span style={{
                    fontSize: '14px', fontWeight: '600', flex: 1,
                    textDecoration: t.status === 'done' ? 'line-through' : 'none',
                    color: t.status === 'done' ? '#7c7b99' : '#f0eff8',
                  }}>
                    {t.title}
                  </span>

                  {/* ステータスバッジ */}
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', color: st.color, background: st.bg, flexShrink: 0 }}>
                    {st.label}
                  </span>

                  {/* 担当者 */}
                  {t.assigned_name && (
                    <span style={{ fontSize: '12px', color: '#a9a8c0', flexShrink: 0 }}>👤 {t.assigned_name}</span>
                  )}

                  {/* 納期 */}
                  {t.due_date && (
                    <span style={{ fontSize: '12px', color: dd.color, fontWeight: dd.color !== '#7c7b99' ? '700' : '400', flexShrink: 0 }}>
                      📅 {new Date(t.due_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                      {dd.label && ` (${dd.label})`}
                    </span>
                  )}

                  {/* ブロック中アイコン */}
                  {t.is_blocked && (
                    <span style={{ fontSize: '14px', flexShrink: 0 }} title="前提タスクが未完了">⚠️</span>
                  )}
                </div>

                {/* 説明 */}
                {t.description && (
                  <p style={{ margin: '6px 0 0 18px', fontSize: '12px', color: '#a9a8c0', lineHeight: '1.5' }}>
                    {t.description}
                  </p>
                )}

                {/* ブロック中の詳細 */}
                {t.is_blocked && (
                  <div style={{ margin: '10px 0 0 18px', padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '10px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '700', color: '#fbbf24' }}>⚠️ 着手できません</p>
                    {t.blocked_by.map((b) => (
                      <p key={b.id} style={{ margin: '0', fontSize: '12px', color: '#a9a8c0' }}>
                        「{b.title}」が完了していないため着手できません
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
