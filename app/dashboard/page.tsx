import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import AvatarUpload from '@/components/AvatarUpload'

const ROLE_LABELS: Record<string, string> = {
  creator: 'クリエイター',
  client: '依頼者',
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('roles, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  // プロフィール未設定なら setup へ
  if (!profile || !profile.roles || profile.roles.length === 0) {
    redirect('/profile/setup')
  }

  const roleLabels = (profile.roles as string[]).map((r) => ROLE_LABELS[r] ?? r).join(' / ')

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d14', color: '#f0eff8', padding: '40px' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          CreMatch
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#a9a8c0', fontSize: '14px' }}>{user.email}</span>
          <LogoutButton />
        </div>
      </div>

      {/* ウェルカムカード */}
      <div style={{
        background: 'rgba(199,125,255,0.08)',
        border: '1px solid rgba(199,125,255,0.2)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
          <AvatarUpload
            currentUrl={profile.avatar_url ?? null}
            displayName={profile.display_name ?? user.email ?? '?'}
            size={72}
            onUploaded={() => {}}
          />
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>
              ようこそ、{profile.display_name ?? user.email?.split('@')[0]} さん 🎉
            </h2>
            <p style={{ color: '#a9a8c0', margin: '0 0 4px' }}>
              活動スタイル:{' '}
              <strong style={{ color: '#c77dff' }}>{roleLabels}</strong>
            </p>
            <p style={{ color: '#7c7b99', fontSize: '12px', margin: '0 0 12px', fontFamily: 'monospace' }}>
              ユーザーID: {user.id}
            </p>
            <Link
              href={`/profile/${user.id}`}
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '700',
                textDecoration: 'none',
              }}
            >
              👤 プロフィールを見る
            </Link>
          </div>
        </div>
      </div>

      {/* 今後実装予定の機能カード */}
      <h3 style={{ color: '#7c7b99', fontSize: '14px', marginBottom: '16px', letterSpacing: '0.05em' }}>
        実装予定の機能
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {[
          { emoji: '👤', title: 'プロフィール公開ページ', desc: 'あなたのページを公開', week: 'Week 3-4' },
          { emoji: '🔍', title: 'クリエイター検索', desc: '名前・スキル・日程で検索', week: 'Week 5-6' },
          { emoji: '📅', title: 'カレンダー連携', desc: 'Googleカレンダーと連携', week: 'Week 7-8' },
          { emoji: '📋', title: '依頼管理', desc: '依頼の送受信・チャット', week: 'Week 9-10' },
          { emoji: '💳', title: '決済', desc: 'エスクロー前払い', week: 'Week 11-12' },
          { emoji: '🤖', title: 'AI依頼文添削', desc: 'Claude APIで自動添削', week: 'Week 13-14' },
        ].map(({ emoji, title, desc, week }) => (
          <div key={title} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '20px',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{emoji}</div>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>{title}</div>
            <div style={{ color: '#7c7b99', fontSize: '13px', marginBottom: '8px' }}>{desc}</div>
            <span style={{
              fontSize: '11px',
              background: 'rgba(199,125,255,0.15)',
              color: '#c77dff',
              padding: '2px 8px',
              borderRadius: '20px',
            }}>
              {week}
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
