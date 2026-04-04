-- ============================================================
-- public.reviews
-- 依存: public.projects, public.users
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id),
  reviewer_id UUID        NOT NULL REFERENCES public.users(id),
  rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_all"   ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own"   ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "reviews_service_role" ON public.reviews FOR ALL TO service_role USING (true);

COMMIT;
