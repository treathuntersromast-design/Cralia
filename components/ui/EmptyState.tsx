/**
 * EmptyState — データがない状態を示す中央寄せUI
 * @example
 * <EmptyState
 *   icon={Inbox}
 *   title="メッセージがありません"
 *   description="最初のメッセージを送ってみましょう"
 *   action={<Button variant="primary">メッセージを送る</Button>}
 * />
 */
import React from 'react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?:        LucideIcon
  title:        string
  description?: string
  action?:      React.ReactNode
  className?:   string
}

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center py-20 px-6',
        className,
      )}
    >
      {IconComponent && (
        <IconComponent
          size={48}
          className="text-[var(--c-text-4)] mb-5"
          aria-hidden="true"
        />
      )}
      <p className="text-[16px] font-semibold text-[var(--c-text-2)] mb-2">{title}</p>
      {description && (
        <p className="text-[14px] text-[var(--c-text-3)] max-w-[360px] leading-relaxed mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
