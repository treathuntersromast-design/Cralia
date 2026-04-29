/**
 * ErrorState — データ取得失敗・エラー発生時の表示
 * @example
 * <ErrorState title="読み込みに失敗しました" action={<Button onClick={retry}>再試行</Button>} />
 */
import React from 'react'
import clsx from 'clsx'
import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  title?:       string
  description?: string
  action?:      React.ReactNode
  className?:   string
}

export function ErrorState({
  title       = 'エラーが発生しました',
  description = '時間をおいて再度お試しください',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center py-20 px-6',
        className,
      )}
      role="alert"
    >
      <AlertCircle
        size={48}
        className="text-[#dc2626] mb-5"
        aria-hidden="true"
      />
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
