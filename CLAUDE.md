# Cralia コーディング規約

> **規約の不明点について**
> この規約の内容でわからないことや曖昧な点があれば、作業を進める前に必ずユーザーに確認すること。

## SQL ファイル管理規約

### ディレクトリ構成

```
supabase/
├── ddl/
│   ├── master/     # マスタテーブル（m_ プレフィックス）
│   └── public/     # ビジネステーブル（通常のアプリテーブル）
├── stored/         # ストアドファンクション・トリガー
└── misc/           # ストレージ設定など（手動対応含む）
```

### ファイル命名規則

- ファイル名はテーブル名（またはオブジェクト名）そのまま。数字プレフィックスは使用しない。
  - 例: `users.sql`, `m_activity_style.sql`, `auth_trigger.sql`
- マスタテーブルは `m_` プレフィックスを付ける。
  - 例: `m_activity_style.sql`, `m_order_type.sql`

### トランザクション

- **すべての SQL ファイルは `BEGIN;` / `COMMIT;` でラップする。**
- 複数テーブルにまたがる変更（ALTER + UPDATE）も必ず 1 トランザクション内で完結させる。

```sql
BEGIN;

-- DDL / DML

COMMIT;
```

### マスタテーブル設計

マスタテーブルは以下の標準カラム構成を使用する。

```sql
CREATE TABLE IF NOT EXISTS public.m_xxx (
  code       SMALLINT    PRIMARY KEY,          -- 整数コード値
  value      TEXT        NOT NULL UNIQUE,       -- アプリ内部キー（英数字・小文字）
  label_ja   TEXT        NOT NULL,              -- 日本語表示名
  sort_order SMALLINT    NOT NULL DEFAULT 0,    -- 表示順
  is_active  BOOLEAN     NOT NULL DEFAULT true  -- 有効フラグ
);
```

- `code`：整数の主キー。1 から連番で割り当てる。
- `value`：アプリコードで参照する内部キー。**必ず小文字・英数字で統一する**。
- `label_ja`：UI に表示する日本語ラベル。

#### 初期データ投入

```sql
INSERT INTO public.m_xxx (code, value, label_ja, sort_order) VALUES
  (1, 'foo', 'フー', 1),
  (2, 'bar', 'バー', 2)
ON CONFLICT (code) DO NOTHING;  -- 冪等性を保つ
```

#### RLS

マスタテーブルは全ユーザーに SELECT を許可する。

```sql
ALTER TABLE public.m_xxx ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "m_xxx_select_all" ON public.m_xxx;
CREATE POLICY "m_xxx_select_all" ON public.m_xxx FOR SELECT USING (true);
```

### ビジネステーブルのコード値カラム設計

| 列の性質 | 設計方針 |
|---|---|
| 単一値（TEXT）| マスタの `value` に FK 参照（型はそのまま TEXT）|
| 配列（TEXT[]）| マスタは参照のみ。FK 制約は不可のため CHECK 不使用、アプリ側で制御 |
| 主要 ID 列（roles など）| マスタの `code`（SMALLINT）に FK 参照する専用 ID カラムに置き換える |

FK 参照例（TEXT 列）:

```sql
-- マスタの value（TEXT UNIQUE）を FK 先に指定
availability TEXT NOT NULL DEFAULT 'open'
             REFERENCES public.m_availability(value),
```

FK 参照例（SMALLINT 列 / roles 置き換えパターン）:

```sql
-- users.roles TEXT[] → activity_style_id SMALLINT FK
activity_style_id SMALLINT REFERENCES public.m_activity_style(code),
```

CHECK 制約はマスタ FK に切り替えが完了したら削除する（重複管理を避ける）。

### 一括マイグレーション（スキーマ変更時）

既存 DB に適用する必要がある場合は、`supabase/migrate.sql` を一時的に作成して使用する。

- **実行後は必ず削除する**（git 管理しない一時ファイル）。
- ファイルの冒頭に「実行前チェッククエリ」を記載する。
- ファイルの末尾に「実行後確認クエリ」をコメントで記載する。

```
supabase/migrate.sql   ← 実行後に削除
```

マイグレーションファイルの構成テンプレート:

```sql
-- ================================================================
-- Cralia 一括マイグレーション
-- 実行後はこのファイルを削除してください。
--
-- 【実行前チェック】
--   ...確認クエリ...
-- ================================================================

BEGIN;

-- STEP 1: マスタテーブル作成 + 初期データ投入
-- STEP 2: 既存テーブルのデータ移行
-- STEP 3: FK 制約・CHECK 制約の切り替え
-- STEP N: Auth Trigger 更新

COMMIT;

-- ================================================================
-- 【実行後の確認クエリ】
--   ...確認クエリ...
-- ================================================================
```

#### データ移行時の注意事項

- **表記ゆれの正規化は FK 追加より前に実行する。**
  - 例: `platform = 'YouTube'` → `'youtube'` に UPDATE してから FK を追加する。
  - マスタに存在しない値は `'other'` などの汎用値に集約する。
