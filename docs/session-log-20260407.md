# CreMatch 開発セッションログ — 2026-04-07

---

## 概要

前回セッション（2026-04-05/06）からの引き継ぎ。ダッシュボード改善・プロジェクトスケジュール機能の実装・UI 全体の統一を行った。

---

## 実装内容

### 1. プロジェクトスケジュール機能

担当者・依存関係付きタスク管理とダッシュボード表示を追加した。

#### DB スキーマ変更

| ファイル | 内容 |
|---------|------|
| `supabase/ddl/public/project_tasks.sql` | `assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL`・`description TEXT` を追加 |
| `supabase/ddl/public/project_task_deps.sql` | 新規作成。タスク間依存関係テーブル（`task_id` → `depends_on_id`、自己参照 CHECK、UNIQUE制約、RLS付き） |
| `supabase/migrate.sql` | 上記2点を既存DBに適用するマイグレーション手順を追記 |

#### API

**`app/api/projects/[id]/schedule/route.ts`** — 新規作成

- **GET**: タスク一覧 + 担当者名 + 依存関係 + ブロック状態（`is_blocked`, `blocked_by`）を返す
  - `project_task_deps` テーブル未存在・`assigned_user_id` カラム未追加時の42703フォールバック対応
- **POST**: タスク全置換（owner のみ）。依存関係IDを `idMap`（旧UUID/tempID → 新UUID）で解決する

**ブロック状態計算ロジック:**
```
depMap[task_id] → depends_on_ids[]
statusMap[task_id] → status
blockedBy = deps.filter(depId => statusMap[depId] !== 'done')
```

**依存ID解決ロジック（バグ修正含む）:**
```
idMap[t.id] = insertedIds[i]          // 旧/temp ID → 新UUID
resolvedId = idMap[depId] ?? depId
除外条件: 自己参照 OR バッチ外UUID
```

#### コンポーネント

**`components/ProjectSchedule.tsx`** — 新規作成

- `GET /api/projects/[id]/schedule` からタスクを取得して表示
- `initialTaskCount === 0` の場合は fetch をスキップし空状態を即表示（エラー表示なし）
- **表示モード**: ステータスバッジ・担当者名・納期（色分け）・ブロック警告
  - 赤: 2日以内または超過、黄: 3〜6日、グレー: 7日以上
  - ブロック中: 「「イラスト制作」が完了していないため着手できません」
- **編集モード**（owner のみ）: タイトル・説明・担当者（プロジェクトメンバーから選択）・納期・ステータス・前提タスク（チェックボックス）
- **Props**: `projectId`, `isOwner`, `members: {userId, name}[]`, `initialTaskCount`

#### プロジェクト詳細ページ更新

**`app/projects/[id]/page.tsx`**

- `ProjectSchedule` をインポートして既存タスク（カンボン）セクションの下に追加
- 役職割り当て済みユーザーを重複排除して `scheduleMembers` として渡す
- `(tasks ?? []).length` を `initialTaskCount` として渡す

---

### 2. ダッシュボード改善

**`app/dashboard/page.tsx`**

#### セクション順序変更

**変更前:** ウェルカム → 受注実績 → クイックアクション → 稼働中プロジェクト → アクティブな依頼 → カレンダー

**変更後:** ウェルカム → **稼働中プロジェクト** → **アクティブな依頼** → 受注実績 → クイックアクション → **マイタスク** → カレンダー → 開発中機能

#### 納期カラーコーディング

依頼カード（受注・発注）に納期を色付きで強調表示：

```typescript
function deadlineColor(deadline: string | null): string  // 赤/黄/グレー
function deadlineLabel(deadline: string | null): string  // "04/10（あと3日）" 形式
```

- 超過: 赤 `#ff6b9d`（「N日超過」）
- 当日: 赤（「今日」）
- 2日以内: 赤
- 3〜6日: 黄 `#fbbf24`
- 7日以上: グレー `#7c7b99`

依頼カードのボーダーも超過時は赤ハイライト。

#### マイタスクセクション（新規）

担当として割り当てられた未完了タスクをダッシュボードに表示。

**サーバー側クエリ:**
```typescript
db.from('project_tasks')
  .select('id, title, status, due_date, project_id, project_boards(id, title)')
  .eq('assigned_user_id', user.id)
  .neq('status', 'done')
  .order('due_date', { ascending: true })
  .limit(10)
```

**ブロック計算:**
1. `project_task_deps` から自分のタスクの deps を取得
2. upstream タスクのステータスを取得
3. `status !== 'done'` の upstream → `blockedBy` 配列を構成

**表示内容:** タスク名・プロジェクト名・納期（色付き）・着手待ちバッジ・ブロック詳細（「「X」が完了していないため着手できません」）

---

### 3. スケジュール読み込みエラー修正

**問題:** `assigned_user_id` / `description` カラム未追加時（マイグレーション未適用）にGETが500を返し、コンポーネントが「スケジュールの読み込みに失敗しました」を表示していた。

**対処2点:**

1. **`route.ts` GET ハンドラ**: `tasksErr.code === '42703'` 時に `description`・`assigned_user_id` を省いた簡易クエリでリトライ
2. **`ProjectSchedule.tsx`**: `initialTaskCount === 0` → fetch スキップ（空状態を即表示、エラーなし）

