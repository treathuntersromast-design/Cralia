'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { ProjectBoard, ProjectRole, ProjectTask } from '@/app/projects/[id]/page'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  recruiting:  { label: 'メンバー募集中', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  in_progress: { label: '進行中',         color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  completed:   { label: '完了',           color: '#a9a8c0', bg: 'rgba(169,168,192,0.12)' },
  cancelled:   { label: 'キャンセル',     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const TASK_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  todo:        { label: '未着手', color: '#a9a8c0', bg: 'rgba(169,168,192,0.12)' },
  in_progress: { label: '進行中', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  done:        { label: '完了',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
}

const PROJECT_STATUSES = ['recruiting', 'in_progress', 'completed', 'cancelled'] as const

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(255,255,255,0.05)',
  color: '#f0eff8', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}

interface Props {
  project: ProjectBoard
  roles: ProjectRole[]
  tasks: ProjectTask[]
  isOwner: boolean
}

export default function ProjectDetailClient({ project, roles: initialRoles, tasks: initialTasks, isOwner }: Props) {
  const [project_, setProject] = useState(project)
  const [roles, setRoles] = useState(initialRoles)
  const [tasks, setTasks] = useState(initialTasks)

  // --- Status ---
  const [statusLoading, setStatusLoading] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const changeStatus = useCallback(async (status: string) => {
    setShowStatusMenu(false)
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/projects/${project_.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) setProject((p) => ({ ...p, status: status as ProjectBoard['status'] }))
    } finally {
      setStatusLoading(false)
    }
  }, [project_.id])

  // --- Roles Editor ---
  const [editingRoles, setEditingRoles] = useState(false)
  const [rolesDraft, setRolesDraft] = useState(initialRoles)
  const [rolesSaving, setRolesSaving] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)

  const startEditRoles = () => {
    setRolesDraft(roles.map((r) => ({ ...r })))
    setRolesError(null)
    setEditingRoles(true)
  }

  const updateRoleDraft = (i: number, field: keyof ProjectRole, value: string | boolean) => {
    setRolesDraft((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const addRoleDraft = () => {
    if (rolesDraft.length >= 20) return
    setRolesDraft((prev) => [...prev, {
      id: `new_${Date.now()}`,
      role_name: '',
      description: '',
      is_owner_role: false,
      assigned_user_id: null,
      assigned_user_name: null,
      assigned_avatar_url: null,
      display_order: prev.length,
    }])
  }

  const removeRoleDraft = (i: number) => {
    setRolesDraft((prev) => prev.filter((_, j) => j !== i))
  }

  const saveRoles = async () => {
    if (rolesDraft.some((r) => !r.role_name.trim())) {
      setRolesError('すべての役職名を入力してください')
      return
    }
    if (!rolesDraft.some((r) => r.is_owner_role)) {
      setRolesError('主催の役職を1つ選択してください')
      return
    }
    setRolesSaving(true)
    setRolesError(null)
    try {
      const res = await fetch(`/api/projects/${project_.id}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: rolesDraft.map((r, i) => ({ ...r, display_order: i })) }),
      })
      if (!res.ok) {
        const d = await res.json()
        setRolesError(d.error ?? '保存に失敗しました')
        return
      }
      const d = await res.json()
      if (d.roles) setRoles(d.roles)
      else setRoles(rolesDraft.map((r, i) => ({ ...r, display_order: i })))
      setEditingRoles(false)
    } finally {
      setRolesSaving(false)
    }
  }

  // --- Tasks Editor ---
  const [editingTasks, setEditingTasks] = useState(false)
  const [tasksDraft, setTasksDraft] = useState(initialTasks)
  const [tasksSaving, setTasksSaving] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)

  const startEditTasks = () => {
    setTasksDraft(tasks.map((t) => ({ ...t })))
    setTasksError(null)
    setEditingTasks(true)
  }

  const addTaskDraft = () => {
    if (tasksDraft.length >= 50) return
    setTasksDraft((prev) => [...prev, {
      id: `new_${Date.now()}`,
      title: '',
      status: 'todo',
      role_id: null,
      due_date: null,
      display_order: prev.length,
    }])
  }

  const updateTaskDraft = (i: number, field: keyof ProjectTask, value: string | null) => {
    setTasksDraft((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const removeTaskDraft = (i: number) => {
    setTasksDraft((prev) => prev.filter((_, j) => j !== i))
  }

  const saveTasks = async () => {
    if (tasksDraft.some((t) => !t.title.trim())) {
      setTasksError('すべてのタスク名を入力してください')
      return
    }
    setTasksSaving(true)
    setTasksError(null)
    try {
      const res = await fetch(`/api/projects/${project_.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: tasksDraft.map((t, i) => ({ ...t, display_order: i })) }),
      })
      if (!res.ok) {
        const d = await res.json()
        setTasksError(d.error ?? '保存に失敗しました')
        return
      }
      setTasks(tasksDraft.map((t, i) => ({ ...t, display_order: i })))
      setEditingTasks(false)
    } finally {
      setTasksSaving(false)
    }
  }

  // --- Task Status Quick Toggle ---
  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const cycle: Record<string, string> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    const next = cycle[currentStatus] ?? 'todo'
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: next as ProjectTask['status'] } : t))
    await fetch(`/api/projects/${project_.id}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status: next }),
    })
  }

  const st = STATUS_MAP[project_.status] ?? STATUS_MAP.recruiting

  // Group tasks by status
  const todoTasks = tasks.filter((t) => t.status === 'todo')
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')
  const doneTasks = tasks.filter((t) => t.status === 'done')
  const totalTasks = tasks.length
  const donePct = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>{project_.title}</h1>
              {project_.category && (
                <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '13px', background: 'rgba(199,125,255,0.15)', color: '#c77dff', fontWeight: '600' }}>
                  {project_.category}
                </span>
              )}
            </div>
            {project_.description && (
              <p style={{ color: '#a9a8c0', fontSize: '14px', margin: '0 0 12px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {project_.description}
              </p>
            )}
            <p style={{ color: '#7c7b99', fontSize: '12px', margin: 0 }}>
              作成日: {new Date(project_.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>

          {/* Status */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => isOwner && setShowStatusMenu((v) => !v)}
              disabled={statusLoading}
              style={{
                padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
                color: st.color, background: st.bg,
                border: `1px solid ${st.color}40`,
                cursor: isOwner ? 'pointer' : 'default',
              }}>
              {st.label} {isOwner && '▾'}
            </button>
            {showStatusMenu && isOwner && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 100,
                background: '#1e1e2e', border: '1px solid rgba(199,125,255,0.25)',
                borderRadius: '12px', padding: '6px', minWidth: '160px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {PROJECT_STATUSES.map((s) => {
                  const m = STATUS_MAP[s]
                  return (
                    <button key={s} onClick={() => changeStatus(s)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 12px', borderRadius: '8px', border: 'none',
                        background: project_.status === s ? 'rgba(199,125,255,0.15)' : 'transparent',
                        color: m.color, fontSize: '13px', cursor: 'pointer',
                      }}>
                      {m.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Roles Section */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>メンバー構成</h2>
          {isOwner && !editingRoles && (
            <button onClick={startEditRoles}
              style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid rgba(199,125,255,0.35)', background: 'transparent', color: '#c77dff', fontSize: '13px', cursor: 'pointer' }}>
              役職を編集
            </button>
          )}
        </div>

        {editingRoles ? (
          <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(199,125,255,0.2)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {rolesDraft.map((r, i) => (
                <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${r.is_owner_role ? 'rgba(199,125,255,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input value={r.role_name} onChange={(e) => updateRoleDraft(i, 'role_name', e.target.value)}
                      placeholder="役職名" maxLength={40} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => removeRoleDraft(i)} disabled={rolesDraft.length <= 1}
                      style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: rolesDraft.length <= 1 ? 'not-allowed' : 'pointer', fontSize: '20px', opacity: rolesDraft.length <= 1 ? 0.3 : 1 }}>
                      ×
                    </button>
                  </div>
                  <input value={r.description ?? ''} onChange={(e) => updateRoleDraft(i, 'description', e.target.value)}
                    placeholder="役割の詳細（任意）" maxLength={100}
                    style={{ ...inputStyle, fontSize: '13px', marginBottom: '8px' }} />
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: r.is_owner_role ? '#c77dff' : '#a9a8c0' }}>
                    <input type="checkbox" checked={r.is_owner_role}
                      onChange={(e) => {
                        setRolesDraft((prev) => prev.map((role, j) => ({
                          ...role,
                          is_owner_role: j === i ? e.target.checked : e.target.checked ? false : role.is_owner_role,
                        })))
                      }}
                      style={{ accentColor: '#c77dff' }} />
                    主催（自分の役職）
                  </label>
                </div>
              ))}
            </div>
            {rolesDraft.length < 20 && (
              <button onClick={addRoleDraft}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px dashed rgba(199,125,255,0.3)', background: 'transparent', color: '#c77dff', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}>
                ＋ 役職を追加
              </button>
            )}
            {rolesError && <p style={{ color: '#ff6b9d', fontSize: '13px', margin: '0 0 12px' }}>{rolesError}</p>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingRoles(false)}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#a9a8c0', fontSize: '13px', cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={saveRoles} disabled={rolesSaving}
                style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: rolesSaving ? 'not-allowed' : 'pointer', opacity: rolesSaving ? 0.7 : 1 }}>
                {rolesSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {roles.map((r) => (
              <div key={r.id} style={{
                background: 'rgba(22,22,31,0.9)',
                border: `1px solid ${r.is_owner_role ? 'rgba(199,125,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '14px', padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '15px' }}>{r.role_name}</span>
                  {r.is_owner_role && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(199,125,255,0.15)', color: '#c77dff', fontWeight: '600' }}>主催</span>
                  )}
                </div>
                {r.description && (
                  <p style={{ color: '#a9a8c0', fontSize: '12px', margin: '0 0 10px', lineHeight: '1.5' }}>{r.description}</p>
                )}
                {r.assigned_user_id ? (
                  <Link href={`/profile/${r.assigned_user_id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                    {r.assigned_avatar_url ? (
                      <img src={r.assigned_avatar_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', fontWeight: '700' }}>
                        {(r.assigned_user_name ?? '?')[0]}
                      </div>
                    )}
                    <span style={{ color: '#f0eff8', fontSize: '13px', fontWeight: '600' }}>{r.assigned_user_name ?? 'ユーザー'}</span>
                  </Link>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px dashed rgba(199,125,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#c77dff' }}>+</div>
                    <Link href="/search" style={{ color: '#c77dff', fontSize: '12px', textDecoration: 'none' }}>
                      メンバーを探す
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Progress Bar */}
      {totalTasks > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#a9a8c0' }}>進捗</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#4ade80' }}>{donePct}%</span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${donePct}%`, background: 'linear-gradient(90deg, #4ade80, #22d3ee)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#7c7b99' }}>
            <span>未着手: {todoTasks.length}</span>
            <span>進行中: {inProgressTasks.length}</span>
            <span>完了: {doneTasks.length}</span>
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>タスク</h2>
          {isOwner && !editingTasks && (
            <button onClick={startEditTasks}
              style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid rgba(199,125,255,0.35)', background: 'transparent', color: '#c77dff', fontSize: '13px', cursor: 'pointer' }}>
              タスクを編集
            </button>
          )}
        </div>

        {editingTasks ? (
          <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(199,125,255,0.2)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {tasksDraft.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input value={t.title} onChange={(e) => updateTaskDraft(i, 'title', e.target.value)}
                    placeholder="タスク名" maxLength={100}
                    style={{ ...inputStyle, flex: 1 }} />
                  <select value={t.status}
                    onChange={(e) => updateTaskDraft(i, 'status', e.target.value)}
                    style={{ ...inputStyle, width: 'auto', padding: '10px 10px' }}>
                    <option value="todo">未着手</option>
                    <option value="in_progress">進行中</option>
                    <option value="done">完了</option>
                  </select>
                  <input type="date" value={t.due_date ?? ''}
                    onChange={(e) => updateTaskDraft(i, 'due_date', e.target.value || null)}
                    style={{ ...inputStyle, width: '140px', colorScheme: 'dark' }} />
                  <select value={t.role_id ?? ''}
                    onChange={(e) => updateTaskDraft(i, 'role_id', e.target.value || null)}
                    style={{ ...inputStyle, width: 'auto', padding: '10px 10px' }}>
                    <option value="">担当なし</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.role_name}</option>
                    ))}
                  </select>
                  <button onClick={() => removeTaskDraft(i)}
                    style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: 'pointer', fontSize: '20px', padding: '0 4px' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            {tasksDraft.length < 50 && (
              <button onClick={addTaskDraft}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px dashed rgba(199,125,255,0.3)', background: 'transparent', color: '#c77dff', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}>
                ＋ タスクを追加
              </button>
            )}
            {tasksError && <p style={{ color: '#ff6b9d', fontSize: '13px', margin: '0 0 12px' }}>{tasksError}</p>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingTasks(false)}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#a9a8c0', fontSize: '13px', cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={saveTasks} disabled={tasksSaving}
                style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: tasksSaving ? 'not-allowed' : 'pointer', opacity: tasksSaving ? 0.7 : 1 }}>
                {tasksSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(22,22,31,0.8)', borderRadius: '16px', border: '1px dashed rgba(199,125,255,0.2)' }}>
            <p style={{ color: '#7c7b99', fontSize: '14px', margin: '0 0 16px' }}>タスクがまだありません</p>
            {isOwner && (
              <button onClick={startEditTasks}
                style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                タスクを追加する
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {(['todo', 'in_progress', 'done'] as const).map((col) => {
              const colTasks = tasks.filter((t) => t.status === col)
              const colMeta = TASK_STATUS_MAP[col]
              return (
                <div key={col} style={{ background: 'rgba(22,22,31,0.7)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colMeta.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: colMeta.color }}>{colMeta.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#7c7b99' }}>{colTasks.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {colTasks.map((t) => {
                      const assignedRole = roles.find((r) => r.id === t.role_id)
                      return (
                        <div key={t.id}
                          onClick={() => isOwner && toggleTaskStatus(t.id, t.status)}
                          style={{
                            background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px',
                            cursor: isOwner ? 'pointer' : 'default',
                            border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'border-color 0.15s',
                          }}
                          onMouseEnter={(e) => { if (isOwner) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(199,125,255,0.25)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)' }}
                        >
                          <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 4px', lineHeight: '1.4' }}>{t.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {assignedRole && (
                              <span style={{ fontSize: '11px', color: '#a9a8c0' }}>{assignedRole.role_name}</span>
                            )}
                            {t.due_date && (
                              <span style={{ fontSize: '11px', color: '#7c7b99' }}>
                                {new Date(t.due_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                          {isOwner && (
                            <p style={{ fontSize: '10px', color: '#4a4a6a', margin: '4px 0 0', textAlign: 'right' }}>クリックで次へ</p>
                          )}
                        </div>
                      )
                    })}
                    {colTasks.length === 0 && (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#4a4a6a', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                        なし
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
