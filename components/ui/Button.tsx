/**
 * Button — 汎用ボタン
 * @example
 * <Button variant="primary" size="md" loading={isSubmitting}>保存</Button>
 * <Button variant="secondary" leftIcon={<Plus size={16} />}>追加</Button>
 * <Button variant="danger" size="sm">削除</Button>
 */
'use client'

import React from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant
  size?:      Size
  loading?:   boolean
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-[rgb(var(--brand-rgb))] text-white hover:bg-[rgb(var(--brand-ink-rgb))] border-transparent',
  secondary: 'bg-white text-[rgb(var(--brand-rgb))] border-[rgb(var(--brand-rgb)/0.30)] hover:border-[rgb(var(--brand-rgb))] hover:bg-[rgb(var(--brand-rgb)/0.05)]',
  ghost:     'bg-transparent text-[var(--c-text-2)] border-transparent hover:bg-[var(--c-accent-a06)] hover:text-[rgb(var(--brand-rgb))]',
  danger:    'bg-[#dc2626] text-white border-transparent hover:bg-[#b91c1c]',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9     text-[13px] px-3.5 gap-1.5',
  md: 'h-11    text-[14px] px-5   gap-2   min-w-[112px]',
  lg: 'h-[52px] text-[15px] px-7   gap-2.5 min-w-[160px]',
}

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center min-w-[88px] rounded-[6px] border font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgb(var(--brand-rgb)/0.28)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children && <span>{children}</span>}
      {!loading && rightIcon}
    </button>
  )
}
