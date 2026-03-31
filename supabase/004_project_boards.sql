-- ============================================================
-- CreMatch - Project Boards Schema
-- ============================================================

-- ============================================================
-- 1. project_boards（プロジェクト本体）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_boards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  status      TEXT NOT NULL DEFAULT 'recruiting'
    CHECK (status IN ('recruiting', 'in_progress', 'completed', 'cancelled')),
  is_public   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.project_boards ENABLE ROW LEVEL SECURITY;

-- 公開プロジェクトは全ログインユーザーが閲覧可能
CREATE POLICY "project_boards_select" ON public.project_boards
  FOR SELECT USING (is_public = true OR auth.uid() = owner_id);
CREATE POLICY "project_boards_insert" ON public.project_boards
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "project_boards_update" ON public.project_boards
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "project_boards_delete" ON public.project_boards
  FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "project_boards_service_role" ON public.project_boards
  FOR ALL TO service_role USING (true);

-- ============================================================
-- 2. project_roles（役職）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_roles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES public.project_boards(id) ON DELETE CASCADE,
  role_name        TEXT NOT NULL,
  description      TEXT,
  is_owner_role    BOOLEAN NOT NULL DEFAULT false,
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  display_order    INTEGER NOT NULL DEFAULT 0,
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
CREATE POLICY "project_roles_service_role" ON public.project_roles
  FOR ALL TO service_role USING (true);

-- ============================================================
-- 3. project_tasks（タスク・進捗）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.project_boards(id) ON DELETE CASCADE,
  role_id       UUID REFERENCES public.project_roles(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date      DATE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_tasks_select" ON public.project_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_boards pb
      WHERE pb.id = project_id AND (pb.is_public = true OR pb.owner_id = auth.uid())
    )
  );
CREATE POLICY "project_tasks_owner_write" ON public.project_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_boards pb
      WHERE pb.id = project_id AND pb.owner_id = auth.uid()
    )
  );
CREATE POLICY "project_tasks_service_role" ON public.project_tasks
  FOR ALL TO service_role USING (true);
