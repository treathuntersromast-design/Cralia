import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen c-app-bg-tint flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-brand no-underline">
            Cralia
          </Link>
        </div>
        <div className="auth-card-scope c-card-float rounded-[20px] p-8 sm:p-10">
          {children}
        </div>
        <p className="text-center mt-6 text-[12px] text-[var(--c-text-3)]">
          &copy; {new Date().getFullYear()} Cralia
        </p>
      </div>
    </div>
  )
}
