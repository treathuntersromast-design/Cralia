-- ============================================================
-- public.m_task_status（タスクステータスマスタ）
-- project_tasks.status の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_task_status (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_task_status (code, value, label_ja, sort_order) VALUES
  (1, 'todo',        '未着手',  1),
  (2, 'in_progress', '進行中',  2),
  (3, 'done',        '完了',    3)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_task_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_task_status_select_all" ON public.m_task_status FOR SELECT USING (true);

COMMENT ON TABLE  public.m_task_status      IS 'タスクステータスマスタ';
COMMENT ON COLUMN public.m_task_status.code IS '1: 未着手, 2: 進行中, 3: 完了';

COMMIT;
