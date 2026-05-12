'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'

export default function EventListActions({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error ?? '削除に失敗しました')
        setConfirm(false)
        return
      }
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/events/${eventId}/edit`}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-[var(--c-bg)] border border-[var(--c-border-2)] rounded-lg text-[var(--c-text-2)] hover:border-brand hover:text-brand transition-colors no-underline"
        >
          <Pencil size={12} aria-hidden />
          編集
        </Link>

        {!confirm ? (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-[var(--c-bg)] border border-[var(--c-border-2)] rounded-lg text-[var(--c-text-3)] hover:border-red-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} aria-hidden />
            削除
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-500">本当に削除しますか？</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {deleting ? '削除中…' : '削除する'}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="text-xs px-3 py-1.5 border border-[var(--c-border-2)] rounded-lg text-[var(--c-text-3)] hover:border-[var(--c-border)] transition-colors"
            >
              キャンセル
            </button>
          </div>
        )}
      </div>
      {deleteError && <span className="text-xs text-red-500">{deleteError}</span>}
    </div>
  )
}
