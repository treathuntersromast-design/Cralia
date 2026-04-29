import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FolderOpen, Plus, ChevronRight } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

function projectTone(status: string): 'ok' | 'brand' | 'neutral' | 'danger' {
  const map: Record<string, 'ok' | 'brand' | 'neutral' | 'danger'> = {
    recruiting: 'ok', in_progress: 'brand', completed: 'neutral', cancelled: 'danger',
  }
  return map[status] ?? 'neutral'
}

const STATUS_LABEL: Record<string, string> = {
  recruiting: 'メンバー募集中', in_progress: '進行中', completed: '完了', cancelled: 'キャンセル',
}

export default async function ProjectsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/projects')

  const { data: myProjects } = await supabase
    .from('project_boards')
    .select('id, title, category, status, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container className="py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-[28px] font-bold mb-1">マイプロジェクト</h1>
            <p className="text-[14px] text-[var(--c-text-3)]">あなたが主催するプロジェクト</p>
          </div>
          <Link
            href="/projects/create"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-[8px] bg-brand text-white text-[14px] font-semibold no-underline hover:bg-brand-ink transition-colors"
          >
            <Plus size={16} aria-hidden />
            プロジェクトを作成
          </Link>
        </div>

        {!myProjects || myProjects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="まだプロジェクトがありません"
            description="メンバーを集めてプロジェクトを立ち上げましょう"
            action={
              <Link
                href="/projects/create"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-[6px] bg-brand text-white text-[13px] font-medium no-underline hover:bg-brand-ink transition-colors"
              >
                <Plus size={14} aria-hidden />
                最初のプロジェクトを作成
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {myProjects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="no-underline text-[var(--c-text)]">
                <Card bordered className="px-6 py-5 flex items-center justify-between gap-4 hover:border-brand transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                      <span className="font-bold text-[16px]">{p.title}</span>
                      {p.category && (
                        <Badge tone="brand" variant="soft">{p.category}</Badge>
                      )}
                    </div>
                    <span className="text-[12px] text-[var(--c-text-3)]">
                      {new Date(p.created_at).toLocaleDateString('ja-JP')} 作成
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={projectTone(p.status)} variant="soft">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Badge>
                    <ChevronRight size={16} className="text-[var(--c-text-4)]" aria-hidden />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}
