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
        border: '1px solid rgba(255,107,157,0.3)',
        background: 'rgba(255,107,157,0.08)',
        color: '#ff6b9d',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
      }}
    >
      ログアウト
    </button>
  )
}
