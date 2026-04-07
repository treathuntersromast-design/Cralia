-- ================================================================
-- Cralia 包括マイグレーション v2
-- 実行後はこのファイルを削除してください。
--
-- 【実行前チェック】
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'users'
--   AND column_name IN ('display_id','ai_suggestion_enabled','terms_agreed_at');
--   → 0件なら未適用（実行OK）
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: users テーブル拡張
-- ================================================================

-- 8桁数字のユーザー表示ID（検索・プロフィール公開用）
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_id        CHAR(8)     UNIQUE,
  ADD COLUMN IF NOT EXISTS ai_suggestion_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS terms_agreed_at   TIMESTAMPTZ;

COMMENT ON COLUMN public.users.display_id            IS '8桁数字の公開ユーザーID（検索・プロフィール表示用）';
COMMENT ON COLUMN public.users.ai_suggestion_enabled IS '依頼者向けAIクリエイター提案機能の有効/無効（デフォルト: 有効）';
COMMENT ON COLUMN public.users.terms_agreed_at       IS '利用規約への同意日時（NULL = 未同意）';

-- ================================================================
-- STEP 2: 8桁display_id 自動生成関数
-- ================================================================

CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS CHAR(8) AS $$
DECLARE
  new_id CHAR(8);
  id_exists BOOLEAN;
BEGIN
  LOOP
    -- 00000001 ～ 99999999 の範囲でランダム生成
    new_id := LPAD((FLOOR(RANDOM() * 99999998) + 1)::BIGINT::TEXT, 8, '0');
    SELECT EXISTS(SELECT 1 FROM public.users WHERE display_id = new_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存ユーザーに display_id を付与（NULL のもの全員）
DO $$
DECLARE
  u RECORD;
  new_id CHAR(8);
  id_exists BOOLEAN;
BEGIN
  FOR u IN SELECT id FROM public.users WHERE display_id IS NULL LOOP
    LOOP
      new_id := LPAD((FLOOR(RANDOM() * 99999998) + 1)::BIGINT::TEXT, 8, '0');
      SELECT EXISTS(SELECT 1 FROM public.users WHERE display_id = new_id) INTO id_exists;
      EXIT WHEN NOT id_exists;
    END LOOP;
    UPDATE public.users SET display_id = new_id WHERE id = u.id;
  END LOOP;
END;
$$;

-- ================================================================
-- STEP 3: creator_profiles テーブル拡張
-- ================================================================

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS order_limit    SMALLINT  CHECK (order_limit > 0),
  ADD COLUMN IF NOT EXISTS pricing_plans  JSONB     NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.creator_profiles.order_limit   IS '同時受注可能な最大件数（NULL = 制限なし）';
COMMENT ON COLUMN public.creator_profiles.pricing_plans IS '料金プラン一覧 [{name, price, description, delivery_days}]';

-- ================================================================
-- STEP 4: projects テーブル — copyright_agreed 列追加（前回のportfolio_allowedも含む）
-- ================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS portfolio_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copyright_agreed  BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.portfolio_allowed IS 'クリエイターが納品物をポートフォリオとして公開することを依頼者が許可するか';
COMMENT ON COLUMN public.projects.copyright_agreed  IS '著作権・二次利用に関する注意事項に依頼者が同意したか';

-- ================================================================
-- STEP 5: ai_rate_limit テーブル（AIレート制限）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.ai_rate_limit (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL,
  date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER     NOT NULL DEFAULT 1,
  UNIQUE (user_id, endpoint, date)
);

ALTER TABLE public.ai_rate_limit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_rate_limit_service_role" ON public.ai_rate_limit FOR ALL TO service_role USING (true);

COMMENT ON TABLE public.ai_rate_limit IS 'AIエンドポイントの1日あたり呼び出し回数を記録するレート制限テーブル';

-- ================================================================
-- STEP 6: receipts テーブル（領収書・発注書）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.receipts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES public.projects(id),
  type         TEXT        NOT NULL CHECK (type IN ('receipt', 'purchase_order')),
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by    UUID        NOT NULL REFERENCES public.users(id),
  amount       INTEGER     NOT NULL CHECK (amount > 0),
  tax_amount   INTEGER     NOT NULL DEFAULT 0,
  memo         TEXT,
  receipt_no   TEXT        UNIQUE
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_select_participant" ON public.receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.client_id = auth.uid() OR p.creator_id = auth.uid())
    )
  );
