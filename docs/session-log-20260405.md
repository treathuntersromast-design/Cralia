# CreMatch 開発セッションログ — 2026-04-05

---

## 概要

前回のセッションから引き継いだ実装を完了させ、全機能にエッジケース・ハッピーケーステスト（77件）を追加した。

---

## 前回セッションから引き継いだ完了済みタスク

| タスク | 概要 |
|--------|------|
| DB マイグレーション | `supabase/migrate.sql` — display_id・ai_suggestion_enabled・portfolio_allowed・copyright_agreed・ai_rate_limit・receipts・error_logs など |
| #13 利用規約ページ | `app/terms/page.tsx` 12条構成 |
| #9 サインアップ同意 | `app/(auth)/signup/page.tsx` に利用規約同意チェックボックス |
| #17 ID 検索 | 8桁 display_id + クリエイター検索に ID 検索タブ追加 |
| #6 依頼一覧フィルタ・ソート | `OrdersClient.tsx` — ステータスフィルタ + 作成日/納期/ステータスソート |
| #7/#8 AI レート制限 + URL チェック | `lib/aiGuard.ts` — checkRateLimit + sanitizeAiResponse |
| 依頼編集 API | `app/api/orders/[id]/edit/route.ts` — PATCH（pending・依頼者のみ） |
| レビュー API | `app/api/reviews/route.ts` — GET（一覧） + POST（投稿・完了案件・依頼者のみ・重複防止） |
| AI 依頼文アシスタント API | `app/api/ai/request-draft/route.ts` — 20点チェックリスト付きシステムプロンプト |
| AI 自己紹介文アシスタント | `app/api/ai/bio/route.ts` + `components/BioChatModal.tsx` |
| AI 依頼文アシスタント UI | `components/RequestDraftAssistant.tsx` |

---

## 今回セッションで実装した内容

### #5 レビュー投稿 UI

**ファイル:**
- `components/ReviewSection.tsx` — 新規作成
- `app/orders/[id]/page.tsx` — ReviewSection を追加

**仕様:**
- 依頼詳細ページ下部にレビューセクションを表示
- 既存レビューは star アイコンで一覧表示
- 投稿フォームは「completed ステータス・依頼者・未投稿」の場合のみ表示
- 星評価（1〜5）はホバーでアニメーション、ラベル付き（悪い〜とても良い）
- コメント最大 500 文字（カウンター表示）
- 送信後に自動リフレッシュ
- 重複投稿はサーバー側で 409 を返すため、フォームは `hasReviewed` チェックで非表示に

---

### #1 依頼編集 UI（pending 中・依頼者のみ）

**ファイル:**
- `app/orders/[id]/EditOrderModal.tsx` — 新規作成
- `app/orders/[id]/page.tsx` — EditOrderModal を追加

**仕様:**
- `isPending && isClient` の場合のみ「✏️ 依頼内容を編集する」ボタンを表示
- モーダルオーバーレイで編集フォームを表示
- 編集可能フィールド: タイトル・依頼内容・予算・希望納期
- 背景クリックでモーダルを閉じる
- 保存後 `router.refresh()` でサーバー再取得

---

### #12 著作権同意チェックボックス

**ファイル:**
- `app/orders/new/page.tsx` — copyrightAgreed state + UI 追加
- `app/api/orders/route.ts` — copyright_agreed フィールド追加

**仕様:**
- 「著作権・権利に関する同意事項」セクションを依頼フォームに追加
- 4項目（著作者人格権・著作権帰属・第三者著作物リスク・法令遵守）を箇条書きで明示
- チェック前は送信ボタンを disabled に
- `copyright_agreed: true` を API 経由で DB に保存
- 依頼詳細ページでも「著作権同意: ✅ 同意済み」と表示

---

### #3 依頼フォーム localStorage 下書き自動保存

**ファイル:**
- `app/orders/new/page.tsx` — useEffect + debounce 追加

**仕様:**
- フィールド変更から 800ms 後に自動保存（debounce）
- 保存キー: `order_draft_{creatorId}`（クリエイターごとに独立）
- 保存対象: title・description・budget・deadline・orderType
- ページ初回読み込み時に自動復元
- 保存時に「✓ 下書きを自動保存しました」を 2 秒表示
- 依頼送信成功時に localStorage のキーを削除

---

### #20 エラーログ基盤

**ファイル:**
- `lib/logError.ts` — 新規作成
- `app/api/ai/bio/route.ts` — logError 適用
- `app/api/ai/request-draft/route.ts` — logError 適用

**仕様:**
- `error_logs` テーブルに非同期で記録（endpoint・message・stack・user_id・meta）
- テーブル未作成時はコンソール出力にサイレントフォールバック
- 全 AI API の catch ブロックに適用

