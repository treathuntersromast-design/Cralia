/**
 * Container — コンテンツ幅を制限する中央寄せラッパ
 * @example
 * <Container>デフォルト 1080px</Container>
 * <Container size="sm">狭いレイアウト 720px</Container>
 * <Container size="lg">ワイドレイアウト 1280px</Container>
 */
import React from 'react'
import clsx from 'clsx'

type Size = 'sm' | 'md' | 'lg'

interface ContainerProps {
  size?:      Size
  className?: string
  children?:  React.ReactNode
}

const maxWidths: Record<Size, string> = {
  sm: 'max-w-[720px]',
  md: 'max-w-[1080px]',
  lg: 'max-w-[1280px]',
}

export function Container({
  size      = 'md',
  className,
  children,
}: ContainerProps) {
  return (
    <div
      className={clsx(
        'mx-auto w-full px-6 md:px-8',
        maxWidths[size],
        className,
      )}
    >
      {children}
    </div>
  )
}
