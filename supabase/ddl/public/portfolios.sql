-- ============================================================
-- public.portfolios
-- 依存: public.users, m_sns_platform
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.portfolios (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- プラットフォーム FK → m_sns_platform(value)
  platform      TEXT        NOT NULL REFERENCES public.m_sns_platform(value),
  url           TEXT        NOT NULL,
  title         TEXT,
  thumbnail_url TEXT,
  display_order INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolios_select_all"   ON public.portfolios FOR SELECT USING (true);
CREATE POLICY "portfolios_insert_own"   ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "portfolios_update_own"   ON public.portfolios FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "portfolios_delete_own"   ON public.portfolios FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "portfolios_service_role" ON public.portfolios FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON COLUMN public.portfolios.platform IS 'FK → m_sns_platform.value';

COMMIT;
