'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileEdit } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

const DRAFT_KEY = 'Cralia_setup_draft'

export default function SetupPromptPage() {
  const router = useRouter()
  const [ready,    setReady]    = useState(false)
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
    return <div className="min-h-screen c-app-bg-tint" />
  }

  return (
    <div className="min-h-screen c-app-bg-tint flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-brand no-underline">
            Cralia
          </Link>
        </div>

        <div className="c-card-float rounded-[20px] p-8 sm:p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--brand-soft)] text-[rgb(var(--brand-rgb))] mx-auto mb-5 flex items-center justify-center">
            <FileEdit size={26} aria-hidden />
          </div>

          {hasDraft ? (
            <>
              <h1 className="text-[20px] font-bold text-[var(--c-text)] mb-2">
                入力途中の情報があります
              </h1>
              <p className="text-[13.5px] text-[var(--c-text-2)] leading-relaxed mb-7">
                セットアップページに入力途中の情報が保存されています。<br />
                続きから記入しますか？
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[20px] font-bold text-[var(--c-text)] mb-2">
                プロフィールの設定が完了していません
              </h1>
              <p className="text-[13.5px] text-[var(--c-text-2)] leading-relaxed mb-7">
                Cralia を利用するにはプロフィールの設定が必要です。<br />
                今すぐ設定しますか？
              </p>
            </>
          )}

          <div className="flex flex-col gap-2.5">
            <Button variant="primary" size="lg" className="w-full" onClick={handleYes}>
              {hasDraft ? 'はい、続きから入力する' : 'はい、設定する'}
            </Button>
            <Button variant="ghost" size="lg" className="w-full" onClick={handleNo}>
              いいえ、ログインページへ戻る
            </Button>
          </div>
        </div>

        <p className="text-center mt-6 text-[12px] text-[var(--c-text-3)]">
          &copy; {new Date().getFullYear()} Cralia
        </p>
      </div>
    </div>
  )
}
