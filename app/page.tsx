import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)',
      color: '#f0eff8',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* ナビゲーション */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Cralia
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/login" style={{ color: '#a9a8c0', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>ログイン</Link>
          <Link href="/signup" style={{ padding: '10px 22px', borderRadius: '12px', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
            無料で始める
          </Link>
        </div>
      </nav>

      {/* ヒーローセクション */}
      <section style={{ textAlign: 'center', padding: '100px 24px 80px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(199,125,255,0.12)', border: '1px solid rgba(199,125,255,0.25)', marginBottom: '28px' }}>
          <span style={{ color: '#c77dff', fontSize: '13px', fontWeight: '600' }}>🎨 クリエイターのためのマッチングプラットフォーム</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: '900', lineHeight: '1.15', margin: '0 0 24px' }}>
          すべてのクリエイターが<br />
          <span style={{ background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            つながる場所
          </span>
        </h1>
        <p style={{ fontSize: '18px', color: '#a9a8c0', lineHeight: '1.7', margin: '0 0 40px', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
          VTuber・ボカロP・イラストレーター・動画編集者など、あらゆるクリエイターが集まるマッチングサービス。プロジェクトを立ち上げ、仲間を集め、創作活動を加速させましょう。
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" style={{ padding: '16px 36px', borderRadius: '16px', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '16px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            無料で始める →
          </Link>
          <Link href="/search" style={{ padding: '16px 36px', borderRadius: '16px', border: '1px solid rgba(199,125,255,0.35)', background: 'transparent', color: '#c77dff', fontSize: '16px', fontWeight: '700', textDecoration: 'none' }}>
            クリエイターを探す
          </Link>
          <Link href="/login" style={{ padding: '16px 36px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#a9a8c0', fontSize: '16px', fontWeight: '700', textDecoration: 'none' }}>
            ログイン
          </Link>
        </div>
      </section>

      {/* 機能セクション */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px 100px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', margin: '0 0 48px' }}>
          Craliaでできること
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {[
            {
              icon: '🔍',
              title: 'クリエイター検索',
              desc: 'タイプ・スキル・受付状況でクリエイターを絞り込み。ポートフォリオをひと目で確認できます。',
              color: '#c77dff',
            },
            {
              icon: '🎯',
              title: 'プロジェクトボード',
              desc: '楽曲制作・動画制作などのプロジェクトを作成し、必要な役職のメンバーを募集できます。',
              color: '#60a5fa',
            },
            {
              icon: '📣',
              title: 'お仕事募集中の依頼者',
              desc: 'クリエイターとして仕事を探す。依頼者のプロフィールを確認してダイレクトに営業をかけましょう。',
              color: '#ff6b9d',
            },
            {
              icon: '📋',
              title: '案件を探す・募集する',
              desc: 'クリエイターは公開中の案件を検索して応募。依頼者はクリエイター募集の案件を投稿して広く応募を受け付けられます。',
              color: '#fbbf24',
            },
            {
              icon: '💬',
              title: 'チャットで相談',
              desc: '依頼内容の詳細をチャットで詰める。ファイル共有もスムーズに行えます。（実装予定）',
              color: '#4ade80',
            },
            {
              icon: '💳',
              title: 'エスクロー決済',
              desc: '前払いで安心取引。納品確認後に報酬が支払われる仕組みで双方を保護します。（実装予定）',
              color: '#fbbf24',
            },
            {
              icon: '🤖',
              title: 'AI支援機能',
              desc: 'Claude AIがプロフィール文の作成や依頼文の作成をサポート。あなたの魅力・想いを最大限に引き出します。',
              color: '#f87171',
            },
            {
              icon: '🎉',
              title: '交流会への参加',
              desc: 'Craliaが企画するクリエイター交流会に参加しよう。オンライン・オフラインを問わず、新しい仲間や仕事のきっかけが生まれる場を提供します。',
              color: '#34d399',
            },
          ].map(({ icon, title, desc, color }) => (
            <div key={title} style={{ background: 'rgba(22,22,31,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '28px' }}>
              <div style={{ fontSize: '32px', marginBottom: '14px' }}>{icon}</div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 8px', color }}>{title}</h3>
              <p style={{ color: '#a9a8c0', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'rgba(199,125,255,0.06)', borderTop: '1px solid rgba(199,125,255,0.12)', borderBottom: '1px solid rgba(199,125,255,0.12)', padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 16px' }}>今すぐ始めましょう</h2>
        <p style={{ color: '#a9a8c0', fontSize: '16px', margin: '0 0 32px' }}>登録は無料。プロフィールを作って創作の仲間を見つけましょう。</p>
        <Link href="/signup" style={{ padding: '16px 48px', borderRadius: '16px', background: 'linear-gradient(135deg, #ff6b9d, #c77dff)', color: '#fff', fontSize: '18px', fontWeight: '700', textDecoration: 'none' }}>
          無料登録 →
        </Link>
      </section>

      {/* フッター */}
      <footer style={{ padding: '32px 24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ color: '#5c5b78', fontSize: '13px', textDecoration: 'none' }}>プライバシーポリシー</Link>
          <Link href="/login" style={{ color: '#5c5b78', fontSize: '13px', textDecoration: 'none' }}>ログイン</Link>
          <Link href="/signup" style={{ color: '#5c5b78', fontSize: '13px', textDecoration: 'none' }}>新規登録</Link>
        </div>
        <p style={{ color: '#3c3c54', fontSize: '12px', margin: 0 }}>© 2026 Cralia. All rights reserved.</p>
      </footer>
    </div>
  )
}
