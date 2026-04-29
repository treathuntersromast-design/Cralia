'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const CATEGORIES = ['楽曲', '動画', 'イラスト', 'ゲーム', 'ポッドキャスト', 'その他']

interface Role {
  role_name: string
  description: string
  is_owner_role: boolean
}

const inputCls = 'w-full h-10 px-3.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition'

export default function CreateProjectPage() {
  const router = useRouter()
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [category,    setCategory]    = useState('')
  const [roles,       setRoles]       = useState<Role[]>([
    { role_name: '', description: '', is_owner_role: true },
  ])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const addRole = () => {
    if (roles.length >= 20) return
    setRoles((prev) => [...prev, { role_name: '', description: '', is_owner_role: false }])
  }

  const updateRole = (i: number, field: keyof Role, value: string | boolean) => {
    setRoles((prev) => { const next = [...prev]; next[i] = { ...next[i], [field]: value }; return next })
  }

  const removeRole = (i: number) => {
    setRoles((prev) => prev.filter((_, j) => j !== i))
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('タイトルを入力してください'); return }
    if (roles.some((r) => !r.role_name.trim())) { setError('すべての役職名を入力してください'); return }
    if (!roles.some((r) => r.is_owner_role)) { setError('主催の役職を1つ選択してください'); return }
    if (roles.filter((r) => r.is_owner_role).length > 1) { setError('主催の役職は1つだけ選択してください'); return }

    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, roles }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '作成に失敗しました')
      router.push(`/projects/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <h1 className="text-[26px] font-bold mb-8">プロジェクトを作成</h1>

        <div className="flex flex-col gap-6">
          {/* タイトル */}
          <div>
            <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">
              プロジェクト名<span className="text-[#dc2626]">*</span>
            </label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60}
              placeholder="例: ボカロオリジナル曲「〇〇」制作" className={inputCls}
            />
            <p className="text-[12px] text-[var(--c-text-4)] mt-1 text-right">{title.length}/60</p>
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-[13px] text-[var(--c-text-2)] mb-2">カテゴリ</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(category === c ? '' : c)}
                  className={`px-4 py-1.5 rounded-full text-[13px] transition-colors ${
                    category === c
                      ? 'border-2 border-brand bg-brand-soft text-brand font-bold'
                      : 'border border-[var(--c-border)] text-[var(--c-text-3)] hover:bg-[var(--c-surface)]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 概要 */}
          <div>
            <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">概要</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1000}
              placeholder="プロジェクトの目的・背景・制作物の概要などを書いてください。"
              className="w-full px-3.5 py-2.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[14px] outline-none focus:border-brand transition resize-y leading-[1.6]"
            />
            <p className="text-[12px] text-[var(--c-text-4)] mt-1 text-right">{description.length}/1000</p>
          </div>

          {/* 役職 */}
          <div>
            <label className="block text-[13px] text-[var(--c-text-2)] mb-1">
              役職<span className="text-[#dc2626]">*</span>
            </label>
            <p className="text-[12px] text-[var(--c-text-3)] mb-3">
              「主催」チェックを付けた役職が自分のポジションです。募集したい役職も追加してください。
            </p>
            <div className="flex flex-col gap-2.5">
              {roles.map((r, i) => (
                <div
                  key={i}
                  className={`border rounded-[12px] p-4 ${r.is_owner_role ? 'border-brand/40 bg-brand-soft' : 'border-[var(--c-border)] bg-[var(--c-surface)]'}`}
                >
                  <div className="flex gap-2 mb-2 items-center">
                    <input
                      value={r.role_name} onChange={(e) => updateRole(i, 'role_name', e.target.value)}
                      placeholder="例: ボーカル、イラストレーター" maxLength={40}
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeRole(i)}
                      disabled={roles.length <= 1}
                      className="text-[#dc2626] bg-transparent border-none cursor-pointer text-[20px] px-1 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <input
                    value={r.description} onChange={(e) => updateRole(i, 'description', e.target.value)}
                    placeholder="役割の詳細（任意）" maxLength={100}
                    className={`${inputCls} text-[13px] mb-2`}
                  />
                  <label className={`inline-flex items-center gap-1.5 cursor-pointer text-[13px] ${r.is_owner_role ? 'text-brand font-semibold' : 'text-[var(--c-text-3)]'}`}>
                    <input
                      type="checkbox"
                      checked={r.is_owner_role}
                      onChange={(e) => {
                        setRoles((prev) => prev.map((role, j) => ({
                          ...role,
                          is_owner_role: j === i ? e.target.checked : e.target.checked ? false : role.is_owner_role,
                        })))
                      }}
                      className="accent-brand w-4 h-4"
                    />
                    主催（自分の役職）
                  </label>
                </div>
              ))}
            </div>
            {roles.length < 20 && (
              <button
                type="button"
                onClick={addRole}
                className="mt-2.5 w-full h-10 rounded-[8px] border border-dashed border-brand/30 bg-transparent text-brand text-[13px] font-semibold cursor-pointer hover:bg-brand-soft transition-colors"
              >
                ＋ 役職を追加
              </button>
            )}
          </div>

          {error && (
            <p className="text-[13px] text-[#dc2626] bg-[#dc2626]/8 border border-[#dc2626]/25 rounded-[8px] px-3.5 py-2.5">
              {error}
            </p>
          )}

          <Button type="button" variant="primary" size="lg" loading={loading} onClick={handleSubmit} className="w-full">
            プロジェクトを作成する
          </Button>
        </div>
      </Container>
    </div>
  )
}
