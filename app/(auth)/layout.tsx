export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-root" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* 背景の装飾 */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, var(--c-accent-a15) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, var(--c-alt-a12) 0%, transparent 70%)',
        }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>
        {children}
      </div>
    </div>
  )
}
