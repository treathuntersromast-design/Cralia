/**
 * Icon — lucide-react アイコンを名前文字列で呼び出すアダプタ
 * @example
 * <Icon name="Bell" />
 * <Icon name="Search" size={20} className="text-brand" />
 * <Icon name="AlertCircle" aria-label="警告" />
 */
import React from 'react'
import * as Lucide from 'lucide-react'
import type { LucideProps } from 'lucide-react'

interface IconProps extends Omit<LucideProps, 'ref'> {
  name:        string
  size?:       number
  'aria-label'?: string
}

export function Icon({
  name,
  size       = 18,
  'aria-label': ariaLabel,
  ...props
}: IconProps) {
  const LucideIcon = (Lucide as unknown as Record<string, React.ComponentType<LucideProps>>)[name]

  if (!LucideIcon) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Icon] lucide-react に "${name}" は存在しません`)
    }
    return null
  }

  return (
    <LucideIcon
      size={size}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      {...props}
    />
  )
}
