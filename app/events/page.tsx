import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// 交流会イベントの型（今後 DB テーブルを追加した際にここを差し替える）
interface Event {
  id: string
  title: string
  date: string          // ISO 文字列
  location: string      // "オンライン" | 場所名
  capacity: number      // 定員
  applicants: number    // 申込済み人数
  description: string
  tags: string[]
}

// ダミーデータ（DB テーブル追加まで使用）
const UPCOMING_EVENTS: Event[] = []

export default async function EventsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/events')

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* ヘッダー */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/dashboard" style={{
          fontSize: '24px', fontWeight: '800',
          background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textDecoration: 'none',
        }}>
          Cralia
        </Link>
        <Link href="/dashboard" style={{
          color: '#7c7b99', fontSize: '13px', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          ← ダッシュボードに戻る
        </Link>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>

        {/* ページタイトル */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '5px 14px', borderRadius: '20px',
            background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
            marginBottom: '16px',
          }}>
            <span style={{ color: '#34d399', fontSize: '13px', fontWeight: '600' }}>🎉 クリエイター交流会</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 10px' }}>
            交流会への参加
          </h1>
          <p style={{ color: '#a9a8c0', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
            Cralia が企画するクリエイター交流会の一覧です。<br />
            参加申込は<strong style={{ color: '#34d399' }}>先着順</strong>となります。気になるイベントはお早めにお申し込みください。
          </p>
        </div>

        {/* イベント一覧 or 空状態 */}
        {UPCOMING_EVENTS.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {UPCOMING_EVENTS.map((event) => {
              const remaining = event.capacity - event.applicants
              const isFull = remaining <= 0
              const date = new Date(event.date)

              return (
                <div key={event.id} style={{
                  background: 'rgba(22,22,31,0.9)',
                  border: `1px solid ${isFull ? 'rgba(255,255,255,0.06)' : 'rgba(52,211,153,0.2)'}`,
                  borderRadius: '20px', padding: '28px',
                  opacity: isFull ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      {/* タグ */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {event.tags.map((tag) => (
                          <span key={tag} style={{
                            fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px',
                            background: 'rgba(199,125,255,0.12)', color: '#c77dff',
                          }}>{tag}</span>
                        ))}
                      </div>
                      <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px' }}>{event.title}</h2>
                      <p style={{ color: '#a9a8c0', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px' }}>
                        {event.description}
                      </p>
                      {/* 日時・場所 */}
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#7c7b99', fontSize: '13px' }}>
                          📅 {date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                          {' '}
                          {date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}〜
                        </span>
                        <span style={{ color: '#7c7b99', fontSize: '13px' }}>📍 {event.location}</span>
                      </div>
                    </div>

                    {/* 定員・申込ボタン */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#7c7b99' }}>残り枠</p>
                        <p style={{
                          margin: 0, fontSize: '22px', fontWeight: '800',
                          color: remaining <= 3 ? '#f87171' : '#34d399',
                        }}>
                          {isFull ? '満員' : `${remaining} 名`}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#5c5b78' }}>定員 {event.capacity} 名</p>
                      </div>
                      <button
                        disabled={isFull}
                        style={{
                          padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: isFull ? 'not-allowed' : 'pointer',
                          background: isFull ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #34d399, #059669)',
                          color: isFull ? '#5c5b78' : '#fff',
                          fontSize: '14px', fontWeight: '700',
                        }}
                      >
                        {isFull ? '申込締切' : '参加申込'}
                      </button>
                    </div>
                  </div>

                  {/* 残席少ない場合の警告 */}
                  {!isFull && remaining <= 5 && (
                    <div style={{
                      marginTop: '16px', padding: '10px 14px', borderRadius: '10px',
                      background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                      color: '#f87171', fontSize: '13px', fontWeight: '600',
                    }}>
                      ⚠️ 残席わずか！お早めにお申し込みください。
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* 空状態（イベント情報が出次第ここに表示される） */
          <div style={{
            background: 'rgba(22,22,31,0.8)',
            border: '1px solid rgba(52,211,153,0.15)',
            borderRadius: '24px', padding: '64px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 12px' }}>
              近日開催予定
            </h2>
            <p style={{ color: '#a9a8c0', fontSize: '14px', lineHeight: '1.8', margin: '0 0 28px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              現在、交流会の情報を準備中です。<br />
              開催が決まり次第こちらでご案内します。<br />
              参加申込は<strong style={{ color: '#34d399' }}>先着順</strong>となりますので、通知をお見逃しなく！
            </p>
            <Link href="/notifications" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 28px', borderRadius: '12px',
              background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
              color: '#34d399', fontSize: '14px', fontWeight: '700', textDecoration: 'none',
            }}>
              🔔 通知を確認する
            </Link>
          </div>
        )}

        {/* 過去の交流会（将来的に実装） */}
        <div style={{ marginTop: '48px', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <h3 style={{ color: '#5c5b78', fontSize: '13px', fontWeight: '700', margin: '0 0 8px' }}>ℹ️ 参加について</h3>
          <ul style={{ color: '#7c7b99', fontSize: '13px', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
            <li>参加申込は先着順です。定員に達し次第、申込を締め切ります。</li>
            <li>申込後はマイページの通知にて詳細をご案内します。</li>
            <li>キャンセルの場合はお早めにご連絡ください。</li>
          </ul>
        </div>

      </div>
    </main>
  )
}
