import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/settings/billing')

  const { data: userData } = await supabase
    .from('users')
    .select('entity_type')
    .eq('id', user.id)
    .single()

  const isCorporate = userData?.entity_type === 'corporate'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
    }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          CreMatch
        </Link>
        <Link href="/settings" style={{ color: '#a9a8c0', fontSize: '14px', textDecoration: 'none' }}>← 設定へ</Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 8px' }}>プランと請求</h1>
        <p style={{ color: '#7c7b99', fontSize: '14px', margin: '0 0 32px' }}>ご利用中のプランと今後の機能予定</p>

        {/* ベータ版バナー */}
        <div style={{
          background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)',
          borderRadius: '16px', padding: '18px 22px', marginBottom: '32px',
          display: 'flex', alignItems: 'flex-start', gap: '14px',
        }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🎉</span>
          <div>
            <p style={{ fontWeight: '800', fontSize: '15px', margin: '0 0 4px', color: '#4ade80' }}>ベータ版期間中は全機能を無料でご利用いただけます</p>
            <p style={{ color: '#86efac', fontSize: '13px', margin: 0, lineHeight: '1.7' }}>
              正式リリース後は個人向け・法人向けのプランを提供予定です。ベータ版終了の際は事前にお知らせします。
            </p>
          </div>
        </div>

        {/* 現在のプラン */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#7c7b99', margin: '0 0 14px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>現在のプラン</h2>
          <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '20px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <p style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px' }}>ベータプラン</p>
                <p style={{ color: '#4ade80', fontSize: '15px', fontWeight: '700', margin: 0 }}>¥0 / 月（ベータ期間中）</p>
              </div>
              <span style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                利用中
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'プロフィール公開・クリエイター検索',
                'ポートフォリオ掲載',
                '依頼の送受信・管理',
                'プロジェクトボード',
                'クリエイター・依頼者検索',
                'イベント参加',
              ].map((label) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#4ade80', fontSize: '14px' }}>✓</span>
                  <span style={{ color: '#f0eff8', fontSize: '14px' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 今後のプラン予定 */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#7c7b99', margin: '0 0 14px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>正式リリース後のプラン（予定）</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* 個人プラン */}
            <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(199,125,255,0.15)', borderRadius: '18px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 2px' }}>個人プラン</p>
                  <p style={{ color: '#7c7b99', fontSize: '13px', margin: 0 }}>個人クリエイター・フリーランス向け</p>
                </div>
                <span style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(199,125,255,0.1)', color: '#c77dff' }}>
                  準備中
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['無制限のポートフォリオ掲載', 'エスクロー決済', 'AI自己紹介文作成', '優先サポート'].map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#c77dff', fontSize: '13px' }}>○</span>
                    <span style={{ color: '#a9a8c0', fontSize: '13px' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 法人プラン */}
            <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '18px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
              {isCorporate && (
                <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', fontSize: '11px', fontWeight: '700', color: '#60a5fa' }}>
                  あなたのアカウントタイプ
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 2px' }}>法人プラン</p>
                  <p style={{ color: '#7c7b99', fontSize: '13px', margin: 0 }}>企業・団体・サークル向け</p>
                </div>
                <span style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                  準備中
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  '個人プランの全機能',
                  'チームアカウント・担当者管理',
                  '発注承認ワークフロー',
                  '請求書払い（銀行振込）対応',
                  '発注履歴CSVエクスポート・領収書PDF発行',
                  '専任サポート・SLA対応',
                ].map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#60a5fa', fontSize: '13px' }}>○</span>
                    <span style={{ color: '#a9a8c0', fontSize: '13px' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 法人向け早期アクセス */}
        {isCorporate && (
          <section style={{ marginBottom: '32px' }}>
            <div style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '16px', padding: '22px', textAlign: 'center' }}>
              <p style={{ fontWeight: '800', fontSize: '16px', margin: '0 0 6px' }}>法人向けプランの早期アクセス登録</p>
              <p style={{ color: '#7c7b99', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.7' }}>
                正式リリース前に法人プランのご案内を希望される場合はお問い合わせください。
              </p>
              <button disabled style={{
                padding: '10px 28px', borderRadius: '12px', border: '1px solid rgba(96,165,250,0.3)',
                background: 'rgba(96,165,250,0.08)', color: '#60a5fa',
                fontSize: '14px', fontWeight: '700', cursor: 'not-allowed', opacity: 0.7,
              }}>
                お問い合わせ（準備中）
              </button>
            </div>
          </section>
        )}

        {/* 注意書き */}
        <p style={{ color: '#5c5b78', fontSize: '12px', lineHeight: '1.8', textAlign: 'center' }}>
          プラン内容・価格はベータ期間終了前に正式発表予定です。<br />
          ご不明点は <Link href="/settings" style={{ color: '#7c7b99' }}>設定ページ</Link> からお問い合わせください。
        </p>
      </div>
    </div>
  )
}
