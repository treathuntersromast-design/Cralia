import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProfilePageClient from '@/components/ProfilePageClient'

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { back?: string }
}) {
  const supabase = createClient()

  // ログイン確認
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/profile/${params.id}`)

  // データ取得（並列）
  const [
    { data: creator },
    { data: portfolios },
    { data: userRecord },
  ] = await Promise.all([
    supabase.from('creator_profiles').select('*').eq('creator_id', params.id).single(),
    supabase.from('portfolios').select('*').eq('creator_id', params.id).order('display_order'),
    supabase.from('users').select('sns_links, entity_type, avatar_url').eq('id', params.id).single(),
  ])

  if (!creator) notFound()

  // 最終ログイン日取得
  let lastSignInAt: string | null = null
  try {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin.auth.admin.getUserById(params.id)
    lastSignInAt = data?.user?.last_sign_in_at ?? null
  } catch { /* 取得失敗時は非表示 */ }

  const formatLastSeen = (dateStr: string | null): string => {
    if (!dateStr) return '不明'
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (diff <= 0) return '今日'
    if (diff === 1) return '昨日'
    if (diff < 7) return `${diff}日前`
    if (diff < 30) return `${Math.floor(diff / 7)}週間前`
    if (diff < 365) return `${Math.floor(diff / 30)}ヶ月前`
    return `${Math.floor(diff / 365)}年以上前`
  }

  // creatorTypesの正規化（「その他（xxx）」→ 表示用にそのまま渡す）
  const creatorTypes: string[] = creator.creator_type ?? []
  const snsLinks: { platform: string; id: string }[] = Array.isArray(userRecord?.sns_links) ? userRecord.sns_links : []
  const entityType = userRecord?.entity_type === 'corporate' ? '法人・団体' : '個人'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '22px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
        </Link>
        {(() => {
          // back パラメータは /search で始まる内部パスのみ許可（外部リダイレクト・javascript: を防ぐ）
          const backHref = searchParams.back
          const safeBack = backHref && /^\/(search|clients)(\?.*)?$/.test(decodeURIComponent(backHref))
            ? decodeURIComponent(backHref)
            : null
          return safeBack ? (
            <Link href={safeBack} style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>
              ← 検索結果へ戻る
            </Link>
          ) : (
            <Link href="/dashboard" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>
              ← ダッシュボードへ
            </Link>
          )
        })()}
      </div>

      <ProfilePageClient
        profileId={params.id}
        isOwner={user.id === params.id}
        avatarUrl={userRecord?.avatar_url ?? null}
        displayName={creator.display_name}
        entityType={entityType}
        creatorTypes={creatorTypes}
        bio={creator.bio ?? null}
        availability={creator.availability as 'open' | 'one_slot' | 'full'}
        skills={creator.skills ?? []}
        priceMin={creator.price_min ?? null}
        priceNote={(creator as Record<string, unknown>).price_note as string ?? null}
        deliveryDays={(creator as Record<string, unknown>).delivery_days as string ?? null}
        portfolios={(portfolios ?? []).map((p) => ({
          platform: p.platform,
          url: p.url,
          title: p.title ?? '',
          thumbnail_url: p.thumbnail_url ?? undefined,
        }))}
        snsLinks={snsLinks}
        lastSeen={formatLastSeen(lastSignInAt)}
      />
    </div>
  )
}