CREATE POLICY "receipts_service_role" ON public.receipts FOR ALL TO service_role USING (true);

COMMENT ON TABLE  public.receipts          IS '領収書・発注書の発行記録';
COMMENT ON COLUMN public.receipts.type     IS 'receipt（領収書）/ purchase_order（発注書）';
COMMENT ON COLUMN public.receipts.receipt_no IS '発行番号（例: RCP-20260101-001）';

-- ================================================================
-- STEP 7: error_logs テーブル（アプリエラー記録）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  endpoint   TEXT,
  message    TEXT        NOT NULL,
  stack      TEXT,
  meta       JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "error_logs_service_role" ON public.error_logs FOR ALL TO service_role USING (true);

COMMENT ON TABLE public.error_logs IS 'APIエンドポイントで発生したエラーの記録（監視・デバッグ用）';

-- ================================================================
-- STEP 8: reviews テーブル — order_idエイリアスコメント追加
-- ================================================================

COMMENT ON COLUMN public.reviews.project_id IS 'FK → projects.id（orders/projectsを兼用）';

-- ================================================================
-- STEP 8b: ai_rate_limit インクリメント RPC
-- ================================================================

CREATE OR REPLACE FUNCTION public.increment_ai_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_date     DATE
) RETURNS void AS $$
BEGIN
  INSERT INTO public.ai_rate_limit (user_id, endpoint, date, call_count)
    VALUES (p_user_id, p_endpoint, p_date, 1)
  ON CONFLICT (user_id, endpoint, date)
    DO UPDATE SET call_count = public.ai_rate_limit.call_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 9: auth trigger 更新（display_id 自動付与）
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_display_id CHAR(8);
  id_exists BOOLEAN;
BEGIN
  -- ユニークな8桁IDを生成
  LOOP
    new_display_id := LPAD((FLOOR(RANDOM() * 99999998) + 1)::BIGINT::TEXT, 8, '0');
    SELECT EXISTS(SELECT 1 FROM public.users WHERE display_id = new_display_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;

  INSERT INTO public.users (id, activity_style_id, display_name, avatar_url, display_id)
  VALUES (
    NEW.id,
    NULL,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    new_display_id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ================================================================
-- STEP N+1: プロジェクトスケジュール機能
-- ================================================================

BEGIN;

-- project_tasks に担当者・説明カラムを追加
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description       TEXT;

COMMENT ON COLUMN public.project_tasks.assigned_user_id IS '担当ユーザーID（スケジュール管理用）';
COMMENT ON COLUMN public.project_tasks.description      IS 'タスクの詳細説明';

-- タスク依存関係テーブル
CREATE TABLE IF NOT EXISTS public.project_task_deps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT project_task_deps_no_self_ref CHECK (task_id <> depends_on_id),
  UNIQUE(task_id, depends_on_id)
);

COMMENT ON TABLE  public.project_task_deps               IS 'タスク間の依存関係（task_id は depends_on_id が done になるまでブロック）';
COMMENT ON COLUMN public.project_task_deps.task_id       IS 'このタスクは先行タスクが完了するまでブロックされる';
COMMENT ON COLUMN public.project_task_deps.depends_on_id IS '先行タスクID';

ALTER TABLE public.project_task_deps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_deps_select" ON public.project_task_deps
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.project_tasks pt
      JOIN public.project_boards pb ON pb.id = pt.project_id
      WHERE pt.id = task_id
        AND (pb.is_public = true OR pb.owner_id = auth.uid())
    )
  );

CREATE POLICY "task_deps_owner_write" ON public.project_task_deps
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.project_tasks pt
      JOIN public.project_boards pb ON pb.id = pt.project_id
      WHERE pt.id = task_id
        AND pb.owner_id = auth.uid()
    )
  );

CREATE POLICY "task_deps_service_role" ON public.project_task_deps
  FOR ALL TO service_role USING (true);

COMMIT;

-- ================================================================
-- 【実行後の確認クエリ】
--   SELECT id, display_id, ai_suggestion_enabled, terms_agreed_at FROM public.users LIMIT 5;
--   SELECT * FROM public.ai_rate_limit LIMIT 1;
--   SELECT * FROM public.receipts LIMIT 1;
--   SELECT * FROM public.error_logs LIMIT 1;
--   SELECT order_limit, pricing_plans FROM public.creator_profiles LIMIT 3;
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'project_tasks' AND column_name IN ('assigned_user_id','description');
--   SELECT * FROM public.project_task_deps LIMIT 1;
-- ================================================================
