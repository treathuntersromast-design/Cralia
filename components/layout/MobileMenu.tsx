'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, Settings, Sun, Moon, LogOut, ShieldCheck, LayoutDashboard } from 'lucide-react'
import { useTheme } from '@/lib/theme/ThemeContext'
import { createClient } from '@/lib/supabase/client'

interface Props {
  isLoggedIn?: boolean
  isAdminUser?: boolean
  isDashboard?: boolean
}

export function MobileMenu({ isLoggedIn = false, isAdminUser = false, isDashboard = false }: Props) {
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="md:hidden relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
        aria-expanded={open}
        className="w-11 h-11 rounded-[8px] flex items-center justify-center text-[var(--c-text-2)] hover:bg-[var(--c-accent-a06)] hover:text-brand transition-colors"
      >
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 c-card-float rounded-[12px] py-2 z-40">
          {isLoggedIn && !isDashboard && (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[var(--c-text)] no-underline hover:bg-[var(--c-surface-3)] transition-colors"
            >
              <LayoutDashboard size={16} aria-hidden /> ダッシュボード
            </Link>
          )}
          {isLoggedIn && isAdminUser && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[var(--c-text)] no-underline hover:bg-[var(--c-surface-3)] transition-colors"
            >
              <ShieldCheck size={16} aria-hidden /> 管理者メニュー
            </Link>
          )}
          {isLoggedIn && (
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[var(--c-text)] no-underline hover:bg-[var(--c-surface-3)] transition-colors"
            >
              <Settings size={16} aria-hidden /> 設定
            </Link>
          )}
          <button
            type="button"
            onClick={() => { toggle(); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[var(--c-text)] bg-transparent border-0 cursor-pointer hover:bg-[var(--c-surface-3)] transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
            {theme === 'dark' ? 'ライトモード' : 'ダークモード'}
          </button>
          {!isLoggedIn ? (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[var(--c-text)] no-underline hover:bg-[var(--c-surface-3)] transition-colors border-t border-[var(--c-border)] mt-1 pt-3"
            >
              ログイン
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#dc2626] bg-transparent border-0 cursor-pointer hover:bg-[#dc2626]/10 transition-colors border-t border-[var(--c-border)] mt-1 pt-3"
            >
              <LogOut size={16} aria-hidden /> ログアウト
            </button>
          )}
        </div>
      )}
    </div>
  )
}
