import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import CreatorSearchClient from '@/components/CreatorSearchClient'

export const dynamic = 'force-dynamic'

export type Creator = {
  creator_id: string
  display_name: string
  creator_type: string[]
  skills: string[]
  bio: string | null
  price_min: number | null
  availability: 'open' | 'one_slot' | 'full'
  avatar_url: string | null
  entity_type: string
  thumbnails: string[]
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { type?: string; availability?: string; q?: string; skills?: string }
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
  const initialQ = (searchParams.q ?? '').slice(0, 200)
  const initialSkills = searchParams.skills
    ? searchParams.skills.split(',').filter(Boolean).slice(0, 20)
    : []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from('creator_profiles')
    .select('creator_id, display_name, creator_type, skills, bio, price_min, availability')
    .order('registered_at', { ascending: false })
    .limit(200)

  if (availFilter) query = query.eq('availability', availFilter)
  if (typeFilter) query = query.contains('creator_type', [typeFilter])

  const { data: profiles } = await query
  let creators: Creator[] = ((profiles ?? []) as Omit<Creator, 'avatar_url' | 'entity_type' | 'thumbnails'>[]).map(
    (c) => ({ ...c, avatar_url: null, entity_type: 'individual', thumbnails: [] })
  )

  if (creators.length > 0) {
    const ids = creators.map((c) => c.creator_id)

    // users テーブルから avatar_url・entity_type を取得（service role 必須）
    const [{ data: users }, { data: portfolios }] = await Promise.all([
      admin.from('users').select('id, avatar_url, entity_type').in('id', ids),
      admin
        .from('portfolios')
        .select('creator_id, thumbnail_url, display_order')
        .in('creator_id', ids)
        .not('thumbnail_url', 'is', null)
        .neq('thumbnail_url', '')
        .order('display_order'),
    ])

    const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

    // クリエイターごとにサムネ最大2枚
    const thumbMap: Record<string, string[]> = {}
    for (const p of portfolios ?? []) {
      if (!thumbMap[p.creator_id]) thumbMap[p.creator_id] = []
      if (thumbMap[p.creator_id].length < 2) thumbMap[p.creator_id].push(p.thumbnail_url)
    }

    creators = creators.map((c) => ({
      ...c,
      avatar_url: userMap[c.creator_id]?.avatar_url ?? null,
      entity_type: userMap[c.creator_id]?.entity_type ?? 'individual',
      thumbnails: thumbMap[c.creator_id] ?? [],
    }))
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      {/* ヘッダー */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/dashboard" style={{
          fontSize: '22px', fontWeight: '800',
          background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textDecoration: 'none',
        }}>
          CreMatch
        </Link>
        <Link href="/dashboard" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>
          ← ダッシュボードへ
        </Link>
      </div>

      <CreatorSearchClient
        creators={creators}
        initialType={typeFilter}
        initialAvailability={availFilter}
        initialQ={initialQ}
        initialSkills={initialSkills}
      />
    </div>
  )
}
