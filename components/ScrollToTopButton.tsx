'use client'

import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'

interface Props {
  alwaysShow?: boolean
}

export default function ScrollToTopButton({ alwaysShow = false }: Props) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 200)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!alwaysShow && !scrolled) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="TOPに戻る"
      className="fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full
        bg-white border border-[var(--c-border-2)]
        flex items-center justify-center
        shadow-[0_4px_14px_rgba(11,21,48,0.10)]
        text-[rgb(var(--brand-rgb))]
        hover:bg-[rgb(var(--brand-rgb))] hover:text-white hover:border-transparent
        transition-colors"
    >
      <ChevronUp size={20} aria-hidden />
    </button>
  )
}
