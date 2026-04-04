import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProjectDetailClient from '@/components/ProjectDetailClient'

export type ProjectRole = {
  id: string
  role_name: string
  description: string | null
  is_owner_role: boolean
  assigned_user_id: string | null
  assigned_user_name: string | null
  assigned_avatar_url: string | null
  display_order: number
}

export type ProjectTask = {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  role_id: string | null
  due_date: string | null
  display_order: number
}

export type ProjectBoard = {
  id: string
  owner_id: string
  title: string
  description: string | null
  category: string | null
  status: 'recruiting' | 'in_progress' | 'completed' | 'cancelled'
  is_public: boolean
  created_at: string
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/projects/${params.id}`)

  const [
    { data: project },
    { data: rolesRaw },
    { data: tasks },
  ] = await Promise.all([
    supabase.from('project_boards').select('*').eq('id', params.id).single(),
    supabase.from('project_roles').select('*').eq('project_id', params.id).order('display_order'),
    supabase.from('project_tasks').select('*').eq('project_id', params.id).order('display_order'),
  ])

  if (!project) notFound()

  // 割り当てユーザーの名前・アバターを取得
  const assignedIds = (rolesRaw ?? [])
    .map((r) => r.assigned_user_id)
    .filter(Boolean) as string[]
  const userMap: Record<string, { display_name: string; avatar_url: string | null }> = {}
  if (assignedIds.length > 0) {
    const { data: users } = await supabase
      .from('creator_profiles')
      .select('creator_id, display_name')
      .in('creator_id', assignedIds)
    const { data: userRecords } = await supabase
      .from('users')
      .select('id, avatar_url')
      .in('id', assignedIds)
    const avatarMap = Object.fromEntries((userRecords ?? []).map((u) => [u.id, u.avatar_url]))
    for (const u of users ?? []) {
      userMap[u.creator_id] = { display_name: u.display_name, avatar_url: avatarMap[u.creator_id] ?? null }
    }
  }

  const roles: ProjectRole[] = (rolesRaw ?? []).map((r) => ({
    id: r.id,
    role_name: r.role_name,
    description: r.description,
    is_owner_role: r.is_owner_role,
    assigned_user_id: r.assigned_user_id,
    assigned_user_name: r.assigned_user_id ? (userMap[r.assigned_user_id]?.display_name ?? null) : null,
    assigned_avatar_url: r.assigned_user_id ? (userMap[r.assigned_user_id]?.avatar_url ?? null) : null,
    display_order: r.display_order,
  }))

  const isOwner = user.id === project.owner_id

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
        </Link>
        <Link href="/projects" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>
          ← プロジェクト一覧へ
        </Link>
      </div>

      <ProjectDetailClient
        project={project as ProjectBoard}
        roles={roles}
        tasks={(tasks ?? []) as ProjectTask[]}
        isOwner={isOwner}
      />
    </div>
  )
}
