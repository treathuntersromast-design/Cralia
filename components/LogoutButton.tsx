'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(0,1,255,0.25)',
        background: 'rgba(0,1,255,0.06)',
        color: '#0001ff',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
      }}
    >
      ログアウト
    </button>
  )
}
