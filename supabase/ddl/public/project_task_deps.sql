-- ============================================================
-- public.project_task_deps（タスク依存関係）
-- 依存: public.project_tasks
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.project_task_deps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT project_task_deps_no_self_ref CHECK (task_id <> depends_on_id),
  UNIQUE(task_id, depends_on_id)
);

COMMENT ON TABLE  public.project_task_deps                IS 'タスク間の依存関係（task_id は depends_on_id が完了するまで着手不可）';
COMMENT ON COLUMN public.project_task_deps.task_id        IS 'このタスクは depends_on_id が done になるまでブロックされる';
COMMENT ON COLUMN public.project_task_deps.depends_on_id  IS '先行タスクID';

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.project_task_deps ENABLE ROW LEVEL SECURITY;

-- 参照: プロジェクトが公開 or 自分がオーナー
CREATE POLICY "task_deps_select" ON public.project_task_deps
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.project_tasks pt
      JOIN public.project_boards pb ON pb.id = pt.project_id
      WHERE pt.id = task_id
        AND (pb.is_public = true OR pb.owner_id = auth.uid())
    )
  );

-- 書き込み: オーナーのみ
CREATE POLICY "task_deps_owner_write" ON public.project_task_deps
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.project_tasks pt
      JOIN public.project_boards pb ON pb.id = pt.project_id
      WHERE pt.id = task_id
        AND pb.owner_id = auth.uid()
    )
  );

CREATE POLICY "task_deps_service_role" ON public.project_task_deps
  FOR ALL TO service_role USING (true);

COMMIT;
