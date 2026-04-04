-- ============================================================
-- public.m_project_status（依頼ステータスマスタ）
-- projects.status の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_project_status (
  code           SMALLINT    PRIMARY KEY,
  value          TEXT        NOT NULL UNIQUE,
  label_ja       TEXT        NOT NULL,
  is_terminal    BOOLEAN     NOT NULL DEFAULT false,  -- 終端ステータス（遷移不可）
  sort_order     SMALLINT    NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_project_status (code, value, label_ja, is_terminal, sort_order) VALUES
  (1, 'draft',       '下書き',           false, 1),
  (2, 'pending',     '承認待ち',          false, 2),
  (3, 'accepted',    '承認済み',          false, 3),
  (4, 'in_progress', '進行中',           false, 4),
  (5, 'delivered',   '納品済み',          false, 5),
  (6, 'completed',   '完了',            true,  6),
  (7, 'cancelled',   'キャンセル',        true,  7),
  (8, 'disputed',    '異議申し立て中',    false, 8)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_project_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_project_status_select_all" ON public.m_project_status FOR SELECT USING (true);

COMMENT ON TABLE  public.m_project_status             IS '依頼ステータスマスタ';
COMMENT ON COLUMN public.m_project_status.is_terminal IS 'true の場合、それ以上のステータス遷移は不可';

COMMIT;
