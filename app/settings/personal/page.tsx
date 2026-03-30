'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  color: '#f0eff8',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#a9a8c0',
  fontSize: '13px',
  marginBottom: '6px',
}

const hintStyle: React.CSSProperties = {
  color: '#7c7b99',
  fontSize: '12px',
  marginTop: '4px',
}

export default function PersonalInfoPage() {
  const [form, setForm] = useState({
    realName: '',
    companyName: '',
    postalCode: '',
    prefecture: '',
    address: '',
    phoneNumber: '',
  })
  const [entityType, setEntityType] = useState<'individual' | 'corporate'>('individual')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const isCorporate = entityType === 'corporate'

  useEffect(() => {
    fetch('/api/settings/personal')
      .then((r) => r.json())
      .then(({ data, entityType: et }) => {
        if (et) setEntityType(et)
        if (data) {
          setForm({
            realName: data.real_name ?? '',
            companyName: data.company_name ?? '',
            postalCode: data.postal_code ?? '',
            prefecture: data.prefecture ?? '',
            address: data.address ?? '',
            phoneNumber: data.phone_number ?? '',
          })
          setAgreed(true)
        }
      })
      .finally(() => setFetching(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) {
      setError('プライバシーポリシーへの同意が必要です')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)

    const res = await fetch('/api/settings/personal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? '保存に失敗しました')
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  const handlePostalCode = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 7)
    const formatted = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits
    setForm((f) => ({ ...f, postalCode: formatted }))
  }

  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#7c7b99' }}>読み込み中...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      padding: '48px 24px',
    }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/dashboard" style={{ color: '#c77dff', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
            ← ダッシュボードへ戻る
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#f0eff8', marginBottom: '8px' }}>
            個人情報の登録
          </h1>
          <p style={{ color: '#7c7b99', fontSize: '14px', lineHeight: '1.7' }}>
            ここで登録した情報は取引・決済・本人確認の目的のみに使用されます。他のユーザーには公開されません。
          </p>
        </div>

        {/* 必須タイミングの案内バナー */}
        <div style={{
          padding: '14px 16px',
          background: 'rgba(255,200,80,0.08)',
          border: '1px solid rgba(255,200,80,0.25)',
          borderRadius: '10px',
          marginBottom: '24px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
          <p style={{ color: '#f0d080', fontSize: '13px', lineHeight: '1.7', margin: 0 }}>
            有償依頼の受発注を行う場合、氏名・住所・電話番号の登録が必須となります。事前にご登録いただくとスムーズに取引を開始できます。
          </p>
        </div>

        {/* フォーム */}
        <div style={{
          background: 'rgba(22, 22, 31, 0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* 法人の場合: 会社名 */}
            {isCorporate && (
              <div>
                <label style={labelStyle}>
                  会社名・団体名
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="株式会社〇〇 / △△サークル"
                  maxLength={100}
                  style={inputStyle}
                />
                <p style={hintStyle}>法人・団体として登録されています。正式名称を入力してください。</p>
              </div>
            )}

            {/* 氏名 */}
            <div>
              <label style={labelStyle}>
                {isCorporate ? '担当者氏名' : '氏名'}
                <span style={{ color: '#ff6b9d', marginLeft: '4px', fontSize: '11px' }}>（有償取引時に必須）</span>
              </label>
              <input
                type="text"
                value={form.realName}
                onChange={(e) => setForm((f) => ({ ...f, realName: e.target.value }))}
                placeholder="山田 太郎"
                maxLength={50}
                style={inputStyle}
              />
              <p style={hintStyle}>本名を入力してください。取引の本人確認に使用します。</p>
            </div>

            {/* 電話番号 */}
            <div>
              <label style={labelStyle}>
                電話番号
                <span style={{ color: '#ff6b9d', marginLeft: '4px', fontSize: '11px' }}>（有償取引時に必須）</span>
              </label>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="090-1234-5678"
                maxLength={15}
                style={inputStyle}
              />
              <p style={hintStyle}>本人確認のために使用します。他のユーザーには公開されません。</p>
            </div>

            {/* 郵便番号 */}
            <div>
              <label style={labelStyle}>
                郵便番号
                <span style={{ color: '#ff6b9d', marginLeft: '4px', fontSize: '11px' }}>（有償取引時に必須）</span>
              </label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => handlePostalCode(e.target.value)}
                placeholder="123-4567"
                style={{ ...inputStyle, maxWidth: '200px' }}
              />
            </div>

            {/* 都道府県 */}
            <div>
              <label style={labelStyle}>都道府県</label>
              <select
                value={form.prefecture}
                onChange={(e) => setForm((f) => ({ ...f, prefecture: e.target.value }))}
                style={{ ...inputStyle, maxWidth: '200px' }}
              >
                <option value="" style={{ color: '#000', background: '#fff' }}>選択してください</option>
                {PREFECTURES.map((p) => (
                  <option key={p} value={p} style={{ color: '#000', background: '#fff' }}>{p}</option>
                ))}
              </select>
            </div>

            {/* 住所（市区町村以降） */}
            <div>
              <label style={labelStyle}>住所（市区町村・番地・建物名）</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="渋谷区〇〇町1-2-3 △△ビル 101号室"
                maxLength={200}
                style={inputStyle}
              />
            </div>

            {/* プライバシーポリシー同意 */}
            <div style={{
              padding: '16px',
              background: 'rgba(199,125,255,0.06)',
              border: '1px solid rgba(199,125,255,0.2)',
              borderRadius: '10px',
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: '#c77dff', width: '16px', height: '16px', flexShrink: 0 }}
                />
                <span style={{ color: '#c0bdd8', fontSize: '13px', lineHeight: '1.7' }}>
                  <Link href="/privacy" target="_blank" style={{ color: '#c77dff', textDecoration: 'underline' }}>
                    プライバシーポリシー
                  </Link>
                  を読み、個人情報の取り扱いに同意します。
                </span>
              </label>
            </div>

            {/* エラー */}
            {error && (
              <p style={{
                color: '#ff6b9d',
                fontSize: '13px',
                background: 'rgba(255,107,157,0.1)',
                border: '1px solid rgba(255,107,157,0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                margin: 0,
              }}>
                {error}
              </p>
            )}

            {/* 成功 */}
            {success && (
              <p style={{
                color: '#4ade80',
                fontSize: '13px',
                background: 'rgba(74,222,128,0.1)',
                border: '1px solid rgba(74,222,128,0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                margin: 0,
              }}>
                保存しました。
              </p>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading || !agreed}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: loading || !agreed
                  ? 'rgba(199,125,255,0.3)'
                  : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading || !agreed ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading ? '保存中...' : '保存する'}
            </button>
          </form>
        </div>

        {/* 注意事項 */}
        <p style={{ color: '#7c7b99', fontSize: '12px', textAlign: 'center', marginTop: '20px', lineHeight: '1.7' }}>
          ご登録いただいた個人情報は暗号化されて保存されます。<br />
          詳しくは<Link href="/privacy" style={{ color: '#c77dff' }}>プライバシーポリシー</Link>をご確認ください。
        </p>
      </div>
    </div>
  )
}
