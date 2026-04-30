// TODO: 該当ページ実装後に有効化（/help, /contact, /about, /tokushoho）
import Link from 'next/link'
import { Container } from '@/components/ui/Container'

const COLUMNS = [
  {
    heading: 'サービス',
    links: [
      { label: 'クリエイター検索',     href: '/search' },
      { label: 'プロジェクト',         href: '/projects' },
      { label: 'お仕事募集中の依頼者', href: '/clients' },
      { label: '案件を探す',           href: '/jobs' },
    ],
  },
  {
    heading: 'サポート',
    links: [
      { label: 'よくある質問',  href: '/help' },
      { label: 'お問い合わせ',  href: '/contact' },
      { label: '運営会社',      href: '/about' },
    ],
  },
  {
    heading: '法務',
    links: [
      { label: '利用規約',    href: '/terms' },
      { label: 'プライバシー', href: '/privacy' },
      { label: '特定商取引法', href: '/tokushoho' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-[var(--c-border)] py-12">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-bold text-brand no-underline">Cralia</Link>
            <p className="mt-3 text-[13px] text-[var(--c-text-3)] leading-relaxed">
              すべてのクリエイターがつながる場所
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-[12px] font-bold text-[var(--c-text-2)] mb-3 tracking-wider uppercase">
                {col.heading}
              </h4>
              <ul className="space-y-2 list-none p-0 m-0">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-[var(--c-text-3)] hover:text-brand no-underline transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-[var(--c-border)] flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[12px] text-[var(--c-text-4)] m-0">
            &copy; {new Date().getFullYear()} Cralia. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/login"  className="text-[12px] text-[var(--c-text-3)] hover:text-brand no-underline transition-colors">ログイン</Link>
            <Link href="/signup" className="text-[12px] text-[var(--c-text-3)] hover:text-brand no-underline transition-colors">新規登録</Link>
          </div>
        </div>
      </Container>
    </footer>
  )
}
