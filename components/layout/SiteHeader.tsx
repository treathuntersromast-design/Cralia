import Link from 'next/link'
import { Container } from '@/components/ui/Container'

export function SiteHeader() {
  return (
    <header className="h-16 border-b border-[var(--c-border)] bg-[var(--c-surface)]">
      <Container className="h-full flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-brand no-underline">
          Cralia
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-[14px] text-[var(--c-text-2)] hover:text-brand transition-colors no-underline"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center h-9 px-3.5 min-w-[88px] rounded-[6px]
              bg-brand text-white text-[13px] font-medium no-underline
              hover:bg-brand-ink transition-colors duration-150"
          >
            無料登録
          </Link>
        </div>
      </Container>
    </header>
  )
}
