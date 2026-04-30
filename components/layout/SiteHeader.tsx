import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import ThemeToggle from '@/components/ThemeToggle'

export function SiteHeader() {
  return (
    <header className="h-16 border-b border-[var(--c-border)] bg-gradient-to-b from-[#f4f7ff] to-white sticky top-0 z-30 backdrop-blur">
      <Container className="h-full flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-brand no-underline">
          Cralia
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-[14px] text-[var(--c-text-2)] hover:text-brand transition-colors no-underline"
          >
            ログイン
          </Link>
          <ThemeToggle />
          <Link href="/signup" className="no-underline">
            <Button variant="primary" size="sm">無料登録</Button>
          </Link>
        </div>
      </Container>
    </header>
  )
}