```typescript
export async function logError(params: {
  endpoint: string
  message:  string
  stack?:   string
  userId?:  string
  meta?:    Record<string, unknown>
}): Promise<void>
```

---

### #16 クリエイター受注実績・統計（ダッシュボード）

**ファイル:**
- `app/dashboard/page.tsx` — 統計フェッチ + UI 追加

**仕様:**
- `activity_style_id` が 1（クリエイター）または 3（両方）のユーザーにのみ表示
- 表示統計:
  - ✅ 完了件数（completed として creator_id に紐づく案件数）
  - ⭐ 平均評価（レビューの rating 平均、小数第1位、件数表示付き）
  - 💰 有償案件収益合計（order_type != 'free' かつ budget != null の合算）
- クリエイタースタッツカードは Welcome カードとクイックアクションの間に配置

---

### #14/#15 受注上限・料金プラン設定

**ファイル:**
- `app/settings/creator-profile/page.tsx` — 新規作成
- `app/api/settings/creator-profile/route.ts` — GET + POST
- `app/api/settings/ai-suggestion/route.ts` — GET + POST
- `app/settings/page.tsx` — 「クリエイター設定」リンク追加

**仕様（受注上限）:**
- 同時受注上限を 1〜999 の整数で設定
- 空欄 = 無制限（null 保存）

**仕様（料金プラン）:**
- 最大 10 件のプランを登録
- 各プラン: プラン名（必須・50文字以内）・料金（0以上の整数）・説明（任意・200文字以内）

**仕様（AI 提案トグル）:**
- `ai_suggestion_enabled` の ON/OFF をスライドスイッチで設定
- OFF にすると依頼者の AI クリエイター提案から除外される

---

### #18 AI クリエイター提案 API

**ファイル:**
- `app/api/ai/suggest-creators/route.ts` — 新規作成

**仕様:**
- 依頼タイトル + 依頼内容から最適なクリエイタータイプ・スキルを提案
- `ai_suggestion_enabled = false` のユーザーは 403 を返す
- レート制限: 1日 20 回（`ai_rate_limit` テーブル）
- 返却: `{ creatorTypes: string[], skills: string[], reason: string }`
- 許可リスト外のタイプ・スキルはフィルタリングして除去
- Claude Haiku 使用（max_tokens: 512）

---

### 領収書・発注書機能

**ファイル:**
- `app/api/orders/[id]/receipt/route.ts` — GET + POST
- `app/orders/[id]/receipt/page.tsx` + `ReceiptClient.tsx` — 新規作成
- `app/orders/[id]/page.tsx` — 完了後に「📄 領収書 / 発注書を発行する」リンク追加

**仕様:**
- `completed` ステータスの依頼のみ発行可能
- 種別: `receipt`（領収書）/ `purchase_order`（発注書）
- 同一種別は 1 件のみ（重複発行防止・409 を返す）
- 採番: `CM-{8桁連番}` 形式
- 消費税: 10%（小数切り捨て）
- メモ欄（任意・500文字以内）
- 納期遅延補償はプレースホルダー表示（今後実装予定）

---

### #4 チャットスレッド

**ファイル:**
- `app/api/messages/route.ts` — GET + POST 新規作成
- `app/messages/[id]/page.tsx` — 新規作成
- `app/messages/[id]/ChatThread.tsx` — 新規作成
- `app/messages/page.tsx` — スレッドリンクを `/messages/{id}` に修正・「開発中」バナー削除
- `app/orders/[id]/page.tsx` — 「💬 チャットスレッドを開く」リンク追加

**仕様:**
- 依頼ごとに 1 スレッド（`project_id` でひもづけ）
- メッセージ最大 2000 文字
- Enter 送信 / Shift+Enter 改行
- 10 秒ポーリングで自動更新
- 既読管理: GET 時に自分以外の未読メッセージを一括既読処理
- 日付区切り表示
- 送信後に相手へ通知（notifications テーブルへ INSERT）

---

### #2 メール通知スタブ

**ファイル:**
- `lib/sendEmail.ts` — 新規作成

**仕様:**
- `email_logs` テーブルにレコードを記録（status: 'stub'）
- 実送信は未実装（Resend/SendGrid の TODO コメントあり）
- 型定義: `EmailType`（order_received / order_accepted / order_cancelled / order_delivered / order_completed / message_received / review_posted）
- テンプレートヘルパー: `orderReceivedEmail()` / `orderStatusChangedEmail()`

---

### #19 管理者ダッシュボード

**ファイル:**
- `app/admin/page.tsx` — 新規作成

