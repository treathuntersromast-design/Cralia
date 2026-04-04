-- ============================================================
-- 005_order_type.sql
-- projectsテーブルに有償/無償区分を追加
-- ============================================================

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'paid'
  CHECK (order_type IN ('paid', 'free'));

COMMENT ON COLUMN public.projects.order_type IS '有償依頼: paid / 無償依頼: free';
