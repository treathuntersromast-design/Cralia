'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = ['楽曲', '動画', 'イラスト', 'ゲーム', 'ポッドキャスト', 'その他']

interface Role {
  role_name: string
  description: string
  is_owner_role: boolean
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(255,255,255,0.05)',
  color: '#f0eff8', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}

export default function CreateProjectPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [roles, setRoles] = useState<Role[]>([
    { role_name: '', description: '', is_owner_role: true },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--c-accent)', textDecoration: 'none' }}>
          Cralia
        </Link>
        <Link href="/projects" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← プロジェクト一覧へ</Link>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 32px' }}>プロジェクトを作成</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* タイトル */}
          <div>
            <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>
              プロジェクト名<span style={{ color: '#ff6b9d' }}>*</span>
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60}
              placeholder="例: ボカロオリジナル曲「〇〇」制作" style={inputStyle} />
            <p style={{ color: '#7c7b99', fontSize: '12px', marginTop: '4px' }}>{title.length}/60</p>
          </div>

          {/* カテゴリ */}
          <div>
            <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '8px' }}>カテゴリ</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(category === c ? '' : c)}
                  style={{
                    padding: '6px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                    border: category === c ? '2px solid #c77dff' : '1px solid rgba(255,255,255,0.15)',
                    background: category === c ? 'rgba(199,125,255,0.2)' : 'transparent',
                    color: category === c ? '#c77dff' : '#a9a8c0', fontWeight: category === c ? '700' : '400',
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 概要 */}
          <div>
            <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '6px' }}>概要</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1000}
              placeholder="プロジェクトの目的・背景・制作物の概要などを書いてください。"
              style={{ ...inputStyle, resize: 'vertical' }} />
            <p style={{ color: '#7c7b99', fontSize: '12px', marginTop: '4px' }}>{description.length}/1000</p>
          </div>

          {/* 役職 */}
          <div>
            <label style={{ display: 'block', color: '#a9a8c0', fontSize: '13px', marginBottom: '4px' }}>
              役職<span style={{ color: '#ff6b9d' }}>*</span>
            </label>
            <p style={{ color: '#7c7b99', fontSize: '12px', marginBottom: '12px' }}>
              「主催」チェックを付けた役職が自分のポジションです。募集したい役職も追加してください。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roles.map((r, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${r.is_owner_role ? 'rgba(199,125,255,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input value={r.role_name} onChange={(e) => updateRole(i, 'role_name', e.target.value)}
                      placeholder="例: ボーカル、イラストレーター" maxLength={40}
                      style={{ ...inputStyle, flex: 1 }} />
                    <button type="button" onClick={() => removeRole(i)}
                      disabled={roles.length <= 1}
                      style={{ background: 'none', border: 'none', color: '#ff6b9d', cursor: roles.length <= 1 ? 'not-allowed' : 'pointer', fontSize: '20px', padding: '0 4px', opacity: roles.length <= 1 ? 0.3 : 1 }}>
                      ×
                    </button>
                  </div>
                  <input value={r.description} onChange={(e) => updateRole(i, 'description', e.target.value)}
                    placeholder="役割の詳細（任意）" maxLength={100}
                    style={{ ...inputStyle, fontSize: '13px', marginBottom: '8px' }} />
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: r.is_owner_role ? '#c77dff' : '#a9a8c0' }}>
                    <input type="checkbox" checked={r.is_owner_role}
                      onChange={(e) => {
                        // 主催は1つだけ
                        setRoles((prev) => prev.map((role, j) => ({
                          ...role,
                          is_owner_role: j === i ? e.target.checked : e.target.checked ? false : role.is_owner_role,
                        })))
                      }}
                      style={{ accentColor: '#c77dff' }} />
                    主催（自分の役職）
                  </label>
                </div>
              ))}
            </div>
            {roles.length < 20 && (
              <button type="button" onClick={addRole}
                style={{ marginTop: '10px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px dashed rgba(199,125,255,0.3)', background: 'transparent', color: '#c77dff', fontSize: '13px', cursor: 'pointer' }}>
                ＋ 役職を追加
              </button>
            )}
          </div>

          {error && <p style={{ color: '#ff6b9d', fontSize: '13px', margin: 0 }}>{error}</p>}

          <button type="button" onClick={handleSubmit} disabled={loading}
            style={{
              padding: '14px', borderRadius: '14px', border: 'none',
              background: loading ? 'rgba(199,125,255,0.3)' : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
              color: '#fff', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
            }}>
            {loading ? '作成中...' : 'プロジェクトを作成する'}
          </button>
        </div>
      </div>
    </div>
  )
}
