import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'

interface SettingRowProps {
  href: string
  icon: LucideIcon
  title: string
  desc: string
}

export function SettingRow({ href, icon: Icon, title, desc }: SettingRowProps) {
  return (
    <Link href={href} className="no-underline text-[var(--c-text)]">
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-card p-5 flex items-center gap-4 hover:border-brand transition-colors">
        <div className="w-11 h-11 rounded-[12px] bg-brand-soft text-brand flex items-center justify-center shrink-0">
          <Icon size={20} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] mb-0.5">{title}</p>
          <p className="text-[13px] text-[var(--c-text-3)]">{desc}</p>
        </div>
        <ChevronRight size={16} className="text-[var(--c-text-4)] shrink-0" aria-hidden />
      </div>
    </Link>
  )
}
