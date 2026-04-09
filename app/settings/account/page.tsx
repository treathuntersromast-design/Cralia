'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
  color: '#f0eff8', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
}

export default function AccountSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null)

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setEmailLoading(true)
    setEmailMsg(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    if (error) {
      setEmailMsg({ type: 'error', text: error.message })
    } else {
      setEmailMsg({ type: 'success', text: '確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。' })
      setNewEmail('')
    }
    setEmailLoading(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPw || newPw.length < 8) {
      setPwMsg({ type: 'error', text: 'パスワードは8文字以上にしてください' })
      return
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: '新しいパスワードが一致しません' })
      return
    }
    // 連続した文字や単純すぎるパスワードの基本チェック
    if (/^(.)\1+$/.test(newPw)) {
      setPwMsg({ type: 'error', text: 'セキュリティのため、同じ文字の繰り返しは使えません' })
      return
    }
    setPwLoading(true)
    setPwMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      setPwMsg({ type: 'error', text: error.message })
    } else {
      setPwMsg({ type: 'success', text: 'パスワードを変更しました' })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    }
    setPwLoading(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleteLoading(true)
    setDeleteMsg(null)
    try {
      const res = await fetch('/api/settings/account/delete', { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        setDeleteMsg(d.error ?? '削除に失敗しました')
        setDeleteLoading(false)
        return
      }
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      setDeleteMsg('削除に失敗しました。再度お試しください。')
      setDeleteLoading(false)
    }
  }

  const sectionStyle: React.CSSProperties = {
    background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '20px', padding: '28px', marginBottom: '20px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          Cralia
        </Link>
        <Link href="/settings" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← 設定へ</Link>
      </div>

      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 32px' }}>アカウント設定</h1>

        {/* メールアドレス変更 */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 20px' }}>メールアドレスの変更</h2>
          <form onSubmit={handleEmailChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>新しいメールアドレス</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com" required style={inputStyle} />
            </div>
            {emailMsg && (
              <p style={{ fontSize: '13px', margin: 0, color: emailMsg.type === 'success' ? '#4ade80' : '#f87171', background: emailMsg.type === 'success' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${emailMsg.type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                {emailMsg.text}
              </p>
            )}
            <button type="submit" disabled={emailLoading}
              style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: emailLoading ? 'not-allowed' : 'pointer', opacity: emailLoading ? 0.7 : 1 }}>
              {emailLoading ? '送信中...' : '確認メールを送信'}
            </button>
          </form>
        </div>

        {/* パスワード変更 */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 20px' }}>パスワードの変更</h2>
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>新しいパスワード（8文字以上）</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••••" minLength={8} required style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>新しいパスワード（確認）</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••" required style={inputStyle} />
            </div>
            {pwMsg && (
              <p style={{ fontSize: '13px', margin: 0, color: pwMsg.type === 'success' ? '#4ade80' : '#f87171', background: pwMsg.type === 'success' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${pwMsg.type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                {pwMsg.text}
              </p>
            )}
            <button type="submit" disabled={pwLoading}
              style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: pwLoading ? 'not-allowed' : 'pointer', opacity: pwLoading ? 0.7 : 1 }}>
              {pwLoading ? '変更中...' : 'パスワードを変更'}
            </button>
          </form>
        </div>

        {/* 危険ゾーン */}
        <div id="danger" style={{ ...sectionStyle, border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)', marginBottom: 0 }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px', color: '#f87171' }}>アカウントを削除する</h2>
          <p style={{ color: '#a9a8c0', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.6' }}>
            アカウントを削除すると、プロフィール・ポートフォリオ・プロジェクトなど全てのデータが完全に削除されます。この操作は取り消せません。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>
                確認のため「<strong style={{ color: '#f87171' }}>DELETE</strong>」と入力してください
              </label>
              <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE" style={{ ...inputStyle, border: '1px solid rgba(248,113,113,0.3)' }} />
            </div>
            {deleteMsg && <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{deleteMsg}</p>}
            <button onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleteLoading}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.4)', background: deleteConfirm === 'DELETE' ? 'rgba(248,113,113,0.15)' : 'transparent', color: '#f87171', fontSize: '14px', fontWeight: '700', cursor: deleteConfirm !== 'DELETE' || deleteLoading ? 'not-allowed' : 'pointer', opacity: deleteConfirm !== 'DELETE' ? 0.4 : 1 }}>
              {deleteLoading ? '削除中...' : 'アカウントを完全に削除する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
