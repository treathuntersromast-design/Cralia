# Cralia 開発セッションログ — 2026-04-11

---

## 概要

評価機能の全面実装。依頼完了後の双方向評価・プロジェクト完了後のメンバー相互評価・プロフィールへの評価表示・不服評価のサイトオーナー報告機能を追加した。

---

## 実装内容

### 1. DB スキーマ拡張

#### reviews テーブル拡張

| カラム（追加/変更） | 内容 |
|---|---|
| `reviewee_id UUID NOT NULL` | 被評価者（FK → users）|
| `review_type TEXT NOT NULL` | `order_to_creator` / `order_to_client` / `project_member` |
| `project_board_id UUID` | FK → project_boards（ボード評価時のみ。依頼評価は NULL）|
| `project_id` | NOT NULL → nullable に変更（ボード評価では NULL）|

制約:
- `reviews_source_xor` CHECK: `project_id` / `project_board_id` どちらか一方のみ
- `reviews_order_unique` UNIQUE INDEX（project_id が非 NULL の場合）
- `reviews_board_unique` UNIQUE INDEX（project_board_id が非 NULL の場合）

#### evaluation_reports テーブル（新規）

| カラム | 内容 |
|---|---|
| `id UUID PK` | |
| `review_id UUID NOT NULL` | FK → reviews（CASCADE DELETE）|
| `reporter_id UUID NOT NULL` | FK → users（報告者）|
| `reason TEXT NOT NULL` | 報告理由（最大1000文字）|
| `status TEXT` | `pending` / `reviewing` / `resolved` / `dismissed` |
| `admin_note TEXT` | 管理者対応メモ |
| `created_at / resolved_at` | |
| UNIQUE `(review_id, reporter_id)` | 重複報告防止 |

#### migrate.sql（実行待ち）

`supabase/migrate.sql` を Supabase Dashboard の SQL エディタで実行すること。

---

### 2. API

| ファイル | 内容 |
|---|---|
| `app/api/reviews/route.ts` | 双方向対応。依頼者 → `order_to_creator`、クリエイター → `order_to_client` で自動判別 |
| `app/api/reviews/project-board/route.ts` | GET: ボード評価一覧 / POST: 全メンバー一括評価（空 or 全員のみ）|
| `app/api/reviews/report/route.ts` | POST: 評価への異議申し立て。被評価者のみ報告可能 |

#### プロジェクトボード評価の一括ルール（API）

- `evaluations` 配列が空 → スキップ（評価しない）
- `evaluations` 配列の長さ === 他メンバー全員数 → 一括投稿
- それ以外 → 400 エラー（一部だけの評価は禁止）
- 自己評価不可・メンバー以外不可・重複不可

---

### 3. フロントエンド

#### コンポーネント（新規）

| ファイル | 内容 |
|---|---|
| `components/EvaluationReportModal.tsx` | 評価報告モーダル（理由入力 → 送信）。送信完了後に「1〜2週間かかる旨」を表示 |
| `components/ProjectBoardReviewSection.tsx` | プロジェクト完了後のメンバー相互評価 UI。全員一括フォーム・自分への評価表示・報告ボタン |

#### コンポーネント（更新）

| ファイル | 変更内容 |
|---|---|
| `components/ReviewSection.tsx` | 双方向対応（`isCreator` / `clientId` / `creatorId` props 追加）。レビューカードに「報告する」ボタン追加（被評価者のみ表示） |
| `components/ProfilePageClient.tsx` | 評価セクション追加（3種別の統計カード + 直近5件のレビュー一覧 + 報告ボタン） |

#### ページ（更新）

| ファイル | 変更内容 |
|---|---|
| `app/orders/[id]/page.tsx` | ReviewSection に `isCreator` / `clientId` / `creatorId` / `reviewee_id` / `review_type` を追加 |
| `app/projects/[id]/page.tsx` | `ProjectBoardReviewSection` を追加（完了後に評価フォーム表示）|
| `app/profile/[id]/page.tsx` | 評価統計取得（`evalAsCreator` / `evalAsClient` / `evalAsMember` / `recentReviews`）|
| `app/admin/page.tsx` | 評価報告セクション追加（未対応件数バナー + 直近20件一覧）|

---

### 4. 定数

`lib/constants/validation.ts` に追加:

```typescript
REVIEW_COMMENT_MAX: 500,  // 評価コメント上限
REPORT_REASON_MAX:  1000, // 報告理由上限
```

---

## 報告機能の仕様

- **報告できる対象**: 自分への評価（`reviewee_id === currentUserId`）のみ
- **報告できる場所**: 依頼詳細ページのレビューカード / プロジェクト詳細ページのメンバー評価 / プロフィールページの評価一覧
- **同一レビューへの重複報告**: 不可（409 を返す）
- **モーダル内の注記**: 「報告への対応には 1〜2 週間程度かかる場合があります」
- **送信完了後の注記**: 同様に表示
- **管理者側**: `app/admin/page.tsx` で未対応件数をバナー表示 + 直近20件一覧表示

---

## 変更ファイル一覧

### 新規作成

| ファイル | 概要 |
|---|---|
| `supabase/ddl/public/evaluation_reports.sql` | 報告テーブル DDL |
| `supabase/migrate.sql` | reviews 拡張 + evaluation_reports 新規作成マイグレーション |
| `app/api/reviews/project-board/route.ts` | ボードメンバー一括評価 API |
| `app/api/reviews/report/route.ts` | 評価報告 API |
| `components/EvaluationReportModal.tsx` | 評価報告モーダル |
| `components/ProjectBoardReviewSection.tsx` | プロジェクトボード評価 UI |

### 更新

| ファイル | 変更内容 |
|---|---|
| `supabase/ddl/public/reviews.sql` | reviewee_id / review_type / project_board_id / 制約追加 |
| `lib/constants/validation.ts` | REVIEW_COMMENT_MAX / REPORT_REASON_MAX 追加 |
| `app/api/reviews/route.ts` | 双方向評価対応 |
| `components/ReviewSection.tsx` | 双方向 + 報告ボタン |
| `components/ProfilePageClient.tsx` | 評価セクション追加 |
| `app/orders/[id]/page.tsx` | ReviewSection 新 props |
| `app/projects/[id]/page.tsx` | ProjectBoardReviewSection 追加 |
| `app/profile/[id]/page.tsx` | 評価統計取得 |
| `app/admin/page.tsx` | 評価報告セクション追加 |

---

## DB マイグレーション（未適用の場合）

Supabase Dashboard の SQL エディタで `supabase/migrate.sql` を実行する。

実行後は **必ずファイルを削除**すること（git 管理外の一時ファイル）。

主な変更:
- `reviews.reviewee_id` NOT NULL 追加
- `reviews.review_type` NOT NULL 追加
- `reviews.project_board_id` 追加
- `reviews.project_id` → nullable に変更
- `evaluation_reports` テーブル新規作成
