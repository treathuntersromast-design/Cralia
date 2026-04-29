/**
 * Skeleton — ローディング中のプレースホルダー
 * @example
 * <Skeleton className="h-5 w-3/4" />
 * <SkeletonCard />
 * <SkeletonText lines={3} />
 */
import React from 'react'
import clsx from 'clsx'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-[6px] bg-[var(--c-border-2)]',
        className,
      )}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'rounded-card border border-[var(--c-border)] bg-[var(--c-surface)] p-5 flex flex-col gap-3',
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={clsx('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="animate-pulse rounded-full bg-[var(--c-border-2)] shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
