import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/settings')

  const { data: profileRows } = await supabase
    .from('users')
    .select('display_name, roles')
    .eq('id', user.id)
    .limit(1)
  const profile = profileRows?.[0] ?? null

  const settingsLinks = [
    {
      href: '/settings/personal',
      icon: '👤',
      title: '個人情報',
      desc: '氏名・居住地・生年月日などの個人情報',
      color: '#c77dff',
    },
    {
      href: '/settings/account',
      icon: '🔐',
      title: 'アカウント',
      desc: 'メールアドレス・パスワードの変更',
      color: '#60a5fa',
    },
    {
      href: '/settings/billing',
      icon: '💳',
      title: 'プランと請求',
      desc: '現在のプラン・支払い方法・請求履歴',
      color: '#4ade80',
    },
    {
      href: '/settings/calendar',
      icon: '📅',
      title: 'Googleカレンダー連携',
      desc: 'カレンダーと連携して依頼時の納期提案を有効にする',
      color: '#4ade80',
    },
    {
      href: '/settings/creator-profile',
      icon: '🎨',
      title: 'クリエイター設定',
      desc: '同時受注上限・料金プランの設定',
      color: '#c77dff',
    },
    {
      href: '/notifications',
      icon: '🔔',
      title: '通知',
      desc: '受け取った通知を確認する',
      color: '#fbbf24',
    },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          Cralia
        </Link>
        <Link href="/dashboard" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← ダッシュボードへ</Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px' }}>設定</h1>
        <p style={{ color: '#7c7b99', fontSize: '14px', margin: '0 0 32px' }}>
          {profile?.display_name ?? user.email}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {settingsLinks.map((s) => (
            <Link key={s.href} href={s.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '20px 24px',
                display: 'flex', alignItems: 'center', gap: '16px',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                  background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '700', fontSize: '15px', margin: '0 0 2px' }}>{s.title}</p>
                  <p style={{ color: '#7c7b99', fontSize: '13px', margin: 0 }}>{s.desc}</p>
                </div>
                <span style={{ color: '#5c5b78', fontSize: '18px' }}>›</span>
              </div>
            </Link>
          ))}
        </div>

        {/* ログアウト・危険ゾーン */}
        <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/settings/account#danger" style={{
            display: 'block', padding: '14px 24px', borderRadius: '14px',
            border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.06)',
            color: '#f87171', fontSize: '14px', fontWeight: '600', textDecoration: 'none', textAlign: 'center',
          }}>
            アカウントを削除する
          </Link>
        </div>
      </div>
    </div>
  )
}
