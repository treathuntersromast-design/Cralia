import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_JP } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-inter',
})

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-jp',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Cralia',
    default:  'Cralia — クリエイターマッチング',
  },
  description:
    'VTuber・ボカロP・イラストレーターなどクリエイターと依頼者をつなぐマッチングプラットフォーム',
  openGraph: {
    title:       'Cralia — クリエイターマッチング',
    description: 'VTuber・ボカロP・イラストレーターなどクリエイターと依頼者をつなぐマッチングプラットフォーム',
    locale:      'ja_JP',
    type:        'website',
  },
  twitter: {
    card:        'summary',
    title:       'Cralia — クリエイターマッチング',
    description: 'VTuber・ボカロP・イラストレーターなどクリエイターと依頼者をつなぐマッチングプラットフォーム',
  },
}

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" data-theme="light">
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans antialiased text-[15px] leading-[1.7]`}>
        <ThemeProvider>
          {children}
          <ThemeToggle />
          <ScrollToTopButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
