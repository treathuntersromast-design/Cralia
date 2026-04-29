import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import ProjectDetailClient from '@/components/ProjectDetailClient'
import ProjectSchedule from '@/components/ProjectSchedule'
import ProjectBoardReviewSection from '@/components/ProjectBoardReviewSection'
import { AppHeader } from '@/components/layout/AppHeader'

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
  const isCompleted = project.status === 'completed'

  const scheduleMembers = roles
    .filter((r) => r.assigned_user_id && r.assigned_user_name)
    .map((r) => ({ userId: r.assigned_user_id!, name: r.assigned_user_name! }))
    .filter((v, i, arr) => arr.findIndex((x) => x.userId === v.userId) === i)

  let boardReviews: { id: string; rating: number; comment: string | null; created_at: string; reviewer_id: string; reviewee_id: string }[] = []
  if (isCompleted) {
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await db
      .from('reviews')
      .select('id, rating, comment, created_at, reviewer_id, reviewee_id')
      .eq('project_board_id', params.id)
      .order('created_at', { ascending: false })
    boardReviews = data ?? []
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />

      <ProjectDetailClient
        project={project as ProjectBoard}
        roles={roles}
        tasks={(tasks ?? []) as ProjectTask[]}
        isOwner={isOwner}
      />

      <div className="max-w-[860px] mx-auto px-6">
        <ProjectSchedule
          projectId={params.id}
          isOwner={isOwner}
          members={scheduleMembers}
          initialTaskCount={(tasks ?? []).length}
        />
      </div>

      <div className="max-w-[860px] mx-auto px-6 pb-16">
        <ProjectBoardReviewSection
          boardId={params.id}
          isCompleted={isCompleted}
          currentUserId={user.id}
          members={scheduleMembers}
          initialReviews={boardReviews}
        />
      </div>
    </div>
  )
}
