'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const inputCls = 'w-full h-11 px-3.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[15px] outline-none focus:border-brand transition'

export default function AccountSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [newEmail, setNewEmail]       = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newPw, setNewPw]             = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [pwLoading, setPwLoading]     = useState(false)
  const [pwMsg, setPwMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg, setDeleteMsg]     = useState<string | null>(null)

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

  const msgCls = (type: 'success' | 'error') =>
    type === 'success'
      ? 'text-[13px] text-[#16a34a] bg-[#4ade80]/8 border border-[#4ade80]/25 rounded-[8px] px-3.5 py-2.5'
      : 'text-[13px] text-[#dc2626] bg-[#dc2626]/8 border border-[#dc2626]/25 rounded-[8px] px-3.5 py-2.5'

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <h1 className="text-[26px] font-bold mb-8">アカウント設定</h1>

        {/* メールアドレス変更 */}
        <Card bordered padded className="mb-5">
          <h2 className="text-[16px] font-bold mb-5">メールアドレスの変更</h2>
          <form onSubmit={handleEmailChange} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">新しいメールアドレス</label>
              <input
                type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com" required className={inputCls}
              />
            </div>
            {emailMsg && <p className={msgCls(emailMsg.type)}>{emailMsg.text}</p>}
            <Button type="submit" variant="primary" loading={emailLoading} className="w-full">
              確認メールを送信
            </Button>
          </form>
        </Card>

        {/* パスワード変更 */}
        <Card bordered padded className="mb-5">
          <h2 className="text-[16px] font-bold mb-5">パスワードの変更</h2>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">新しいパスワード（8文字以上）</label>
              <input
                type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••••" minLength={8} required className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">新しいパスワード（確認）</label>
              <input
                type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••" required className={inputCls}
              />
            </div>
            {pwMsg && <p className={msgCls(pwMsg.type)}>{pwMsg.text}</p>}
            <Button type="submit" variant="primary" loading={pwLoading} className="w-full">
              パスワードを変更
            </Button>
          </form>
        </Card>

        {/* 危険ゾーン */}
        <div id="danger" className="border border-[#dc2626]/25 bg-[#dc2626]/4 rounded-card p-7">
          <h2 className="text-[16px] font-bold text-[#dc2626] mb-2">アカウントを削除する</h2>
          <p className="text-[13px] text-[var(--c-text-2)] leading-[1.6] mb-5">
            アカウントを削除すると、プロフィール・ポートフォリオ・プロジェクトなど全てのデータが完全に削除されます。この操作は取り消せません。
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">
                確認のため「<strong className="text-[#dc2626]">DELETE</strong>」と入力してください
              </label>
              <input
                type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full h-11 px-3.5 rounded-input border border-[#dc2626]/30 bg-[var(--c-input-bg)] text-[var(--c-text)] text-[15px] outline-none focus:border-[#dc2626] transition"
              />
            </div>
            {deleteMsg && <p className="text-[#dc2626] text-[13px]">{deleteMsg}</p>}
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleteLoading}
              className="h-11 rounded-[8px] border border-[#dc2626]/40 bg-transparent text-[#dc2626] text-[14px] font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#dc2626]/8 transition-colors"
            >
              {deleteLoading ? '削除中...' : 'アカウントを完全に削除する'}
            </button>
          </div>
        </div>
      </Container>
    </div>
  )
}
