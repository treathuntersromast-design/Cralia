-- ================================================================
-- Cralia 評価機能マイグレーション
-- 実行後はこのファイルを削除してください。
--
-- 【実行前チェック】
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'reviews'
--   AND column_name IN ('reviewee_id', 'review_type', 'project_board_id');
--   → 0件なら未適用（実行OK）
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: reviews テーブル拡張
-- ================================================================

-- 被評価者カラム追加（一時的に NULL 許容）
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reviewee_id      UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS review_type      TEXT,
  ADD COLUMN IF NOT EXISTS project_board_id UUID REFERENCES public.project_boards(id);

-- ================================================================
-- STEP 2: 既存データのバックフィル（project_id から creator_id を参照）
-- ================================================================

UPDATE public.reviews r
SET
  reviewee_id = p.creator_id,
  review_type  = 'order_to_creator'
FROM public.projects p
WHERE r.project_id = p.id
  AND r.reviewee_id IS NULL;

-- ================================================================
-- STEP 3: NOT NULL 制約・CHECK 制約を追加
-- ================================================================

-- reviewee_id を NOT NULL に
ALTER TABLE public.reviews
  ALTER COLUMN reviewee_id SET NOT NULL;

-- review_type NOT NULL + 値チェック
ALTER TABLE public.reviews
  ALTER COLUMN review_type SET NOT NULL;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_review_type_check
    CHECK (review_type IN ('order_to_creator', 'order_to_client', 'project_member'));

-- project_id を nullable に（project_member 評価は project_board_id を使う）
ALTER TABLE public.reviews
  ALTER COLUMN project_id DROP NOT NULL;

-- source XOR 制約（project_id / project_board_id どちらか一方のみ）
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_source_xor CHECK (
    (project_id IS NOT NULL AND project_board_id IS NULL) OR
    (project_id IS NULL     AND project_board_id IS NOT NULL)
  );

-- ================================================================
-- STEP 4: ユニークインデックス追加
-- ================================================================

CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_unique
  ON public.reviews (project_id, reviewer_id, reviewee_id)
  WHERE project_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_board_unique
  ON public.reviews (project_board_id, reviewer_id, reviewee_id)
  WHERE project_board_id IS NOT NULL;

-- ================================================================
-- STEP 5: コメント更新
-- ================================================================

COMMENT ON TABLE  public.reviews                  IS '評価テーブル（依頼双方向 + プロジェクトメンバー相互評価）';
COMMENT ON COLUMN public.reviews.review_type      IS 'order_to_creator: 依頼者→クリエイター / order_to_client: クリエイター→依頼者 / project_member: メンバー相互';
COMMENT ON COLUMN public.reviews.project_id       IS 'FK → projects.id（依頼評価のみ。project_member の場合は NULL）';
COMMENT ON COLUMN public.reviews.project_board_id IS 'FK → project_boards.id（プロジェクトメンバー評価のみ）';
COMMENT ON COLUMN public.reviews.reviewee_id      IS '被評価者（評価を受けるユーザー）';

-- ================================================================
-- STEP 6: evaluation_reports テーブル新規作成
-- ================================================================

CREATE TABLE IF NOT EXISTS public.evaluation_reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID        NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id UUID        NOT NULL REFERENCES public.users(id),
  reason      TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (review_id, reporter_id)
);

ALTER TABLE public.evaluation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eval_reports_select_own"   ON public.evaluation_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "eval_reports_insert_own"   ON public.evaluation_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "eval_reports_service_role" ON public.evaluation_reports FOR ALL TO service_role USING (true);

COMMENT ON TABLE  public.evaluation_reports            IS '評価への異議申し立て（被評価者がサイトオーナーに報告）';
COMMENT ON COLUMN public.evaluation_reports.reason     IS '報告理由（最大1000文字）';
COMMENT ON COLUMN public.evaluation_reports.status     IS 'pending: 受付済み / reviewing: 確認中 / resolved: 対応済み / dismissed: 却下';
COMMENT ON COLUMN public.evaluation_reports.admin_note IS '管理者による対応メモ';

COMMIT;

-- ================================================================
-- 【実行後の確認クエリ】
--   SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_name = 'reviews'
--   AND column_name IN ('reviewee_id', 'review_type', 'project_board_id', 'project_id');
--
--   SELECT * FROM public.evaluation_reports LIMIT 1;
--
--   SELECT review_type, COUNT(*) FROM public.reviews GROUP BY review_type;
-- ================================================================
