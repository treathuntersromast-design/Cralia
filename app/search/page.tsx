import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CreatorSearchClient from '@/components/CreatorSearchClient'
import { AppHeader } from '@/components/layout/AppHeader'

export const dynamic = 'force-dynamic'

export type Creator = {
  creator_id:   string
  display_id:   string | null
  display_name: string
  creator_type: string[]
  skills:       string[]
  bio:          string | null
  price_min:    number | null
  availability: 'open' | 'one_slot' | 'full'
  avatar_url:   string | null
  entity_type:  string
  thumbnails:   string[]
}

const VALID_FROM_PATHS = ['/dashboard', '/orders', '/projects', '/messages', '/notifications', '/events']

function resolveFrom(raw: string | undefined): { href: string; label: string } {
  const decoded = raw ? decodeURIComponent(raw) : ''
  const matched = VALID_FROM_PATHS.find((p) => decoded.startsWith(p))
  if (!matched) return { href: '/dashboard', label: 'ダッシュボードへ' }
  const labels: Record<string, string> = {
    '/orders': '依頼一覧へ',
    '/projects': 'プロジェクトへ',
    '/messages': 'メッセージへ',
    '/notifications': '通知へ',
    '/events': '交流会へ',
  }
  return { href: decoded, label: labels[matched] ?? 'ダッシュボードへ' }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { type?: string; availability?: string; q?: string; skills?: string; from?: string; id?: string }
}) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const VALID_TYPES = [
    'VTuber', 'ボカロP', 'イラストレーター', '動画編集者',
    '楽曲制作関係', '3Dモデラー', 'デザイナー', 'その他',
  ]
  const VALID_AVAIL = ['open', 'one_slot', 'full']

  const rawType = searchParams.type ?? ''
  const rawAvail = searchParams.availability ?? ''
  const typeFilter = VALID_TYPES.includes(rawType) ? rawType : ''
  const availFilter = VALID_AVAIL.includes(rawAvail) ? rawAvail : ''
  const initialQ      = (searchParams.q ?? '').slice(0, 200)
  const initialId     = (searchParams.id ?? '').replace(/\D/g, '').slice(0, 8)
  const initialSkills = searchParams.skills
    ? searchParams.skills.split(',').filter(Boolean).slice(0, 20)
    : []
  const { href: backHref, label: backLabel } = resolveFrom(searchParams.from)

  let query: any = admin
    .from('creator_profiles')
    .select('creator_id, display_name, creator_type, skills, bio, price_min, availability')
    .order('registered_at', { ascending: false })
    .limit(500)

  if (availFilter) query = query.eq('availability', availFilter)
  if (typeFilter) query = query.contains('creator_type', [typeFilter])

  const { data: profiles } = await query
  let creators: Creator[] = ((profiles ?? []) as Omit<Creator, 'avatar_url' | 'entity_type' | 'display_id' | 'thumbnails'>[]).map(
    (c) => ({ ...c, avatar_url: null, entity_type: 'individual', display_id: null, thumbnails: [] })
  )

  if (creators.length > 0) {
    const ids = creators.map((c) => c.creator_id)

    const [{ data: users }, { data: portfolios }] = await Promise.all([
      admin.from('users').select('id, avatar_url, entity_type, display_id').in('id', ids),
      admin
        .from('portfolios')
        .select('creator_id, thumbnail_url, display_order')
        .in('creator_id', ids)
        .not('thumbnail_url', 'is', null)
        .neq('thumbnail_url', '')
        .order('display_order'),
    ])

    const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

    const thumbMap: Record<string, string[]> = {}
    for (const p of portfolios ?? []) {
      if (!thumbMap[p.creator_id]) thumbMap[p.creator_id] = []
      if (thumbMap[p.creator_id].length < 2) thumbMap[p.creator_id].push(p.thumbnail_url)
    }

    creators = creators.map((c) => ({
      ...c,
      avatar_url:  userMap[c.creator_id]?.avatar_url  ?? null,
      entity_type: userMap[c.creator_id]?.entity_type ?? 'individual',
      display_id:  userMap[c.creator_id]?.display_id  ?? null,
      thumbnails:  thumbMap[c.creator_id] ?? [],
    }))
  }

  const showBack = backHref !== '/dashboard'

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      {showBack && (
        <div className="border-b border-[var(--c-border)] bg-[var(--c-surface)]">
          <div className="max-w-[1000px] mx-auto px-6 py-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-[13px] text-[var(--c-text-3)] no-underline hover:text-brand transition-colors"
            >
              <ArrowLeft size={13} aria-hidden />
              {backLabel}
            </Link>
          </div>
        </div>
      )}
      <CreatorSearchClient
        creators={creators}
        initialType={typeFilter}
        initialAvailability={availFilter}
        initialQ={initialQ}
        initialId={initialId}
        initialSkills={initialSkills}
        from={searchParams.from ? decodeURIComponent(searchParams.from) : undefined}
      />
    </div>
  )
}
