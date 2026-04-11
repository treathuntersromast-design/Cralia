-- ============================================================
-- public.reviews（評価テーブル）
-- 依存: public.projects, public.project_boards, public.users
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.reviews (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 評価種別
  review_type      TEXT        NOT NULL
                   CHECK (review_type IN ('order_to_creator', 'order_to_client', 'project_member')),
  -- ソース（依頼 or プロジェクトボード）どちらか一方のみ
  project_id       UUID        REFERENCES public.projects(id),
  project_board_id UUID        REFERENCES public.project_boards(id),
  -- 評価者・被評価者
  reviewer_id      UUID        NOT NULL REFERENCES public.users(id),
  reviewee_id      UUID        NOT NULL REFERENCES public.users(id),
  -- 評価内容
  rating           INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  -- project_id / project_board_id はどちらか一方のみ
  CONSTRAINT reviews_source_xor CHECK (
    (project_id IS NOT NULL AND project_board_id IS NULL) OR
    (project_id IS NULL     AND project_board_id IS NOT NULL)
  )
);

-- 依頼評価の重複防止（project_id が NULL のときは対象外）
CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_unique
  ON public.reviews (project_id, reviewer_id, reviewee_id)
  WHERE project_id IS NOT NULL;

-- ボード評価の重複防止（project_board_id が NULL のときは対象外）
CREATE UNIQUE INDEX IF NOT EXISTS reviews_board_unique
  ON public.reviews (project_board_id, reviewer_id, reviewee_id)
  WHERE project_board_id IS NOT NULL;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_all"   ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own"   ON public.reviews;
DROP POLICY IF EXISTS "reviews_service_role" ON public.reviews;

CREATE POLICY "reviews_select_all"   ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own"   ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "reviews_service_role" ON public.reviews FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON TABLE  public.reviews                  IS '評価テーブル（依頼双方向 + プロジェクトメンバー相互評価）';
COMMENT ON COLUMN public.reviews.review_type      IS 'order_to_creator: 依頼者→クリエイター / order_to_client: クリエイター→依頼者 / project_member: メンバー相互';
COMMENT ON COLUMN public.reviews.project_id       IS 'FK → projects.id（依頼評価時のみ。project_member の場合は NULL）';
COMMENT ON COLUMN public.reviews.project_board_id IS 'FK → project_boards.id（プロジェクトメンバー評価時のみ）';
COMMENT ON COLUMN public.reviews.reviewee_id      IS '被評価者（評価を受けるユーザー）';

COMMIT;
