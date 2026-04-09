-- ============================================================
-- public.job_listings（案件掲示板）
-- 依頼者がクリエイターを募集するための案件投稿テーブル
-- 依存: public.users, m_order_type, m_job_status
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.job_listings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  description   TEXT,
  -- 募集クリエイタータイプ（m_creator_type.value の複数選択）
  creator_types TEXT[]      NOT NULL DEFAULT '{}',
  -- 依頼タイプ FK → m_order_type(value)
  order_type    TEXT        NOT NULL DEFAULT 'paid'
                            REFERENCES public.m_order_type(value),
  budget_min    INTEGER     CHECK (budget_min >= 0),
  budget_max    INTEGER     CHECK (budget_max >= 0),
  -- budget_min ≤ budget_max
  CONSTRAINT job_listings_budget_order CHECK (
    budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max
  ),
  deadline      DATE,
  -- ステータス FK → m_job_status(value)
  status        TEXT        NOT NULL DEFAULT 'open'
                            REFERENCES public.m_job_status(value),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;

-- 公開案件は全ログインユーザーが閲覧可能
CREATE POLICY "job_listings_select_open"  ON public.job_listings FOR SELECT USING (status = 'open' OR auth.uid() = client_id);
CREATE POLICY "job_listings_insert_own"   ON public.job_listings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "job_listings_update_own"   ON public.job_listings FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "job_listings_delete_own"   ON public.job_listings FOR DELETE USING (auth.uid() = client_id);
CREATE POLICY "job_listings_service_role" ON public.job_listings FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON COLUMN public.job_listings.creator_types IS '募集対象クリエイタータイプ（m_creator_type.value の複数選択）';
COMMENT ON COLUMN public.job_listings.order_type    IS 'FK → m_order_type.value（paid / free）';
COMMENT ON COLUMN public.job_listings.status        IS 'FK → m_job_status.value（open / closed）';

COMMIT;
