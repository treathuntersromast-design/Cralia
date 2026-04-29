import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Container } from '@/components/ui/Container'

export const metadata: Metadata = { title: 'プライバシーポリシー | Cralia' }

const SECTIONS = [
  { title: '第1条（個人情報の定義）', content: `「個人情報」とは、個人情報の保護に関する法律（以下「個人情報保護法」）に定める個人情報を指し、生存する個人に関する情報であって、氏名・生年月日・住所・電話番号・メールアドレスその他の記述等により特定の個人を識別できる情報、および他の情報と容易に照合することで特定の個人を識別できる情報を指します。` },
  { title: '第2条（取得する情報の種類）', content: `当社は、本サービスの提供にあたり、以下の情報を取得します。\n\n（1）お客様に直接ご提供いただく情報\n・氏名（ハンドルネーム含む）、住所、電話番号、メールアドレス\n・法人・団体の場合は、会社名・団体名および担当者氏名\n・電話番号は、本人確認の目的のために取得します\n・支払情報（クレジットカード番号等。ただし当社は保持せず決済事業者が管理します）\n・プロフィール情報（自己紹介文、スキル、ポートフォリオ等）\n\n（2）本サービスのご利用を通じて自動的に取得する情報\n・アクセスログ（IPアドレス、ブラウザ種別、参照元URL、アクセス日時）\n・デバイス情報（OS、端末識別子）\n・Cookie および類似技術により取得する情報` },
  { title: '第3条（個人情報の利用目的）', content: `当社は、取得した個人情報を以下の目的で利用します。\n\n（1）本サービスの提供・運営・改善\n（2）会員登録・本人確認・認証の管理\n（3）有償依頼の受発注を行う場合の本人確認\n（4）取引の履行、受発注管理、エスクロー決済の処理\n（5）料金の請求・収納、不正利用の防止\n（6）お問い合わせへの対応、各種通知の送付\n（7）規約違反行為への対応および紛争解決\n（8）新機能・キャンペーン等のご案内\n（9）統計データの作成\n（10）法令上の義務の履行` },
  { title: '第4条（第三者提供）', content: `当社は、以下のいずれかに該当する場合を除き、お客様の個人情報を第三者に提供しません。\n\n（1）お客様本人のご同意がある場合\n（2）法令に基づく場合\n（3）人の生命・身体・財産の保護のために必要であり、本人の同意を得ることが困難な場合\n（4）公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合\n（5）国の機関等の法令に定める事務の遂行への協力が必要な場合` },
  { title: '第5条（委託先への提供）', content: `当社は、利用目的の達成に必要な範囲で、個人情報の取り扱いを外部業者（決済処理会社、サーバー管理会社等）に委託する場合があります。委託先に対しては、適切な安全管理措置を講じることを契約により義務付け、必要かつ適切な監督を行います。` },
  { title: '第6条（安全管理措置）', content: `当社は、個人情報の紛失・破壊・改ざん・漏洩等を防止するため、以下の安全管理措置を講じます。\n\n・個人情報へのアクセス制限\n・通信の暗号化（SSL/TLS）\n・不正アクセス防止のためのファイアウォール設置\n・定期的なセキュリティ監査の実施\n・従業者への個人情報保護教育の実施` },
  { title: '第7条（Cookieおよびトラッキング技術）', content: `当社は、本サービスの利便性向上および利用状況の分析を目的として、Cookie を使用する場合があります。Cookie はブラウザの設定により拒否することが可能ですが、一部のサービス機能が利用できなくなる場合があります。` },
  { title: '第8条（お客様の権利）', content: `お客様は、当社が保有するご自身の個人情報について、開示・訂正・削除・利用停止等の権利を有します。ご請求は下記お問い合わせ窓口までご連絡ください。` },
  { title: '第9条（未成年者の個人情報）', content: `18歳未満の方が本サービスを利用される場合は、保護者の同意を得た上でご登録ください。当社は、保護者の同意なく18歳未満の方から個人情報を取得したことが判明した場合、速やかに当該情報を削除します。` },
  { title: '第10条（個人情報の保存期間）', content: `当社は、利用目的の達成に必要な期間、個人情報を保存します。アカウント削除後も、法令上の義務または正当な業務上の目的のために必要な期間は保存することがあります。` },
  { title: '第11条（プライバシーポリシーの変更）', content: `当社は、法令の改正・サービス内容の変更等に応じて、本ポリシーを改定する場合があります。重要な変更がある場合は、本サービス上での通知またはメール等でお知らせします。` },
  { title: '第12条（お問い合わせ窓口）', content: `個人情報の取り扱いに関するご相談・ご請求は、以下の窓口までご連絡ください。\n\nCralia 個人情報取り扱い担当\nメール: privacy@cralia.jp` },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <SiteHeader />
      <Container size="sm" className="py-12">
        <div className="mb-10">
          <Link href="/" className="text-[14px] text-brand no-underline hover:underline inline-block mb-6">← トップへ戻る</Link>
          <h1 className="text-[28px] font-bold mb-2">プライバシーポリシー</h1>
          <p className="text-[13px] text-[var(--c-text-3)] mb-4">制定日：2026年1月1日　最終改定日：2026年1月1日</p>
          <p className="text-[16px] text-[var(--c-text-2)] leading-[1.8]">
            Cralia（以下「当社」）は、クリエイターと依頼者のマッチングサービス「Cralia」を提供するにあたり、お客様の個人情報の保護を重要な責務と捉え、個人情報保護法その他関連法令を遵守した上で、以下のプライバシーポリシーに従い適切に取り扱います。
          </p>
        </div>

        <div className="flex flex-col gap-10">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="text-[16px] font-bold mb-3 pb-2 border-b border-[var(--c-border)]">{s.title}</h2>
              <p className="text-[16px] text-[var(--c-text-2)] leading-[1.8] whitespace-pre-wrap">{s.content}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[13px] text-[var(--c-text-3)] mt-12">以上</p>
      </Container>
      <SiteFooter />
    </div>
  )
}
