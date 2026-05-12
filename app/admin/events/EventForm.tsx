'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type EventFormValues = {
  title: string
  description: string
  event_date: string
  ends_at: string
  apply_deadline: string
  location: string
  venue_type: 'online' | 'offline' | 'hybrid'
  capacity: number
  fee: number
  target_audience: string
  banner_url: string
  cancel_policy: string
  organizer_name: string
  tags: string
  status: 'open' | 'closed' | 'cancelled'
  is_featured: boolean
}

const VENUE_LABELS: Record<string, string> = {
  online: 'オンライン',
  offline: 'オフライン（会場あり）',
  hybrid: 'ハイブリッド（両方）',
}

const STATUS_LABELS: Record<string, string> = {
  open: '受付中',
  closed: '締切',
  cancelled: '中止',
}

const defaultValues: EventFormValues = {
  title: '',
  description: '',
  event_date: '',
  ends_at: '',
  apply_deadline: '',
  location: 'オンライン',
  venue_type: 'online',
  capacity: 30,
  fee: 0,
  target_audience: '',
  banner_url: '',
  cancel_policy: '',
  organizer_name: '',
  tags: '',
  status: 'open',
  is_featured: false,
}

type Props = {
  mode: 'new' | 'edit'
  eventId?: string
  initialValues?: Partial<EventFormValues>
}

export default function EventForm({ mode, eventId, initialValues }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<EventFormValues>({ ...defaultValues, ...initialValues })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof EventFormValues, value: string | number | boolean) =>
    setValues(prev => ({ ...prev, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const tagsArr = values.tags
      .split(/[,、]/)
      .map(t => t.trim())
      .filter(Boolean)

    const payload = {
      ...values,
      tags: tagsArr,
      capacity: Number(values.capacity),
      fee: Number(values.fee),
      ends_at: values.ends_at || null,
      apply_deadline: values.apply_deadline || null,
    }

    const url = mode === 'new' ? '/api/admin/events' : `/api/admin/events/${eventId}`
    const method = mode === 'new' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? '保存に失敗しました')
      setSaving(false)
      return
    }

    router.push('/admin/events')
    router.refresh()
  }

  const labelCls = 'block text-xs font-medium text-[var(--c-text-3)] mb-1'
  const inputCls = 'w-full rounded-xl border border-[var(--c-border-2)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text-4)] focus:outline-none focus:border-brand'
  const sectionCls = 'bg-[var(--c-surface)] border border-[var(--c-border-2)] rounded-2xl p-5'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* 基本情報 */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-[var(--c-text)] mb-4">基本情報</h2>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>タイトル <span className="text-red-500">*</span></label>
            <input
              className={inputCls}
              value={values.title}
              onChange={e => set('title', e.target.value)}
              placeholder="例: クリエイター交流会 Vol.3"
              maxLength={100}
              required
            />
          </div>
          <div>
            <label className={labelCls}>説明・詳細</label>
            <textarea
              className={`${inputCls} min-h-[100px] resize-y`}
              value={values.description}
              onChange={e => set('description', e.target.value)}
              placeholder="イベントの内容、参加特典、スケジュールなど"
              maxLength={2000}
            />
          </div>
          <div>
            <label className={labelCls}>担当者・主催者名</label>
            <input
              className={inputCls}
              value={values.organizer_name}
              onChange={e => set('organizer_name', e.target.value)}
              placeholder="例: Cralia 運営チーム"
              maxLength={100}
            />
          </div>
          <div>
            <label className={labelCls}>対象者</label>
            <input
              className={inputCls}
              value={values.target_audience}
              onChange={e => set('target_audience', e.target.value)}
              placeholder="例: 初心者向け・クリエイター全般"
              maxLength={200}
            />
          </div>
        </div>
      </div>

      {/* 日程・場所 */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-[var(--c-text)] mb-4">日程・場所</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>開催日時 <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              className={inputCls}
              value={values.event_date}
              onChange={e => set('event_date', e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>終了日時</label>
            <input
              type="datetime-local"
              className={inputCls}
              value={values.ends_at}
              onChange={e => set('ends_at', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>申込締め切り</label>
            <input
              type="datetime-local"
              className={inputCls}
              value={values.apply_deadline}
              onChange={e => set('apply_deadline', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>開催形式 <span className="text-red-500">*</span></label>
            <select
              className={inputCls}
              value={values.venue_type}
              onChange={e => set('venue_type', e.target.value as EventFormValues['venue_type'])}
            >
              {Object.entries(VENUE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>開催場所 <span className="text-red-500">*</span></label>
            <input
              className={inputCls}
              value={values.location}
              onChange={e => set('location', e.target.value)}
              placeholder="例: Zoom / 渋谷〇〇ホール"
              maxLength={200}
              required
            />
          </div>
        </div>
      </div>

      {/* 定員・参加費 */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-[var(--c-text)] mb-4">定員・参加費</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>定員 <span className="text-red-500">*</span></label>
            <input
              type="number"
              className={inputCls}
              value={values.capacity}
              min={1}
              max={10000}
              onChange={e => set('capacity', Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className={labelCls}>参加費（円、0 = 無料）</label>
            <input
              type="number"
              className={inputCls}
              value={values.fee}
              min={0}
              step={100}
              onChange={e => set('fee', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* タグ・バナー */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-[var(--c-text)] mb-4">タグ・バナー</h2>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>タグ（カンマ区切り）</label>
            <input
              className={inputCls}
              value={values.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="例: VTuber, 楽曲制作, デザイン"
              maxLength={300}
            />
          </div>
          <div>
            <label className={labelCls}>バナー画像 URL</label>
            <input
              className={inputCls}
              value={values.banner_url}
              onChange={e => set('banner_url', e.target.value)}
              placeholder="https://..."
              type="url"
              maxLength={500}
            />
          </div>
        </div>
      </div>

      {/* キャンセルポリシー */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-[var(--c-text)] mb-4">キャンセルポリシー</h2>
        <textarea
          className={`${inputCls} min-h-[80px] resize-y`}
          value={values.cancel_policy}
          onChange={e => set('cancel_policy', e.target.value)}
          placeholder="例: 開催3日前までキャンセル可。参加費返金あり。"
          maxLength={1000}
        />
      </div>

      {/* ステータス・設定 */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-[var(--c-text)] mb-4">ステータス・設定</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>ステータス</label>
            <select
              className={inputCls}
              value={values.status}
              onChange={e => set('status', e.target.value as EventFormValues['status'])}
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-brand"
                checked={values.is_featured}
                onChange={e => set('is_featured', e.target.checked)}
              />
              <span className="text-sm text-[var(--c-text)]">注目イベントとして表示する</span>
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-[var(--c-accent)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? '保存中…' : mode === 'new' ? 'イベントを作成する' : '変更を保存する'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/events')}
          className="px-5 py-2.5 bg-[var(--c-surface)] text-[var(--c-text-2)] text-sm rounded-xl border border-[var(--c-border-2)] hover:border-[var(--c-border)] transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
