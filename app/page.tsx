import Link from 'next/link'
import {
  Search, Target, Megaphone, Briefcase,
  MessageCircle, ShieldCheck, Sparkles, Users,
  type LucideIcon,
} from 'lucide-react'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface Feature {
  icon:  LucideIcon
  title: string
  desc:  string
}

const FEATURES: Feature[] = [
  { icon: Search,        title: 'クリエイター検索',     desc: 'タイプ・スキル・受付状況でクリエイターを絞り込み。ポートフォリオをひと目で確認できます。' },
  { icon: Target,        title: 'プロジェクトボード',   desc: '楽曲制作・動画制作などのプロジェクトを作成し、必要な役職のメンバーを募集できます。' },
  { icon: Megaphone,     title: 'お仕事募集中の依頼者', desc: 'クリエイターとして仕事を探す。依頼者のプロフィールを確認してダイレクトに営業をかけましょう。' },
  { icon: Briefcase,     title: '案件を探す・募集する', desc: 'クリエイターは公開中の案件を検索して応募。依頼者はクリエイター募集の案件を投稿できます。' },
  { icon: MessageCircle, title: 'チャットで相談',       desc: '依頼内容の詳細をチャットで詰める。ファイル共有もスムーズに行えます。' },
  { icon: ShieldCheck,   title: 'エスクロー決済',       desc: '前払いで安心取引。納品確認後に報酬が支払われる仕組みで双方を保護します。' },
  { icon: Sparkles,      title: 'AI支援機能',           desc: 'Claude AIがプロフィール文の作成や依頼文の作成をサポート。あなたの魅力を最大限に引き出します。' },
  { icon: Users,         title: '交流会への参加',        desc: 'Craliaが企画するクリエイター交流会に参加しよう。新しい仲間や仕事のきっかけが生まれます。' },
]

const ctaBtnCls = `
  inline-flex items-center justify-center
  h-[52px] px-8 min-w-[160px]
  rounded-[6px] bg-brand text-white
  text-[15px] font-medium no-underline
  hover:bg-brand-ink transition-colors duration-150
`.replace(/\s+/g, ' ').trim()

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)]">
      <SiteHeader />

      {/* Hero */}
      <section className="py-24 md:py-32 px-6 text-center">
        <div className="max-w-[720px] mx-auto flex flex-col items-center gap-6">
          <Badge tone="brand" variant="soft">クリエイターマッチング</Badge>

          <h1 className="text-[40px] md:text-[56px] font-bold leading-[1.15] tracking-[-0.02em]">
            すべてのクリエイターが<br />
            <span className="text-brand">つながる場所</span>
          </h1>

          <p className="text-base md:text-lg text-[var(--c-text-2)] max-w-[560px] leading-relaxed">
            VTuber・ボカロP・イラストレーター・動画編集者など、あらゆるクリエイターが集まるマッチングサービス。プロジェクトを立ち上げ、仲間を集め、創作活動を加速させましょう。
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            <Link href="/signup" className={ctaBtnCls}>
              無料で始める
            </Link>
            <Link
              href="/search"
              className="text-[15px] text-brand font-medium no-underline hover:underline"
            >
              &gt; クリエイターを探す
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-[1080px] mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-12">
            Craliaでできること
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: IconComp, title, desc }) => (
              <Card key={title} padded bordered className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
                  <IconComp size={18} aria-hidden />
                </div>
                <div>
                  <p className="text-[16px] font-semibold mb-1">{title}</p>
                  <p className="text-[14px] text-[var(--c-text-2)] leading-relaxed line-clamp-3">{desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-brand-soft text-center">
        <div className="max-w-[560px] mx-auto flex flex-col items-center gap-6">
          <h2 className="text-2xl md:text-3xl font-semibold">
            今すぐ始めましょう
          </h2>
          <p className="text-base text-[var(--c-text-2)]">
            登録は無料。プロフィールを作って創作の仲間を見つけましょう。
          </p>
          <Link href="/signup" className={ctaBtnCls}>
            無料登録
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
