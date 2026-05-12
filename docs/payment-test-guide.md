# プラットフォーム預かり決済 テストガイド

> 対象ブランチ: `develope_Ver.0.01`  
> テスト仕様書: `手動テスト仕様書.xlsx` → シート「手動テスト仕様書」TC-PAY-001〜020、シート「エスクローシナリオ」S-001〜004

---

## 目次

1. [テスト環境の準備](#1-テスト環境の準備)
2. [ハッピーケーステスト手順](#2-ハッピーケーステスト手順)
3. [エッジケーステスト手順](#3-エッジケーステスト手順)
4. [DB 確認クエリ集](#4-db-確認クエリ集)
5. [Stripe CLI コマンド一覧](#5-stripe-cli-コマンド一覧)
6. [テスト後の後片付け](#6-テスト後の後片付け)

---

## 1. テスト環境の準備

### 1-1. 環境変数の設定

`.env.local` に以下を追加する。

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=<stripe listen 実行時にターミナルに表示される値をここに貼り付け>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_USER_IDS=<管理者ユーザーの UUID>
```

- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) の「テストキー」から取得
- `STRIPE_WEBHOOK_SECRET`: 後述の `stripe listen` 起動時にターミナルに表示される `whsec_...` の値
- `ADMIN_USER_IDS`: Supabase `auth.users` テーブルで確認できる管理者アカウントの `id`（複数の場合はカンマ区切り）

### 1-2. Stripe CLI のインストールと認証

```bash
# インストール（未インストールの場合）
# Windows: https://stripe.com/docs/stripe-cli#install からインストーラーをダウンロード

# ログイン
stripe login

# 認証確認
stripe whoami
```

### 1-3. ローカルサーバーと Stripe Webhook 転送の起動

**ターミナル A**（開発サーバー）:
```bash
npm run dev
```

**ターミナル B**（Webhook 転送 — webhook を使うテストで必須）:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

起動時に表示される `whsec_...` をコピーして `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定し、サーバーを再起動する。

### 1-4. テストアカウントの確認

`手動テスト仕様書.xlsx` の「テストアカウント」シートを参照。  
テスト前に `supabase/seeds/test_accounts.sql` を Supabase SQL Editor で実行してアカウントを作成しておくこと。

| ID | メール | 役割 |
|---|---|---|
| TC-U01 | client01@cralia-test.com | 依頼者 |
| TC-U02 | creator01@cralia-test.com | クリエイター |
| TC-U05 | admin01@cralia-test.com | 管理者（ADMIN_USER_IDS に UUID を追加） |

### 1-5. Stripe テストカード一覧

| カード番号 | 動作 | 用途 |
|---|---|---|
| `4242 4242 4242 4242` | 成功 | 通常決済テスト |
| `4000 0000 0000 9995` | 残高不足で失敗 | 失敗ケーステスト |
| `4000 0025 0000 3155` | 3DS 認証が要求される | 3DS テスト |

有効期限・CVV は任意の値（例: `12/34` / `123`）で可。

### 1-6. DB 事前確認（テスト開始前）

Supabase SQL Editor で実行:

```sql
-- 対象プロジェクトのpayments が空であることを確認
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;

-- stripe_webhook_events が空またはクリーンであることを確認
SELECT * FROM stripe_webhook_events ORDER BY processed_at DESC LIMIT 10;
```

---

## 2. ハッピーケーステスト手順

### TC-PAY-001: 決済ボタン表示確認

1. TC-U01 でログイン
2. 有償依頼（`order_type = 'paid'`）の依頼詳細ページ `/orders/{id}` を開く
3. 「検収後支払い」セクションに **「プラットフォーム預かりで決済する」** ボタンが表示されることを確認
4. 無償依頼（`order_type = 'free'`）の依頼詳細ページを開き、セクション自体が **非表示** であることを確認
5. TC-U02（クリエイター）でログインして同じ有償依頼を開き、決済ボタンが **非表示** であることを確認

---

### TC-PAY-002〜003: Checkout 決済完了フロー（ハッピーケース）

> **前提**: ターミナル B で `stripe listen` が動いていること

1. TC-U01 でログインし、有償依頼（`in_progress` 状態）の詳細ページを開く
2. **「プラットフォーム預かりで決済する」** ボタンをクリック
3. Stripe Checkout 画面が開くことを確認
4. テストカード `4242 4242 4242 4242` / `12/34` / `123` を入力して決済
5. `/payments/success` ページへ遷移することを確認
6. Supabase でステータスを確認:

```sql
SELECT id, status, paid_at, stripe_payment_intent_id, amount
FROM payments
WHERE project_id = '<対象プロジェクトID>'
ORDER BY created_at DESC LIMIT 1;
-- 期待: status = 'held', paid_at と stripe_payment_intent_id が記録されている
```

7. `/orders/{id}` を再度開き、「**お預かり中（検収後支払い）**」バッジが表示されることを確認（TC-PAY-003）

---

### TC-PAY-004: 管理者 支払確定（held → payout_pending）

1. TC-U05 でログイン
2. `/admin/payments` を開く
3. `held` ステータスの対象支払い行を確認し **「支払確定」** ボタンをクリック
4. 確認モーダルが表示されることを確認し **「確定する」** を押す
5. ステータスバッジが **「支払確定済み」** に変わることを確認
6. DB 確認:

```sql
SELECT status FROM payments WHERE id = '<payment_id>';
-- 期待: 'payout_pending'
```

---

### TC-PAY-005: 管理者 振込済み登録（payout_pending → payout_paid）

1. `payout_pending` ステータスの支払いがある状態で `/admin/payments` を開く
2. **「振込済み登録」** ボタンをクリック
3. 口座情報を入力（例: `三菱UFJ銀行 普通 1234567 テスト太郎`）
4. 確認モーダルで **「確定する」** を押す
5. ステータスバッジが **「振込済み」** に変わることを確認
6. DB 確認:

```sql
SELECT cp.amount, cp.paid_at, cd.bank_info
FROM creator_payouts cp
LEFT JOIN creator_payout_bank_details cd ON cd.creator_payout_id = cp.id
WHERE cp.payment_id = '<payment_id>';
-- 期待: amount = (payment.amount - fee - refunded_amount), paid_at が記録される
```

---

### TC-PAY-006: クリエイター収益カード表示

1. TC-U02 でログイン
2. `/dashboard` を開く
3. 右カラムの **「検収後支払い」** カードを確認
   - 「振込済み合計」: `creator_payouts.amount` の合計
   - 「振込待ち」: `payout_pending` 案件の `payout_amount` 合計
4. 金額が存在しない場合は **「—」** が表示されることを確認

---

## 3. エッジケーステスト手順

### TC-PAY-007: 二重決済防止（pending 再クリック）

1. Checkout Session を作成した後、`/payments/cancel` でキャンセルして元のページへ戻る（セッションはまだ `open`）
2. 再度 **「決済を続ける」** ボタンをクリック
3. 同じ Checkout URL が再返却されることを確認（新しいセッションは作成されない）

DB 確認:
```sql
SELECT COUNT(*) FROM payments WHERE project_id = '<id>' AND status = 'pending';
-- 期待: 1件のみ（増えていない）
```

---

### TC-PAY-008: 二重決済防止（held 状態での API 直接呼び出し）

`payments.status = 'held'` の状態で直接 API を呼ぶ:

```bash
curl -X POST http://localhost:3000/api/payments/create-checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: <ログイン済みの Cookie>" \
  -d '{"project_id": "<project_id>"}'
# 期待: 409 {"error":"この依頼はすでに決済処理中または完了済みです"}
```

---

### TC-PAY-009: Checkout Session 期限切れ → expired

```bash
# pending 状態の payments が存在する状態で実行
stripe trigger checkout.session.expired
```

DB 確認:
```sql
SELECT status FROM payments WHERE project_id = '<id>' ORDER BY created_at DESC LIMIT 1;
-- 期待: 'expired'
```

依頼詳細ページで再度 **「プラットフォーム預かりで決済する」** ボタンが表示されることを確認。

---

### TC-PAY-010: 決済失敗カードでのエラーハンドリング

1. Checkout 画面でテストカード `4000 0000 0000 9995` を入力
2. 決済が失敗し `/payments/cancel` へ遷移することを確認
3. `payments.status` が `pending` のままであることを確認（`failed` に変わらない）
4. 再度決済ボタンが表示されることを確認

---

### TC-PAY-011: 全額返金フロー

> **前提**: `payments.status = 'held'`、`stripe listen` が動いていること

1. `/admin/payments` で **「返金」** ボタンをクリック
2. 返金額はデフォルト（全額）のまま確認モーダルで確定
3. 即座に `payments.status = 'refund_pending'` になることを確認
4. ターミナル B で `refund.created` → `refund.updated` が処理されるのを確認
5. DB 確認:

```sql
SELECT p.status, p.refunded_amount, r.status AS refund_status
FROM payments p
LEFT JOIN refunds r ON r.payment_id = p.id
WHERE p.id = '<payment_id>';
-- 期待: status = 'refunded', refunded_amount = 全額, refund_status = 'succeeded'
```

---

### TC-PAY-012: 部分返金フロー

1. `/admin/payments` で **「返金」** ボタンをクリック
2. 返金額に **3000** を入力して確定
3. webhook 処理後の DB を確認:

```sql
SELECT status, refunded_amount FROM payments WHERE id = '<id>';
-- 期待: status = 'partially_refunded', refunded_amount = 3000
```

---

### TC-PAY-013: refund_pending 中の全操作ブロック

`payments.status = 'refund_pending'` の状態:

1. 管理画面で全ボタンが **disabled（非活性）** になっていることを確認
2. API 直接呼び出しでも 423 が返ることを確認:

```bash
curl -X POST http://localhost:3000/api/admin/payments/<id>/confirm-payout \
  -H "Cookie: <管理者Cookie>"
# 期待: 423 {"error":"返金処理中のため操作できません"}
```

---

### TC-PAY-014: payout_pending からの直接返金ブロック

```bash
curl -X POST http://localhost:3000/api/admin/payments/<id>/refund \
  -H "Cookie: <管理者Cookie>" \
  -H "Content-Type: application/json"
# 期待: 409 {"error":"支払確定済みです。返金する場合はまず支払確定を取消してください。"}
```

---

### TC-PAY-015〜016: 支払確定取消

**TC-PAY-015（refunded_amount = 0 → held に戻る）**:

1. `payout_pending` かつ `refunded_amount = 0` の支払いで **「支払確定取消」** をクリック
2. `status = 'held'` に戻ることを確認

**TC-PAY-016（refunded_amount > 0 → partially_refunded に戻る）**:

1. 部分返金済み（`refunded_amount = 3000`）かつ `payout_pending` の支払いで **「支払確定取消」**
2. `status = 'partially_refunded'` に戻ることを確認（`held` にはならない）

---

### TC-PAY-017: 超過返金ブロック

```bash
# amount = 10000 の payments に対して 10001 円の返金を試みる
curl -X POST http://localhost:3000/api/admin/payments/<id>/refund \
  -H "Cookie: <管理者Cookie>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10001}'
# 期待: 400 {"error":"返金可能額（10000円）を超えています"}
```

---

### TC-PAY-018: Webhook 冪等性

1. 処理済みの `stripe_webhook_events` レコードの `event_id` を取得:

```sql
SELECT event_id FROM stripe_webhook_events WHERE status = 'processed' LIMIT 1;
```

2. 同じ `event_id` で再度 webhook を送信（`stripe listen` のログから生のリクエストを再利用）
3. レスポンスが `200` で `{ "skipped": "already processed or in progress" }` であることを確認
4. `payments.status` が変わっていないことを確認

---

### TC-PAY-019: 手動調整記録（記録のみ）

1. `/admin/payments` で **「手動調整」** ボタンをクリック
2. 金額 `-500`、理由 `品質問題による調整` を入力して送信
3. DB 確認:

```sql
SELECT * FROM payment_adjustments ORDER BY created_at DESC LIMIT 1;
-- 期待: amount=-500, reason='品質問題による調整', admin_id が記録される

SELECT amount FROM payments WHERE id = '<id>';
-- 期待: amount は変わっていない（調整額は非反映）
```

4. API レスポンスに `"note": "この調整は支払額の計算に影響しません（記録のみ）"` が含まれることを確認

---

### TC-PAY-020: 金額不一致 webhook → payment_mismatch

```sql
-- テスト準備: payments.amount を Stripe セッションの実額と意図的にずらす
UPDATE payments SET amount = 99999 WHERE id = '<payment_id>';
```

```bash
stripe trigger checkout.session.completed
```

DB 確認:
```sql
SELECT status FROM payments WHERE id = '<payment_id>';
-- 期待: 'payment_mismatch'（held にはならない）
```

管理画面で **「要確認」** ステータスとして表示されることを確認。

---

## 4. DB 確認クエリ集

```sql
-- payments の現在状態一覧
SELECT p.id, p.status, p.amount, p.fee, p.refunded_amount,
       p.paid_at, p.stripe_payment_intent_id,
       pr.title AS project_title
FROM payments p
JOIN projects pr ON pr.id = p.project_id
ORDER BY p.created_at DESC
LIMIT 20;

-- webhook 処理ログ
SELECT event_id, event_type, status, error_message, processed_at
FROM stripe_webhook_events
ORDER BY processed_at DESC
LIMIT 20;

-- 返金履歴
SELECT r.stripe_refund_id, r.amount, r.status, r.previous_payment_status, r.failure_reason
FROM refunds r
WHERE r.payment_id = '<payment_id>';

-- クリエイター振込記録
SELECT cp.amount, cp.paid_at, cd.bank_info
FROM creator_payouts cp
LEFT JOIN creator_payout_bank_details cd ON cd.creator_payout_id = cp.id
WHERE cp.creator_id = '<creator_uuid>';

-- 手動調整履歴
SELECT pa.amount, pa.reason, pa.created_at
FROM payment_adjustments pa
WHERE pa.payment_id = '<payment_id>'
ORDER BY pa.created_at DESC;

-- payout_amount の計算確認
SELECT id, amount, fee, refunded_amount,
       amount - fee - refunded_amount AS payout_amount
FROM payments
WHERE status IN ('payout_pending', 'payout_paid');
```

---

## 5. Stripe CLI コマンド一覧

```bash
# Webhook ローカル転送（必須）
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# イベントトリガー
stripe trigger checkout.session.completed
stripe trigger checkout.session.expired
stripe trigger refund.created
stripe trigger refund.updated

# 特定の Payment Intent で返金をシミュレート
stripe refunds create \
  --payment-intent pi_xxxxxxxxxxxxxxxxxxxxxxxx \
  --amount 3000

# Stripe ダッシュボードで直接確認
# https://dashboard.stripe.com/test/payments
# https://dashboard.stripe.com/test/refunds
```

---

## 6. テスト後の後片付け

### DB のリセット（テストデータ削除）

```sql
-- 注意: 本番環境では絶対に実行しないこと

-- テスト用 payments を削除（cascade で refunds 等も削除される）
DELETE FROM payments
WHERE project_id IN (
  SELECT id FROM projects WHERE title LIKE '%テスト%'
);

-- webhook events をリセット
DELETE FROM stripe_webhook_events;

-- 手動調整履歴をリセット（必要な場合のみ）
-- DELETE FROM payment_adjustments WHERE created_at > '2026-01-01';
```

### Stripe テストデータの確認

[Stripe Dashboard（テストモード）](https://dashboard.stripe.com/test/payments) で作成された決済・返金を確認し、必要に応じてキャンセル処理を行う。

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `STRIPE_SECRET_KEY is not set` エラー | `.env.local` が未設定 | `.env.local` に `STRIPE_SECRET_KEY` を追加してサーバー再起動 |
| Webhook が `payments.status` を更新しない | `STRIPE_WEBHOOK_SECRET` が違う | `stripe listen` 起動時の `whsec_...` を再コピーして設定 |
| `409 この依頼はすでに決済処理中` | 既存の active payment がある | DB で `payments.status` を確認。不要なら手動で `expired` / `failed` に更新 |
| 管理画面が `403` | `ADMIN_USER_IDS` に UUID が入っていない | ログイン中ユーザーの UUID を `.env.local` の `ADMIN_USER_IDS` に追加 |
| `refund_pending` が解消されない | webhook が届いていない | `stripe listen` が動いているか確認。`stripe_webhook_events` テーブルで `status = 'failed'` のレコードを確認 |
