export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  )
}
