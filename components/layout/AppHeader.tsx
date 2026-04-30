'use client'

import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/ThemeToggle'

interface AppHeaderProps {
  unreadNotifications?: number
  unreadMessages?: number
}

export function AppHeader({ unreadNotifications = 0, unreadMessages = 0 }: AppHeaderProps) {
  return (
    <header className="h-16 border-b border-[var(--c-border)] bg-gradient-to-b from-[#f4f7ff] to-white sticky top-0 z-30 backdrop-blur">
      <Container className="h-full flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-brand no-underline">
          Cralia
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/notifications" className="relative">
            <Button variant="ghost" size="sm" className="min-w-0 px-2.5" aria-label="通知">
              <Icon name="Bell" size={18} aria-hidden />
            </Button>
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 pointer-events-none">
                <Badge tone="danger" variant="solid" className="text-[10px] px-1.5 py-0 min-w-[18px] justify-center">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Badge>
              </span>
            )}
          </Link>

          <Link href="/messages" className="relative">
            <Button variant="ghost" size="sm" className="min-w-0 px-2.5" aria-label="メッセージ">
              <Icon name="MessageCircle" size={18} aria-hidden />
            </Button>
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 pointer-events-none">
                <Badge tone="danger" variant="solid" className="text-[10px] px-1.5 py-0 min-w-[18px] justify-center">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </Badge>
              </span>
            )}
          </Link>

          <Link href="/settings">
            <Button variant="ghost" size="sm" className="min-w-0 px-2.5" aria-label="設定">
              <Icon name="Settings" size={18} aria-hidden />
            </Button>
          </Link>

          <ThemeToggle />
          <LogoutButton />
        </div>
      </Container>
    </header>
  )
}
