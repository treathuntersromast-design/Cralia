import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'

export default function PaymentSuccessPage() {
  return (
    <div className="page-root">
      <AppHeader />
      <main className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="max-w-md space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">
            お支払いが完了しました
          </h1>
          <div className="c-surface border rounded-xl p-5 space-y-3 text-sm text-left">
            <p className="text-[var(--c-text-2)] font-medium">プラットフォーム預かり決済について</p>
            <ul className="space-y-2 text-[var(--c-text-3)] list-disc list-inside">
              <li>お支払いはプラットフォームが預かっています</li>
              <li>クリエイターが納品し、検収が完了した後に支払いが確定されます</li>
              <li>万が一の際は管理者にお問い合わせください</li>
            </ul>
          </div>
          <Link
            href="/orders"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[var(--c-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            依頼一覧へ
          </Link>
        </div>
      </main>
    </div>
  )
}
