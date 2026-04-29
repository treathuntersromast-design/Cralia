/**
 * Badge — ステータスや属性を示す小型ラベル
 * @example
 * <Badge tone="ok" variant="soft">完了</Badge>
 * <Badge tone="warn" variant="outline">審査中</Badge>
 * <Badge tone="brand" variant="solid">新着</Badge>
 */
import React from 'react'
import clsx from 'clsx'

type Tone    = 'brand' | 'ok' | 'warn' | 'danger' | 'neutral'
type Variant = 'solid' | 'soft' | 'outline'

interface BadgeProps {
  tone?:      Tone
  variant?:   Variant
  className?: string
  children?:  React.ReactNode
}

const palette: Record<Tone, Record<Variant, string>> = {
  brand: {
    solid:   'bg-brand text-white',
    soft:    'bg-brand/10 text-brand',
    outline: 'border border-brand/40 text-brand bg-transparent',
  },
  ok: {
    solid:   'bg-[#16a34a] text-white',
    soft:    'bg-[#16a34a]/10 text-[#15803d]',
    outline: 'border border-[#16a34a]/40 text-[#15803d] bg-transparent',
  },
  warn: {
    solid:   'bg-[#d97706] text-white',
    soft:    'bg-[#d97706]/10 text-[#b45309]',
    outline: 'border border-[#d97706]/40 text-[#b45309] bg-transparent',
  },
  danger: {
    solid:   'bg-[#dc2626] text-white',
    soft:    'bg-[#dc2626]/10 text-[#b91c1c]',
    outline: 'border border-[#dc2626]/40 text-[#b91c1c] bg-transparent',
  },
  neutral: {
    solid:   'bg-[var(--c-text-3)] text-white',
    soft:    'bg-[var(--c-surface-3)] text-[var(--c-text-2)]',
    outline: 'border border-[var(--c-border-3)] text-[var(--c-text-3)] bg-transparent',
  },
}

export function Badge({
  tone    = 'neutral',
  variant = 'soft',
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center text-[12px] font-semibold px-[10px] py-[3px] rounded-full',
        palette[tone][variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