---

### 4. ドロップダウン選択肢の文字色修正

**`app/globals.css`** に追加:

```css
option {
  color: #000000;
  background-color: #ffffff;
}
```

OS描画のドロップダウン選択肢が白文字で見えない問題を解消。サイト全体に適用。

---

### 5. UI 全体の統一

全ページにわたるスタイルの不統一を修正。

#### globals.css — フォントファミリー一元化

```css
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

各ページで個別に書いていた `fontFamily` 指定を削除（`orders/[id]`, `orders/new`, `settings/creator-profile`, `admin`）。

#### 統一基準と修正ファイル一覧

| 項目 | 修正前 | 修正後 | 対象ファイル |
|------|--------|--------|------------|
| ページタイトル | `22px` / `26px` 混在 | `24px` | orders/[id], orders/new, messages, settings, creator-profile |
| セクションラベル letterSpacing | `0.06em` | `0.08em` | orders/[id], creator-profile, admin |
| カード背景 | `rgba(22,22,31,0.8)` | `rgba(22,22,31,0.9)` | orders/[id], messages, creator-profile, admin |
| Input padding | `12px 14px` / `10px 12px` / `8px 12px` | `10px 14px` | orders/new, creator-profile, ProjectSchedule |
| Input fontSize | `15px` / `13px` | `14px` | orders/new, ProjectSchedule |
| Input borderRadius | `8px` | `10px` | creator-profile, ProjectSchedule |
| ボタン fontSize | `15px` | `14px` | orders/new, creator-profile |
| fontFamily 宣言 | 各ページで個別指定 | globals.css に一元化 | 4ページから削除 |

---

### 6. テスト追加（スケジュール機能）

**`__tests__/api.test.ts`** に92件追加（既存77件 → 合計169件、全件パス）。

| スイート | 件数 | カバレッジ内容 |
|---------|------|--------------|
| スケジュールAPI POSTバリデーション | 23件 | 配列チェック・100件上限・タイトル必須/100字・説明500字・ステータス列挙・複合エラー |
| ブロック状態計算 | 13件 | 未依存/done/todo/in_progress・複数依存・チェーン構造・不明タスク・全done |
| 依存ID解決 (idMap) | 13件 | 既存UUID→新UUID・temp ID・自己参照除外・バッチ外UUID除外・数値/null型除外・重複dep |
| dueDateInfo | 12件 | null・今日・+1/2/3/6/7/30日・超過日数（正数保証） |
| deadlineColor/Label | 17件 | null・境界値（0/2/3/6/7日）・超過・日付フォーマット |
| マイタスクブロック計算 | 8件 | 無依存・done/todo/in_progress・混在・他タスクdep無視・不明タスク・undefined status |

---

## 変更ファイル一覧

| ファイル | 種別 | 内容 |
|---------|------|------|
| `supabase/ddl/public/project_tasks.sql` | 更新 | assigned_user_id・description カラム追加 |
| `supabase/ddl/public/project_task_deps.sql` | 新規 | 依存関係テーブル DDL |
| `supabase/migrate.sql` | 更新 | スケジュール機能マイグレーション追記 |
| `app/api/projects/[id]/schedule/route.ts` | 新規 | GET（ブロック計算付き）+ POST（idMap解決） |
| `components/ProjectSchedule.tsx` | 新規 | スケジュール表示・編集コンポーネント |
| `app/projects/[id]/page.tsx` | 更新 | ProjectSchedule 追加 |
| `app/dashboard/page.tsx` | 更新 | セクション順序変更・納期色分け・マイタスク追加 |
| `app/globals.css` | 更新 | option 黒文字・fontFamily 一元化 |
| `app/orders/[id]/page.tsx` | 更新 | タイトル24px・letterSpacing 0.08em・カード背景統一・fontFamily削除 |
| `app/orders/new/page.tsx` | 更新 | タイトル24px・input/ボタンスタイル統一・fontFamily削除 |
| `app/messages/page.tsx` | 更新 | タイトル24px・カード背景統一 |
| `app/settings/page.tsx` | 更新 | タイトル24px |
| `app/settings/creator-profile/page.tsx` | 更新 | タイトル24px・letterSpacing・input/ボタン統一・fontFamily削除 |
| `app/admin/page.tsx` | 更新 | letterSpacing 0.08em・カード背景統一・fontFamily削除 |
| `__tests__/api.test.ts` | 更新 | スケジュール機能テスト92件追加（合計169件） |

---

## 技術的決定事項

| 決定 | 理由 |
|------|------|
| `initialTaskCount === 0` のとき fetch スキップ | マイグレーション未適用環境でのエラー表示を防ぐ。タスクがないなら API 呼び出し不要 |
| 依存ID解決を `idMap`（旧→新）方式に変更 | POST で全タスクを再挿入するため UUID が変わる。クライアントが元の ID を送り、サーバーが新 UUID に変換する |
| 42703 フォールバックを GET にも追加 | マイグレーション前後でスムーズに動作させるため |
| `fontFamily` を globals.css に一元化 | ページ個別指定の重複をなくし、将来のフォント変更を1箇所で対応可能にする |
| セクションラベルを `0.08em` に統一 | dashboard が基準値として定着していたため他を合わせる |
