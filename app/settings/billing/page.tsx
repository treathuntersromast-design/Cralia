import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/settings/billing')

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)

  const subscription = subscriptions?.[0] ?? null
  const isPro = subscription?.status === 'active'

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
        <Link href="/settings" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← 設定へ</Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 32px' }}>プランと請求</h1>

        {/* 現在のプラン */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#a9a8c0', margin: '0 0 14px', letterSpacing: '0.05em' }}>現在のプラン</h2>
          <div style={{ background: isPro ? 'rgba(199,125,255,0.08)' : 'rgba(22,22,31,0.9)', border: `1px solid ${isPro ? 'rgba(199,125,255,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '20px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px' }}>
                  {isPro ? 'スタンダードプラン' : '無料プラン'}
                </p>
                <p style={{ color: '#a9a8c0', fontSize: '14px', margin: 0 }}>
                  {isPro ? '¥500 / 月（税抜）' : '¥0 / 月'}
                </p>
              </div>
              <span style={{
                padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
                background: isPro ? 'rgba(199,125,255,0.2)' : 'rgba(169,168,192,0.15)',
                color: isPro ? '#c77dff' : '#a9a8c0',
              }}>
                {isPro ? '利用中' : 'フリー'}
              </span>
            </div>

            {isPro && subscription?.current_period_end && (
              <p style={{ color: '#7c7b99', fontSize: '13px', margin: '0 0 20px' }}>
                次回更新日: {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'プロフィール公開', available: true },
                { label: 'クリエイター検索に表示', available: true },
                { label: 'ポートフォリオ掲載（5件まで）', available: true },
                { label: '依頼の受け取り・管理', available: isPro },
                { label: 'プロジェクトボード（無制限）', available: isPro },
                { label: 'AI自己紹介文作成', available: isPro },
              ].map(({ label, available }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: available ? '#4ade80' : '#3c3c54', fontSize: '14px' }}>{available ? '✓' : '✗'}</span>
                  <span style={{ color: available ? '#f0eff8' : '#5c5b78', fontSize: '14px' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* アップグレード or 解約 */}
        {!isPro ? (
          <section style={{ marginBottom: '32px' }}>
            <div style={{ background: 'rgba(199,125,255,0.06)', border: '1px solid rgba(199,125,255,0.2)', borderRadius: '20px', padding: '28px', textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px' }}>スタンダードプランにアップグレード</p>
              <p style={{ color: '#a9a8c0', fontSize: '14px', margin: '0 0 24px' }}>¥500 / 月（税抜）で全機能が使い放題</p>
              <button disabled style={{
                padding: '14px 40px', borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'not-allowed', opacity: 0.6,
              }}>
                アップグレード（準備中）
              </button>
              <p style={{ color: '#5c5b78', fontSize: '12px', margin: '12px 0 0' }}>Stripe決済連携は現在開発中です</p>
            </div>
          </section>
        ) : (
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#a9a8c0', margin: '0 0 14px', letterSpacing: '0.05em' }}>請求情報</h2>
            <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px 24px' }}>
              <p style={{ color: '#a9a8c0', fontSize: '14px', margin: 0 }}>支払い方法・請求履歴の管理は準備中です。</p>
            </div>
          </section>
        )}

        {/* プラン特典一覧 */}
        <section>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#a9a8c0', margin: '0 0 14px', letterSpacing: '0.05em' }}>スタンダードプランの特典</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { icon: '📩', title: '依頼管理', desc: '受け取った依頼を一元管理' },
              { icon: '🎯', title: 'プロジェクト無制限', desc: 'プロジェクトを何件でも作成' },
              { icon: '🤖', title: 'AI自己紹介文', desc: 'Claude AIで自己紹介を自動生成' },
              { icon: '💳', title: 'エスクロー決済', desc: '安心の前払い・後払いシステム' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: 'rgba(22,22,31,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
                <p style={{ fontWeight: '700', fontSize: '14px', margin: '0 0 4px' }}>{title}</p>
                <p style={{ color: '#7c7b99', fontSize: '12px', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
