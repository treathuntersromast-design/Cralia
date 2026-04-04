-- ============================================================
-- public.project_roles（プロジェクト内役職）
-- 依存: public.project_boards, public.users
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.project_roles (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL REFERENCES public.project_boards(id) ON DELETE CASCADE,
  role_name        TEXT        NOT NULL,
  description      TEXT,
  is_owner_role    BOOLEAN     NOT NULL DEFAULT false,
  assigned_user_id UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  display_order    INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_roles_select" ON public.project_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_boards pb
      WHERE pb.id = project_id AND (pb.is_public = true OR pb.owner_id = auth.uid())
    )
  );
CREATE POLICY "project_roles_owner_write" ON public.project_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_boards pb
      WHERE pb.id = project_id AND pb.owner_id = auth.uid()
    )
  );
CREATE POLICY "project_roles_service_role" ON public.project_roles FOR ALL TO service_role USING (true);

COMMIT;
