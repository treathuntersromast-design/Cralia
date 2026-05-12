import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'

interface Props {
  searchParams: { project_id?: string }
}

export default function PaymentCancelPage({ searchParams }: Props) {
  const projectId = searchParams.project_id

  return (
    <div className="page-root">
      <AppHeader />
      <main className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="max-w-md space-y-6">
          <div className="flex justify-center">
            <XCircle className="w-16 h-16 text-[var(--c-text-4)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">
            決済をキャンセルしました
          </h1>
          <p className="text-[var(--c-text-3)] text-sm">
            決済はキャンセルされました。依頼詳細ページから再度お試しいただけます。
          </p>
          <div className="flex gap-3 justify-center">
            {projectId && (
              <Link
                href={`/orders/${projectId}`}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--c-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                依頼詳細へ戻る
              </Link>
            )}
            <Link
              href="/orders"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-[var(--c-border-2)] text-[var(--c-text-2)] text-sm font-medium hover:bg-[var(--c-surface-2)] transition-colors"
            >
              依頼一覧へ
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
