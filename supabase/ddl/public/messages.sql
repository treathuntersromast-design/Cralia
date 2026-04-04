-- ============================================================
-- public.messages
-- 依存: public.projects, public.users
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES public.users(id),
  body       TEXT,
  file_url   TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_participant" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.client_id = auth.uid() OR p.creator_id = auth.uid())
    )
  );
CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.client_id = auth.uid() OR p.creator_id = auth.uid())
    )
  );
CREATE POLICY "messages_service_role" ON public.messages FOR ALL TO service_role USING (true);

COMMIT;
