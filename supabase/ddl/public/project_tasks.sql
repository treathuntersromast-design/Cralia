-- ============================================================
-- public.project_tasks（タスク・進捗）
-- 依存: public.project_boards, public.project_roles, m_task_status
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES public.project_boards(id) ON DELETE CASCADE,
  role_id       UUID        REFERENCES public.project_roles(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL,
  -- ステータス FK → m_task_status(value)
  status        TEXT        NOT NULL DEFAULT 'todo'
                            REFERENCES public.m_task_status(value),
  due_date      DATE,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────
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
CREATE POLICY "project_tasks_service_role" ON public.project_tasks FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON COLUMN public.project_tasks.status IS 'FK → m_task_status.value（todo / in_progress / done）';

COMMIT;
