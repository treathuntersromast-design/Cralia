-- ============================================================
-- public.event_registrations（交流会参加申込）
-- 依存: public.events, public.users
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

COMMENT ON TABLE  public.event_registrations          IS '交流会参加申込';
COMMENT ON COLUMN public.event_registrations.event_id IS 'FK → events';
COMMENT ON COLUMN public.event_registrations.user_id  IS 'FK → users（申込者）';

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_reg_select_all"    ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_select_own"    ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_insert_own"    ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_delete_own"    ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_service_role"  ON public.event_registrations;

-- 自分の申込のみ参照・削除可。COUNT のために SELECT は全件許可
CREATE POLICY "event_reg_select_all"   ON public.event_registrations FOR SELECT USING (true);
CREATE POLICY "event_reg_insert_own"   ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "event_reg_delete_own"   ON public.event_registrations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "event_reg_service_role" ON public.event_registrations FOR ALL TO service_role USING (true);

COMMIT;
