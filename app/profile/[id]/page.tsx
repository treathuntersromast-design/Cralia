import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProfilePageClient from '@/components/ProfilePageClient'
import { activityStyleToRoles } from '@/lib/constants/activity'
import { INACTIVE_ORDER_STATUSES } from '@/lib/constants/statuses'

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
    supabase.from('users').select('sns_links, entity_type, avatar_url, activity_style_id').eq('id', params.id).single(),
  ])

  if (!creator) notFound()

  // 最終ログイン日取得 + アクティブ案件チェック（オーナーのみ）+ 会社名取得（法人のみ）
  let lastSignInAt: string | null = null
  let hasActiveReceivedOrders = false
  let hasActiveSentOrders = false
  let companyName: string | null = null
  let hasCorporateNumber = false
  let invoiceNumber: string | null = null
  try {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: authUser } = await admin.auth.admin.getUserById(params.id)
    lastSignInAt = authUser?.user?.last_sign_in_at ?? null

    // 法人の場合は会社名・法人番号を取得、全員インボイス番号を取得
    const { data: personalInfo } = await admin
      .from('user_personal_info')
      .select('company_name, corporate_number, invoice_number')
      .eq('user_id', params.id)
      .single()

    if (userRecord?.entity_type === 'corporate') {
      const raw = personalInfo?.company_name?.trim() ?? null
      const displayNameForCheck = creator.display_name?.trim() ?? ''
      companyName = raw && raw !== displayNameForCheck ? raw : null
      hasCorporateNumber = !!(personalInfo?.corporate_number?.trim())
    }
    invoiceNumber = personalInfo?.invoice_number?.trim() ?? null

    if (user.id === params.id) {
      const [{ data: receivedOrders }, { data: sentOrders }] = await Promise.all([
        admin.from('projects')
          .select('id')
          .eq('creator_id', user.id)
          .not('status', 'in', INACTIVE_ORDER_STATUSES)
          .limit(1),
        admin.from('projects')
          .select('id')
          .eq('client_id', user.id)
          .not('status', 'in', INACTIVE_ORDER_STATUSES)
          .limit(1),
      ])
      hasActiveReceivedOrders = (receivedOrders?.length ?? 0) > 0
      hasActiveSentOrders = (sentOrders?.length ?? 0) > 0
    }
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

  // 評価統計取得（被評価者として受け取った評価）
  type EvalStat = { count: number; avg: number | null }
  let evalAsCreator: EvalStat = { count: 0, avg: null }
  let evalAsClient:  EvalStat = { count: 0, avg: null }
  let evalAsMember:  EvalStat = { count: 0, avg: null }
  let recentReviews: { id: string; rating: number; comment: string | null; created_at: string; review_type: string }[] = []
  try {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: allReviews } = await admin
      .from('reviews')
      .select('id, rating, review_type, comment, created_at')
      .eq('reviewee_id', params.id)
      .order('created_at', { ascending: false })

    const calcStat = (rows: typeof allReviews, type: string): EvalStat => {
      const filtered = (rows ?? []).filter((r) => r.review_type === type)
      if (filtered.length === 0) return { count: 0, avg: null }
      const avg = filtered.reduce((s, r) => s + r.rating, 0) / filtered.length
      return { count: filtered.length, avg: Math.round(avg * 10) / 10 }
    }

    evalAsCreator = calcStat(allReviews, 'order_to_creator')
    evalAsClient  = calcStat(allReviews, 'order_to_client')
    evalAsMember  = calcStat(allReviews, 'project_member')
    recentReviews = (allReviews ?? []).slice(0, 5)
  } catch { /* 取得失敗時は非表示 */ }

  // creatorTypesの正規化（「その他（xxx）」→ 表示用にそのまま渡す）
  const creatorTypes: string[] = creator.creator_type ?? []
  const snsLinks: { platform: string; id: string }[] = Array.isArray(userRecord?.sns_links) ? (userRecord!.sns_links as { platform: string; id: string }[]) : []
  const entityType = userRecord?.entity_type === 'corporate' ? '法人・団体' : '個人'
  const roles: string[] = activityStyleToRoles((userRecord as Record<string, unknown>)?.activity_style_id as number | null)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--c-bg)',
      color: 'var(--c-text)',
    }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid var(--c-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--c-accent)', textDecoration: 'none' }}>
          Cralia
        </Link>
        {(() => {
          // back パラメータは許可された内部パスのみ許可（外部リダイレクト・javascript: を防ぐ）
          const backHref = searchParams.back
          const decoded = backHref ? decodeURIComponent(backHref) : ''
          const ALLOWED_BACK = /^\/(search|clients|jobs|orders|projects|messages|notifications|events)(\?.*)?$/
          const safeBack = decoded && ALLOWED_BACK.test(decoded) ? decoded : null
          const backLabel = safeBack
            ? safeBack.startsWith('/search')        ? '← 検索結果へ戻る'
            : safeBack.startsWith('/clients')       ? '← お仕事募集中の依頼者へ戻る'
            : safeBack.startsWith('/jobs')          ? '← 案件一覧へ戻る'
            : safeBack.startsWith('/orders')        ? '← 依頼一覧へ戻る'
            : safeBack.startsWith('/projects')      ? '← プロジェクトへ戻る'
            : safeBack.startsWith('/messages')      ? '← メッセージへ戻る'
            : safeBack.startsWith('/notifications') ? '← 通知へ戻る'
            : safeBack.startsWith('/events')        ? '← 交流会へ戻る'
            : '← 戻る'
            : '← ダッシュボードへ'
          return safeBack ? (
            <Link href={safeBack} style={{ color: 'var(--c-text-2)', fontSize: '14px', textDecoration: 'none' }}>
              {backLabel}
            </Link>
          ) : (
            <Link href="/dashboard" style={{ color: 'var(--c-text-2)', fontSize: '14px', textDecoration: 'none' }}>
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
        roles={roles}
        companyName={companyName}
        hasCorporateNumber={hasCorporateNumber}
        invoiceNumber={invoiceNumber}
        hasActiveReceivedOrders={hasActiveReceivedOrders}
        hasActiveSentOrders={hasActiveSentOrders}
        lastSeen={formatLastSeen(lastSignInAt)}
        evalAsCreator={evalAsCreator}
        evalAsClient={evalAsClient}
        evalAsMember={evalAsMember}
        recentReviews={recentReviews}
      />
    </div>
  )
}
