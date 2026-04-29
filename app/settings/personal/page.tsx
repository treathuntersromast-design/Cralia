'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

const inputCls = 'w-full h-11 px-3.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[15px] outline-none focus:border-brand transition'

export default function PersonalInfoPage() {
  const [form, setForm] = useState({
    realName: '', companyName: '', postalCode: '',
    prefecture: '', address: '', phoneNumber: '',
    corporateNumber: '', invoiceNumber: '',
  })
  const [entityType, setEntityType] = useState<'individual' | 'corporate'>('individual')
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [agreed, setAgreed]     = useState(false)

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
    if (!agreed) { setError('プライバシーポリシーへの同意が必要です'); return }
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

  const handleCorporateNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 13)
    setForm((f) => ({ ...f, corporateNumber: digits }))
  }

  const handleInvoiceNumber = (value: string) => {
    const raw = value.startsWith('T') ? value.slice(1) : value
    const digits = raw.replace(/\D/g, '').slice(0, 13)
    setForm((f) => ({ ...f, invoiceNumber: digits ? `T${digits}` : '' }))
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center">
        <p className="text-[var(--c-text-3)]">読み込み中...</p>
      </div>
    )
  }

  const sectionHead = 'text-[12px] font-bold text-brand tracking-wider mb-4 pb-2 border-b border-brand/15'
  const reqNote = <span className="text-[11px] text-[#dc2626] ml-1">（有償取引時に必須）</span>

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <AppHeader />
      <Container size="sm" className="py-10">
        <div className="mb-8">
          <Link href="/settings" className="text-brand text-[14px] no-underline hover:underline inline-block mb-5">
            ← 設定へ戻る
          </Link>
          <h1 className="text-[24px] font-bold mb-2">個人情報の登録</h1>
          <p className="text-[14px] text-[var(--c-text-3)] leading-[1.7]">
            ここで登録した情報は取引・決済・本人確認の目的のみに使用されます。他のユーザーには公開されません。
          </p>
        </div>

        {/* 案内バナー */}
        <div className="flex gap-3 items-start p-4 bg-[#fbbf24]/8 border border-[#fbbf24]/25 rounded-card mb-6">
          <AlertTriangle size={16} className="text-[#d97706] shrink-0 mt-0.5" aria-hidden />
          <p className="text-[13px] text-[var(--c-text-2)] leading-[1.7]">
            有償依頼の受発注を行う場合、氏名・住所・電話番号の登録が必須となります。事前にご登録いただくとスムーズに取引を開始できます。
          </p>
        </div>

        <Card bordered padded>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* 基本情報 */}
            <div>
              <p className={sectionHead}>基本情報</p>
              <div className="flex flex-col gap-5">
                {isCorporate && (
                  <div>
                    <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">会社名・団体名</label>
                    <input
                      type="text" value={form.companyName}
                      onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                      placeholder="株式会社〇〇 / △△サークル" maxLength={100} className={inputCls}
                    />
                    <p className="text-[12px] text-[var(--c-text-3)] mt-1">法人・団体として登録されています。正式名称を入力してください。</p>
                  </div>
                )}

                <div>
                  <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">
                    {isCorporate ? '担当者氏名' : '氏名'}{reqNote}
                  </label>
                  <input
                    type="text" value={form.realName}
                    onChange={(e) => setForm((f) => ({ ...f, realName: e.target.value }))}
                    placeholder="山田 太郎" maxLength={50} className={inputCls}
                  />
                  <p className="text-[12px] text-[var(--c-text-3)] mt-1">本名を入力してください。取引の本人確認に使用します。</p>
                </div>

                <div>
                  <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">電話番号{reqNote}</label>
                  <input
                    type="tel" value={form.phoneNumber}
                    onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    placeholder="090-1234-5678" maxLength={15} className={inputCls}
                  />
                  <p className="text-[12px] text-[var(--c-text-3)] mt-1">本人確認のために使用します。他のユーザーには公開されません。</p>
                </div>

                <div>
                  <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">郵便番号{reqNote}</label>
                  <input
                    type="text" value={form.postalCode}
                    onChange={(e) => handlePostalCode(e.target.value)}
                    placeholder="123-4567" className={`${inputCls} max-w-[200px]`}
                  />
                </div>

                <div>
                  <label htmlFor="prefecture" className="block text-[13px] text-[var(--c-text-2)] mb-1.5">都道府県</label>
                  <select
                    id="prefecture"
                    value={form.prefecture}
                    onChange={(e) => setForm((f) => ({ ...f, prefecture: e.target.value }))}
                    className="h-11 px-3.5 rounded-input border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-[var(--c-text)] text-[15px] outline-none focus:border-brand transition max-w-[200px]"
                  >
                    <option value="">選択してください</option>
                    {PREFECTURES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">住所（市区町村・番地・建物名）</label>
                  <input
                    type="text" value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="渋谷区〇〇町1-2-3 △△ビル 101号室" maxLength={200} className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* 法人番号（法人のみ） */}
            {isCorporate && (
              <div>
                <p className={sectionHead}>法人番号</p>
                <div>
                  <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">
                    法人番号 <span className="text-[11px] text-[var(--c-text-3)]">（任意）</span>
                  </label>
                  <input
                    type="text" inputMode="numeric" value={form.corporateNumber}
                    onChange={(e) => handleCorporateNumber(e.target.value)}
                    placeholder="1234567890123" maxLength={13}
                    className={`${inputCls} max-w-[240px] tracking-[0.1em]`}
                  />
                  <p className="text-[12px] text-[var(--c-text-3)] mt-1 leading-[1.6]">
                    国税庁が指定した13桁の番号です。登録するとプロフィールに「法人番号登録済み」バッジが表示されます。<br />
                    <a href="https://www.houjin-bangou.nta.go.jp/" target="_blank" rel="noopener noreferrer" className="text-brand no-underline hover:underline">
                      国税庁 法人番号公表サイト →
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* インボイス登録番号 */}
            <div>
              <p className={sectionHead}>インボイス登録番号</p>
              <div>
                <label className="block text-[13px] text-[var(--c-text-2)] mb-1.5">
                  適格請求書発行事業者登録番号 <span className="text-[11px] text-[var(--c-text-3)]">（任意）</span>
                </label>
                <input
                  type="text" value={form.invoiceNumber}
                  onChange={(e) => handleInvoiceNumber(e.target.value)}
                  placeholder="T1234567890123" maxLength={14}
                  className={`${inputCls} max-w-[260px] tracking-[0.08em]`}
                />
                <p className="text-[12px] text-[var(--c-text-3)] mt-1 leading-[1.6]">
                  「T」＋13桁の登録番号（例: T1234567890123）。登録するとプロフィールにインボイス番号が表示され、取引先が仕入税額控除を利用できます。
                  個人事業主・法人ともに登録可能です。
                </p>
              </div>
            </div>

            {/* プライバシーポリシー同意 */}
            <div className="p-4 bg-brand-soft border border-brand/15 rounded-card">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 shrink-0 accent-brand w-4 h-4"
                />
                <span className="text-[13px] text-[var(--c-text-2)] leading-[1.7]">
                  <Link href="/privacy" target="_blank" className="text-brand font-semibold no-underline hover:underline">
                    プライバシーポリシー
                  </Link>
                  を読み、個人情報の取り扱いに同意します。
                </span>
              </label>
            </div>

            {error && (
              <p className="text-[13px] text-[#dc2626] bg-[#dc2626]/8 border border-[#dc2626]/25 rounded-[8px] px-3.5 py-2.5">
                {error}
              </p>
            )}
            {success && (
              <p className="text-[13px] text-[#16a34a] bg-[#4ade80]/8 border border-[#4ade80]/25 rounded-[8px] px-3.5 py-2.5">
                保存しました。
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading} disabled={!agreed} className="w-full">
              保存する
            </Button>
          </form>
        </Card>

        <p className="text-[12px] text-[var(--c-text-4)] text-center mt-5 leading-[1.7]">
          ご登録いただいた個人情報は暗号化されて保存されます。<br />
          詳しくは<Link href="/privacy" className="text-brand no-underline hover:underline">プライバシーポリシー</Link>をご確認ください。
        </p>
      </Container>
    </div>
  )
}
