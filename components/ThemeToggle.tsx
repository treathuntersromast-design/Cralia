'use client'

import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTheme } from '@/lib/theme/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="min-w-0 px-2.5"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </Button>
  )
}
