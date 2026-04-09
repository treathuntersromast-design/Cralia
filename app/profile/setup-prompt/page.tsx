'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DRAFT_KEY = 'Cralia_setup_draft'

export default function SetupPromptPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      setHasDraft(!!saved)
    } catch {
      setHasDraft(false)
    }
    setReady(true)
  }, [])

  const handleYes = () => {
    router.push('/profile/setup')
  }

  const handleNo = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      }} />
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: 'rgba(22,22,31,0.98)',
        border: '1px solid rgba(199,125,255,0.3)',
        borderRadius: '24px',
        padding: '40px 36px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 8px 40px rgba(199,125,255,0.15)',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '28px', fontWeight: '800',
          background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          margin: '0 0 28px',
        }}>
          Cralia
        </h1>

        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>

        {hasDraft ? (
          <>
            <h2 style={{ color: '#f0eff8', fontSize: '18px', fontWeight: '700', margin: '0 0 12px', lineHeight: '1.5' }}>
              入力途中の情報があります
            </h2>
            <p style={{ color: '#a9a8c0', fontSize: '14px', lineHeight: '1.8', margin: '0 0 32px' }}>
              セットアップページに入力途中の情報が<br />
              保存されています。<br />
              続きから記載しますか？
            </p>
          </>
        ) : (
          <>
            <h2 style={{ color: '#f0eff8', fontSize: '18px', fontWeight: '700', margin: '0 0 12px', lineHeight: '1.5' }}>
              プロフィールの設定が完了していません
            </h2>
            <p style={{ color: '#a9a8c0', fontSize: '14px', lineHeight: '1.8', margin: '0 0 32px' }}>
              Cralia を利用するには<br />
              プロフィールの設定が必要です。<br />
              今すぐ設定しますか？
            </p>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleYes}
            style={{
              width: '100%', padding: '14px',
              borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
              color: '#fff', fontSize: '15px', fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            {hasDraft ? 'はい、続きから入力する' : 'はい、設定する'}
          </button>
          <button
            onClick={handleNo}
            style={{
              width: '100%', padding: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: '#a9a8c0', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            いいえ、ログインページへ戻る
          </button>
        </div>
      </div>
    </div>
  )
}
