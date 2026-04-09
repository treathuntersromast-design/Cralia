import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '利用規約 | Cralia',
}

const SECTIONS = [
  {
    title: '第1条（適用）',
    content: `本利用規約（以下「本規約」）は、Cralia（以下「当社」）が提供するクリエイターマッチングサービス「Cralia」（以下「本サービス」）の利用条件を定めるものです。登録ユーザーの皆さまには、本規約に従って本サービスをご利用いただきます。`,
  },
  {
    title: '第2条（利用登録）',
    content: `1. 本サービスへの登録を希望する方は、本規約に同意の上、当社所定の方法によって利用登録を申請するものとします。
2. 当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。
　・虚偽の事項を届け出た場合
　・本規約に違反したことがある者からの申請である場合
　・その他、当社が利用登録を相当でないと判断した場合`,
  },
  {
    title: '第3条（年齢制限）',
    content: `18歳未満の方は、保護者の同意を得た上で本サービスをご利用ください。有償依頼（金銭の授受を伴う取引）については、18歳以上の方のみがご利用いただけます。当社は、未成年者が保護者の同意なく本サービスを利用したことにより生じた損害について、一切の責任を負いません。`,
  },
  {
    title: '第4条（依頼・受注のルール）',
    content: `1. 依頼者は、クリエイターに対して誠実かつ具体的な依頼内容を提示するものとします。
2. クリエイターは、受注した依頼について善管注意義務をもって対応するものとします。
3. 依頼文には、以下の内容を必ず含めるものとします。
　・依頼の概要（何を作ってほしいか）
　・納品物の使用用途
4. 依頼の成果物に関する著作権・権利帰属については、依頼者とクリエイターが個別に合意するものとします。合意がない場合は、著作権は制作者（クリエイター）に帰属します。
5. 商用利用・二次利用・改変については、依頼時または受注時に明示的に合意が必要です。`,
  },
  {
    title: '第5条（外部連絡先への誘導禁止）',
    content: `1. 依頼文・プロフィール・チャット等において、LINE・Discord・個人メール・SNS DM等の外部連絡先への誘導は原則禁止とします。
2. 音声通話・ビデオ通話での打ち合わせなど、やむを得ない場合は依頼者とクリエイターの双方が明示的に同意した場合のみ許可します。
3. 本条に違反した場合、当社は当該ユーザーのアカウントを停止または削除する場合があります。`,
  },
  {
    title: '第6条（有償依頼・決済）',
    content: `1. 有償依頼においては、当社が提供するエスクロー決済機能を利用するものとします。
2. 依頼者は、依頼承認時に報酬額を当社に預託します。
3. 当社は、依頼者が納品を確認・承認した後、クリエイターに報酬を支払います。
4. キャンセル・返金については、各依頼のステータスおよび当社の定めるポリシーに従います。`,
  },
  {
    title: '第7条（ポートフォリオ掲載）',
    content: `クリエイターは、依頼者が明示的に許可した場合に限り、納品物をポートフォリオとして公開できます。依頼者が許可しない場合（依頼フォームのデフォルト設定）、クリエイターは納品物を外部に公開してはなりません。`,
  },
  {
    title: '第8条（納期遅延・トラブル）',
    content: `1. クリエイターが合意した納期を大幅に超過し、かつ依頼者との合意なく納品を行わない場合、依頼者は当社の定める補償申請を行うことができます（補償機能は順次実装予定）。
2. 依頼者・クリエイター間でのトラブルが解決しない場合、当社が仲裁に入ることがあります。
3. 当社の仲裁結果に双方が従わない場合、当社は当該依頼をキャンセルし、エスクロー資金の処理を当社の判断で行います。`,
  },
  {
    title: '第9条（禁止事項）',
    content: `ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
・法令または公序良俗に違反する行為
・犯罪行為に関連する行為
・第三者の著作権・知的財産権を侵害する行為（許可なく既存キャラクター・楽曲等を使用する依頼を含む）
・虚偽・誇大な情報の掲載
・スパム・フィッシング行為
・反社会的勢力への利益供与
・外部連絡先への不正誘導（第5条参照）
・本サービスの運営を妨害する行為
・その他、当社が不適切と判断する行為`,
  },
  {
    title: '第10条（免責事項）',
    content: `1. 当社は、本サービスに起因してユーザーに生じたあらゆる損害について、当社の故意または重過失による場合を除き、一切の責任を負いません。
2. 当社は、ユーザー間のトラブルについて、原則として仲裁・調停の範囲でのみ関与します。
3. 本サービスは「現状のまま」提供されるものであり、特定目的への適合性等を保証するものではありません。`,
  },
  {
    title: '第11条（利用規約の変更）',
    content: `当社は、必要と判断した場合には、ユーザーに通知することなく本規約を変更することができるものとします。重要な変更については、本サービス上またはメール等でお知らせします。変更後の規約は、本ページへの掲載をもって効力を生じます。`,
  },
  {
    title: '第12条（準拠法・裁判管轄）',
    content: `本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。`,
  },
]

export default function TermsPage() {
  const sectionStyle: React.CSSProperties = { marginBottom: '40px' }
  const headingStyle: React.CSSProperties = {
    fontSize: '16px', fontWeight: '700', color: '#f0eff8',
    marginBottom: '12px', paddingBottom: '8px',
    borderBottom: '1px solid rgba(199,125,255,0.2)',
  }
  const textStyle: React.CSSProperties = {
    fontSize: '14px', color: '#c0bdd8', lineHeight: '1.9', whiteSpace: 'pre-wrap',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a2e 50%, #0d0d14 100%)', padding: '48px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px' }}>
          <Link href="/" style={{ color: '#c77dff', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginBottom: '24px' }}>
            ← トップへ戻る
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#f0eff8', marginBottom: '8px' }}>
            利用規約
          </h1>
          <p style={{ color: '#7c7b99', fontSize: '13px' }}>
            制定日：2026年1月1日　最終改定日：2026年4月1日
          </p>
          <p style={{ color: '#c0bdd8', fontSize: '14px', lineHeight: '1.8', marginTop: '16px' }}>
            Cralia（以下「当社」）が提供するクリエイターマッチングサービス「Cralia」をご利用いただくにあたり、以下の利用規約をお読みいただき、同意の上でご利用ください。
          </p>
        </div>

        <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '40px' }}>
          {SECTIONS.map((section) => (
            <div key={section.title} style={sectionStyle}>
              <h2 style={headingStyle}>{section.title}</h2>
              <p style={textStyle}>{section.content}</p>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: '#7c7b99', fontSize: '13px', marginTop: '32px' }}>以上</p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
          <Link href="/privacy" style={{ color: '#c77dff', fontSize: '13px', textDecoration: 'none' }}>
            プライバシーポリシー →
          </Link>
        </div>
      </div>
    </div>
  )
}
