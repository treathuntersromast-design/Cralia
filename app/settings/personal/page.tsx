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
  background: 'var(--c-input-bg)',
  border: '1px solid var(--c-border-3)',
  borderRadius: '10px',
  color: 'var(--c-text)',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--c-text-2)',
  fontSize: '13px',
  marginBottom: '6px',
}

const hintStyle: React.CSSProperties = {
  color: 'var(--c-text-3)',
  fontSize: '12px',
  marginTop: '4px',
}

const sectionHeadStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '700',
  color: 'var(--c-accent)',
  letterSpacing: '0.06em',
  marginBottom: '14px',
  paddingBottom: '8px',
  borderBottom: '1px solid var(--c-accent-a15)',
}

export default function PersonalInfoPage() {
  const [form, setForm] = useState({
    realName: '',
    companyName: '',
    postalCode: '',
    prefecture: '',
    address: '',
    phoneNumber: '',
    corporateNumber: '',
    invoiceNumber: '',
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
            realName:        data.real_name        ?? '',
            companyName:     data.company_name     ?? '',
            postalCode:      data.postal_code      ?? '',
            prefecture:      data.prefecture       ?? '',
            address:         data.address          ?? '',
            phoneNumber:     data.phone_number     ?? '',
            corporateNumber: data.corporate_number ?? '',
            invoiceNumber:   data.invoice_number   ?? '',
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

  // 法人番号: 数字のみ・13桁まで
  const handleCorporateNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 13)
    setForm((f) => ({ ...f, corporateNumber: digits }))
  }

  // インボイス番号: 先頭Tを固定し、後ろ13桁
  const handleInvoiceNumber = (value: string) => {
    const raw = value.startsWith('T') ? value.slice(1) : value
    const digits = raw.replace(/\D/g, '').slice(0, 13)
    setForm((f) => ({ ...f, invoiceNumber: digits ? `T${digits}` : '' }))
  }

  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--c-text-3)' }}>読み込み中...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--c-bg)',
      padding: '48px 24px',
    }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/settings" style={{ color: 'var(--c-accent)', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
            ← 設定へ戻る
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--c-text)', marginBottom: '8px' }}>
            個人情報の登録
          </h1>
          <p style={{ color: 'var(--c-text-3)', fontSize: '14px', lineHeight: '1.7' }}>
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
          border: '1px solid var(--c-border)',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ── 基本情報 ── */}
            <div>
              <p style={sectionHeadStyle}>基本情報</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* 法人の場合: 会社名 */}
                {isCorporate && (
                  <div>
                    <label style={labelStyle}>会社名・団体名</label>
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
              </div>
            </div>

            {/* ── 法人番号（法人のみ） ── */}
            {isCorporate && (
              <div>
                <p style={sectionHeadStyle}>法人番号</p>
                <div>
                  <label style={labelStyle}>
                    法人番号
                    <span style={{ color: 'var(--c-text-3)', marginLeft: '6px', fontSize: '11px' }}>（任意）</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.corporateNumber}
                    onChange={(e) => handleCorporateNumber(e.target.value)}
                    placeholder="1234567890123"
                    maxLength={13}
                    style={{ ...inputStyle, maxWidth: '240px', letterSpacing: '0.1em' }}
                  />
                  <p style={hintStyle}>
                    国税庁が指定した13桁の番号です。登録するとプロフィールに「法人番号登録済み」バッジが表示されます。<br />
                    <a href="https://www.houjin-bangou.nta.go.jp/" target="_blank" rel="noopener noreferrer" style={{ color: '#c77dff', textDecoration: 'none' }}>
                      国税庁 法人番号公表サイト →
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* ── インボイス登録番号 ── */}
            <div>
              <p style={sectionHeadStyle}>インボイス登録番号</p>
              <div>
                <label style={labelStyle}>
                  適格請求書発行事業者登録番号
                  <span style={{ color: 'var(--c-text-3)', marginLeft: '6px', fontSize: '11px' }}>（任意）</span>
                </label>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => handleInvoiceNumber(e.target.value)}
                  placeholder="T1234567890123"
                  maxLength={14}
                  style={{ ...inputStyle, maxWidth: '260px', letterSpacing: '0.08em' }}
                />
                <p style={hintStyle}>
                  「T」＋13桁の登録番号（例: T1234567890123）。登録するとプロフィールにインボイス番号が表示され、取引先が仕入税額控除を利用できます。
                  個人事業主・法人ともに登録可能です。
                </p>
              </div>
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
                color: '#ff6b9d', fontSize: '13px',
                background: 'rgba(255,107,157,0.1)', border: '1px solid rgba(255,107,157,0.3)',
                borderRadius: '8px', padding: '10px 14px', margin: 0,
              }}>
                {error}
              </p>
            )}

            {/* 成功 */}
            {success && (
              <p style={{
                color: '#4ade80', fontSize: '13px',
                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
                borderRadius: '8px', padding: '10px 14px', margin: 0,
              }}>
                保存しました。
              </p>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading || !agreed}
              style={{
                padding: '14px', borderRadius: '12px', border: 'none',
                background: loading || !agreed ? 'rgba(199,125,255,0.3)' : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                color: '#fff', fontSize: '16px', fontWeight: '700',
                cursor: loading || !agreed ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading ? '保存中...' : '保存する'}
            </button>
          </form>
        </div>

        {/* 注意事項 */}
        <p style={{ color: 'var(--c-text-3)', fontSize: '12px', textAlign: 'center', marginTop: '20px', lineHeight: '1.7' }}>
          ご登録いただいた個人情報は暗号化されて保存されます。<br />
          詳しくは<Link href="/privacy" style={{ color: '#c77dff' }}>プライバシーポリシー</Link>をご確認ください。
        </p>
      </div>
    </div>
  )
}
