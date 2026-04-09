-- ============================================================
-- public.notifications
-- 依存: public.users
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"   ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own"   ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_service_role" ON public.notifications FOR ALL TO service_role USING (true);

COMMIT;
