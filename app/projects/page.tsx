import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  recruiting:  { label: 'メンバー募集中', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  in_progress: { label: '進行中',         color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  completed:   { label: '完了',           color: 'var(--c-text-2)', bg: 'rgba(169,168,192,0.12)' },
  cancelled:   { label: 'キャンセル',     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

export default async function ProjectsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/projects')

  const { data: myProjects } = await supabase
    .from('project_boards')
    .select('id, title, category, status, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--c-bg)',
      color: 'var(--c-text)',
    }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: '1px solid var(--c-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--c-accent)', textDecoration: 'none' }}>
          Cralia
        </Link>
        <Link href="/dashboard" style={{ color: 'var(--c-text-2)', fontSize: '14px', textDecoration: 'none' }}>← ダッシュボードへ</Link>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        {/* タイトル + 作成ボタン */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px' }}>マイプロジェクト</h1>
            <p style={{ color: 'var(--c-text-3)', fontSize: '14px', margin: 0 }}>あなたが主催するプロジェクト</p>
          </div>
          <Link href="/projects/create" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 22px', borderRadius: '14px',
            background: 'var(--c-grad-primary)',
            color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none',
          }}>
            ＋ プロジェクトを作成
          </Link>
        </div>

        {/* プロジェクト一覧 */}
        {!myProjects || myProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--c-surface-2)', borderRadius: '20px', border: '1px dashed var(--c-accent-a20)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
            <p style={{ fontSize: '16px', margin: '0 0 8px', fontWeight: '700' }}>まだプロジェクトがありません</p>
            <p style={{ color: 'var(--c-text-3)', fontSize: '14px', margin: '0 0 24px' }}>メンバーを集めてプロジェクトを立ち上げましょう</p>
            <Link href="/projects/create" style={{
              display: 'inline-flex', padding: '12px 24px', borderRadius: '14px',
              background: 'var(--c-grad-primary)',
              color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none',
            }}>
              ＋ 最初のプロジェクトを作成
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myProjects.map((p) => {
              const st = STATUS_MAP[p.status] ?? STATUS_MAP.recruiting
              return (
                <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: 'var(--c-surface)', border: '1px solid var(--c-accent-a15)',
                    borderRadius: '16px', padding: '20px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                  }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', fontSize: '16px' }}>{p.title}</span>
                        {p.category && (
                          <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '12px', background: 'var(--c-accent-a15)', color: 'var(--c-accent)' }}>
                            {p.category}
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--c-text-3)', fontSize: '12px' }}>
                        {new Date(p.created_at).toLocaleDateString('ja-JP')} 作成
                      </span>
                    </div>
                    <span style={{
                      padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                      color: st.color, background: st.bg, whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {st.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
