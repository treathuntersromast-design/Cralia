'use client'

import { CalendarClock, Info } from 'lucide-react'

interface Props {
  estimatedDate: string
  reason: string
}

export default function EstimatedDeadlineCard({ estimatedDate, reason }: Props) {
  const formatted = new Date(estimatedDate + 'T00:00:00').toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="rounded-card border border-[var(--c-border)] bg-[var(--c-surface)] p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock size={16} className="text-brand shrink-0" aria-hidden />
        <p className="text-[12px] font-bold text-[var(--c-text-3)] tracking-wider uppercase">
          想定完了日
        </p>
      </div>
      <p className="text-[22px] font-extrabold mb-2">{formatted}</p>
      <div className="flex items-start gap-1.5 text-[12px] text-[var(--c-text-3)]">
        <Info size={13} className="shrink-0 mt-0.5" aria-hidden />
        <span>{reason}</span>
      </div>
    </div>
  )
}
