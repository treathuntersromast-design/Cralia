'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search, Briefcase, FolderKanban, MessageCircle,
  Megaphone, Handshake, Bell, Users, ChevronDown, ChevronUp,
  type LucideIcon,
} from 'lucide-react'

type QA = { href: string; icon: LucideIcon; label: string }

const primaryActions: QA[] = [
  { href: '/search',   icon: Search,        label: 'クリエイターを探す' },
  { href: '/jobs',     icon: Briefcase,     label: '案件を探す'         },
  { href: '/projects', icon: FolderKanban,  label: 'マイプロジェクト'   },
  { href: '/messages', icon: MessageCircle, label: 'メッセージ'         },
]

function buildMoreActions(unreadCount: number): QA[] {
  return [
    { href: '/clients',       icon: Megaphone, label: 'お仕事募集中の依頼者' },
    { href: '/jobs/new',      icon: Megaphone, label: 'クリエイターを募集'   },
    { href: '/orders',        icon: Handshake, label: '依頼管理'             },
    { href: '/notifications', icon: Bell,      label: unreadCount > 0 ? `通知 (${unreadCount})` : '通知' },
    { href: '/events',        icon: Users,     label: '交流会'               },
  ]
}

const actionLinkCls = `
  flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px]
  border border-[var(--c-border)] bg-white
  text-[13.5px] font-semibold text-[var(--c-text)] no-underline
  hover:bg-[var(--c-surface-3)] transition-colors
`.replace(/\s+/g, ' ').trim()

interface QuickActionsProps {
  unreadCount?: number
}

export function QuickActions({ unreadCount = 0 }: QuickActionsProps) {
  const [showMore, setShowMore] = useState(false)
  const moreActions = buildMoreActions(unreadCount)

  return (
    <section>
      <h2 className="text-[11px] font-bold tracking-[0.1em] text-[var(--c-text-3)] uppercase mb-3">
        クイックアクション
      </h2>

      <div className="grid grid-cols-1 gap-1.5">
        {primaryActions.map(({ href, icon: IconComp, label }) => (
          <Link key={href} href={href} className={actionLinkCls}>
            <IconComp size={16} className="text-[var(--c-text-3)] shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>

      {showMore && (
        <div className="grid grid-cols-1 gap-1.5 mt-1.5 pt-1.5 border-t border-[var(--c-border)]">
          {moreActions.map(({ href, icon: IconComp, label }) => (
            <Link key={href} href={href} className={actionLinkCls}>
              <IconComp size={16} className="text-[var(--c-text-3)] shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMore(!showMore)}
        className="w-full mt-2 py-2 text-[12px] text-[var(--c-text-3)] hover:text-brand transition-colors flex items-center justify-center gap-1"
      >
        {showMore ? '閉じる' : 'その他のメニュー'}
        {showMore
          ? <ChevronUp size={12} aria-hidden />
          : <ChevronDown size={12} aria-hidden />
        }
      </button>
    </section>
  )
}
