'use client'

import { useTheme } from '@/lib/theme/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'ライトモードに切替' : 'ダークモードに切替'}
      title={isDark ? 'ライトモードに切替' : 'ダークモードに切替'}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: 9000,
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: isDark
          ? 'rgba(60,120,255,0.15)'
          : 'rgba(0,60,140,0.15)',
        border: isDark
          ? '1px solid rgba(60,120,255,0.35)'
          : '1px solid rgba(0,60,140,0.30)',
        fontSize: '20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        transition: 'background 0.2s, border-color 0.2s',
        boxShadow: isDark
          ? '0 2px 12px rgba(0,10,40,0.5)'
          : '0 2px 12px rgba(0,60,130,0.25)',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
