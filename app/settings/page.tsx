import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { User, Lock, CreditCard, Calendar, Palette, Bell } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { SettingRow } from '@/components/layout/SettingRow'

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
    { href: '/settings/personal',        icon: User,       title: '個人情報',           desc: '氏名・居住地・生年月日などの個人情報' },
    { href: '/settings/account',         icon: Lock,       title: 'アカウント',         desc: 'メールアドレス・パスワードの変更' },
    { href: '/settings/billing',         icon: CreditCard, title: 'プランと請求',       desc: '現在のプラン・支払い方法・請求履歴' },
    { href: '/settings/calendar',        icon: Calendar,   title: 'Googleカレンダー連携', desc: 'カレンダーと連携して依頼時の納期提案を有効にする' },
    { href: '/settings/creator-profile', icon: Palette,    title: 'クリエイター設定',   desc: '同時受注上限・料金プランの設定' },
    { href: '/notifications',            icon: Bell,       title: '通知',               desc: '受け取った通知を確認する' },
  ]

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <h1 className="text-[24px] font-bold mb-1">設定</h1>
        <p className="text-[14px] text-[var(--c-text-3)] mb-8">
          {profile?.display_name ?? user.email}
        </p>

        <div className="flex flex-col gap-2">
          {settingsLinks.map((s) => (
            <SettingRow key={s.href} href={s.href} icon={s.icon} title={s.title} desc={s.desc} />
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-[var(--c-border)]">
          <Link
            href="/settings/account#danger"
            className="block px-6 py-3.5 rounded-card border border-[#dc2626]/25 bg-[#dc2626]/5 text-[#dc2626] text-[14px] font-semibold no-underline text-center hover:bg-[#dc2626]/10 transition-colors"
          >
            アカウントを削除する
          </Link>
        </div>
      </Container>
    </div>
  )
}
