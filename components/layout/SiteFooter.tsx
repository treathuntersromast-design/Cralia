import Link from 'next/link'
import { Container } from '@/components/ui/Container'

const LINKS = [
  { label: 'プライバシー',  href: '/privacy' },
  { label: '利用規約',      href: '/terms' },
  { label: 'ログイン',      href: '/login' },
  { label: '新規登録',      href: '/signup' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--c-border)] py-8 bg-[var(--c-surface)]">
      <Container className="flex flex-col items-center gap-4 text-center">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-[13px] text-[var(--c-text-3)] hover:text-brand transition-colors no-underline"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-[12px] text-[var(--c-text-4)]">
          &copy; {new Date().getFullYear()} Cralia. All rights reserved.
        </p>
      </Container>
    </footer>
  )
}
