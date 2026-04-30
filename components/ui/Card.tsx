/**
 * Card — コンテンツを包む汎用カード
 * @example
 * <Card padded bordered>内容</Card>
 * <Card as="a" href="/path" hoverable padded bordered>クリック可能カード</Card>
 */
import React from 'react'
import clsx from 'clsx'

interface CardProps {
  as?:       'div' | 'a'
  href?:     string
  padded?:   boolean
  bordered?:  boolean
  hoverable?: boolean
  className?: string
  children?:  React.ReactNode
  [key: string]: unknown
}

export function Card({
  as:        Tag     = 'div',
  padded   = false,
  bordered  = false,
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={clsx(
        'rounded-[10px] bg-[var(--c-surface)] transition-all duration-150',
        padded   && 'p-6',
        bordered  && 'border border-[var(--c-border-2)]',
        hoverable && 'cursor-pointer hover:shadow-[0_8px_24px_rgba(11,21,48,.10)] hover:-translate-y-0.5 transition-all duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}