- 既存の CHECK 制約は `DROP CONSTRAINT IF EXISTS` で削除してから FK に切り替える。
- PostgreSQL の自動生成制約名は `{テーブル名}_{カラム名}_check` の形式。

```sql
-- CHECK → FK 切り替えパターン
ALTER TABLE public.foo DROP CONSTRAINT IF EXISTS foo_bar_check;
ALTER TABLE public.foo DROP CONSTRAINT IF EXISTS foo_bar_fk;
ALTER TABLE public.foo
  ADD CONSTRAINT foo_bar_fk FOREIGN KEY (bar) REFERENCES public.m_bar(value);
```

### COMMENT

テーブルおよびカラムには必ず `COMMENT` を付与する。
FK 参照カラムは参照先を明記する。

```sql
COMMENT ON COLUMN public.users.activity_style_id IS 'FK → m_activity_style.code（1: クリエイター, 2: 依頼者, 3: 両方）';
COMMENT ON COLUMN public.users.entity_type       IS 'FK → m_entity_type.value（individual / corporate）';
```

### 依存関係の実行順序

Supabase Dashboard で手動実行する場合は以下の順序を守る。

1. `ddl/master/*.sql`（マスタテーブル。依存関係なし）
2. `ddl/public/users.sql`（auth.users + マスタに依存）
3. `ddl/public/*.sql`（users に依存するテーブル群）
4. `stored/auth_trigger.sql`（users テーブルに依存）
5. `misc/storage.sql`（手動対応の説明のみ）

---

## フロントエンド / API コーディング規約

### 定数管理：ハードコーディング禁止

マジックナンバー・マジックストリング・重複定義は禁止する。
すべての共有定数は `lib/constants/` に集約する。

```
lib/constants/
├── activity.ts    # 活動スタイル ID・変換ヘルパー
├── validation.ts  # バリデーション上限値
├── statuses.ts    # ステータス文字列・ラベルマップ
└── lists.ts       # 選択肢リスト（タイプ・プラットフォーム等）
```

#### activity.ts — 活動スタイル

`users.activity_style_id`（SMALLINT）の数値を直接コードに書かない。
必ず `ACTIVITY_STYLE_ID` 定数または変換ヘルパーを使う。

```typescript
import { ACTIVITY_STYLE_ID, activityStyleToRoles, rolesToActivityStyleId, hasClientRole } from '@/lib/constants/activity'

// NG
if (styleId === 2 || styleId === 3) { ... }

// OK
if (hasClientRole(styleId)) { ... }

// NG
const activityStyleId = isCreator && isClient ? 3 : isCreator ? 1 : 2

// OK
const activityStyleId = rolesToActivityStyleId(rolesArr)
```

#### validation.ts — バリデーション上限値

フォームの `maxLength` 属性、API の文字数チェック、フロントのガード処理は
すべて `VALIDATION` 定数を参照する。

```typescript
import { VALIDATION } from '@/lib/constants/validation'

// NG
if (displayName.length > 30) { ... }
<input maxLength={30} />

// OK
if (displayName.length > VALIDATION.DISPLAY_NAME_MAX) { ... }
<input maxLength={VALIDATION.DISPLAY_NAME_MAX} />
```

API ルートとフォームで同じ定数を参照することで、制限値の二重管理を防ぐ。

#### statuses.ts — ステータス定数

ステータス文字列のリテラル、ラベルマップ、カラーマップを各ページで重複定義しない。

```typescript
import { ORDER_STATUS_MAP, PROJECT_STATUS_MAP, INACTIVE_ORDER_STATUSES } from '@/lib/constants/statuses'

// NG（各ページに STATUS_MAP を定義）
const STATUS_MAP = { pending: { label: '提案中', color: '#fbbf24' }, ... }

// OK
const st = ORDER_STATUS_MAP[order.status]

// NG
.not('status', 'in', '(completed,cancelled,disputed)')

// OK
.not('status', 'in', INACTIVE_ORDER_STATUSES)
```

#### lists.ts — 選択肢リスト

クリエイタータイプ・依頼者タイプ・SNS プラットフォーム等の配列を
コンポーネントや API ルートに直書きしない。

```typescript
import { CREATOR_TYPES, CLIENT_TYPES, SNS_PLATFORMS, PORTFOLIO_PLATFORMS } from '@/lib/constants/lists'
```

### 定数ファイルの更新ルール

選択肢・ステータス・上限値を変更する場合は以下の順序で対応する。

1. `lib/constants/` の該当ファイルを更新する
2. DB マスタテーブルの DDL（`supabase/ddl/master/`）を更新する
3. 必要に応じて `supabase/migrate.sql` を作成して DB に適用する
4. 参照側のコンポーネント・API に変更が必要な場合のみ修正する

> 定数ファイルを更新するだけで UI・API・DB が一致する状態を保つことが目標。
