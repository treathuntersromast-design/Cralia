import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cralia',
  description: 'クリエイターのためのマッチングプラットフォーム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" data-theme="dark">
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <ThemeToggle />
          <ScrollToTopButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