**仕様:**
- `ADMIN_EMAILS` 環境変数（カンマ区切り）でアクセス制御
- 表示統計: 総ユーザー数・総依頼数・アクティブな依頼・完了済み依頼・異議申し立て中
- 最近の依頼（10件）一覧
- エラーログ（直近20件）表示
- 異議申し立て中が 1 件以上あると警告バナーを表示

---

## テスト

**ファイル:** `__tests__/api.test.ts`

**実行コマンド:** `npx vitest run`

**結果:** 77 件すべてパス

| テストスイート | 件数 |
|---------------|------|
| sanitizeAiResponse | 7 |
| レビューAPI バリデーション | 8 |
| 依頼編集API バリデーション | 8 |
| 依頼作成API バリデーション | 8 |
| 料金プランバリデーション | 11 |
| 領収書API バリデーション | 8 |
| メッセージAPI バリデーション | 8 |
| AIクリエイター提案API バリデーション | 7 |
| localStorage 下書きキー | 3 |
| AIレート制限定数 | 4 |
| **合計** | **77** |

---

## ファイル一覧（今回新規作成・更新）

### 新規作成

| ファイル | 概要 |
|---------|------|
| `components/ReviewSection.tsx` | レビュー表示 + 投稿フォーム |
| `app/orders/[id]/EditOrderModal.tsx` | 依頼編集モーダル（Client Component） |
| `app/orders/[id]/receipt/page.tsx` | 領収書・発注書ページ（Server Component） |
| `app/orders/[id]/receipt/ReceiptClient.tsx` | 領収書・発注書 UI（Client Component） |
| `app/api/orders/[id]/receipt/route.ts` | 領収書・発注書 API |
| `app/messages/[id]/page.tsx` | チャットスレッドページ（Server Component） |
| `app/messages/[id]/ChatThread.tsx` | チャット UI（Client Component） |
| `app/api/messages/route.ts` | メッセージ GET + POST API |
| `app/api/ai/suggest-creators/route.ts` | AI クリエイター提案 API |
| `app/api/settings/creator-profile/route.ts` | 受注上限・料金プラン設定 API |
| `app/api/settings/ai-suggestion/route.ts` | AI 提案トグル設定 API |
| `app/settings/creator-profile/page.tsx` | クリエイター設定ページ |
| `app/admin/page.tsx` | 管理者ダッシュボード |
| `lib/logError.ts` | エラーログ基盤 |
| `lib/sendEmail.ts` | メール通知スタブ |
| `__tests__/api.test.ts` | バリデーション・ユニットテスト 77件 |

### 更新

| ファイル | 変更内容 |
|---------|---------|
| `app/orders/[id]/page.tsx` | ReviewSection・EditOrderModal・チャットリンク・領収書リンク・著作権同意表示を追加 |
| `app/orders/new/page.tsx` | copyrightAgreed・localStorage 下書き保存・AI 依頼文アシスタント追加 |
| `app/api/orders/route.ts` | copyright_agreed フィールド追加・フォールバック更新 |
| `app/dashboard/page.tsx` | クリエイター受注実績・統計セクション追加 |
| `app/messages/page.tsx` | スレッドリンク修正・「開発中」バナー削除 |
| `app/settings/page.tsx` | 「クリエイター設定」リンク追加 |
| `app/api/ai/bio/route.ts` | logError 適用 |
| `app/api/ai/request-draft/route.ts` | logError 適用 |

---

## 残課題・今後の実装予定

| 項目 | 概要 |
|------|------|
| メール実送信 | `lib/sendEmail.ts` の stub を Resend/SendGrid に差し替える |
| 納期遅延補償 | 領収書ページにプレースホルダーあり。Stripe 連携後に実装 |
| Stripe 決済連携 | エスクロー決済 |
| `admin/disputes` ページ | 異議申し立て案件の管理 UI |
| AI 提案の UI 統合 | `suggest-creators` API をフロントエンドに組み込む（検索ページ等） |

---

## DB マイグレーション（未適用の場合）

Supabase Dashboard の SQL エディタで `supabase/migrate.sql` を実行する。

実行後は必ずファイルを削除すること（git 管理外の一時ファイル）。

主な追加カラム:
- `users.display_id` CHAR(8) UNIQUE
- `users.ai_suggestion_enabled` BOOLEAN DEFAULT true
- `users.terms_agreed_at` TIMESTAMPTZ
- `projects.portfolio_allowed` BOOLEAN NOT NULL DEFAULT false
- `projects.copyright_agreed` BOOLEAN NOT NULL DEFAULT false
- `creator_profiles.order_limit` SMALLINT
- `creator_profiles.pricing_plans` JSONB DEFAULT '[]'

主な追加テーブル:
- `ai_rate_limit` + `increment_ai_rate_limit` RPC
- `receipts`
- `error_logs`
