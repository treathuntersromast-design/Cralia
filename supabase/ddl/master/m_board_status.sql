-- ============================================================
-- public.m_board_status（プロジェクトボードステータスマスタ）
-- project_boards.status の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_board_status (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_board_status (code, value, label_ja, sort_order) VALUES
  (1, 'recruiting',  '募集中',    1),
  (2, 'in_progress', '進行中',    2),
  (3, 'completed',   '完了',      3),
  (4, 'cancelled',   'キャンセル', 4)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_board_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_board_status_select_all" ON public.m_board_status FOR SELECT USING (true);

COMMENT ON TABLE  public.m_board_status      IS 'プロジェクトボードステータスマスタ';
COMMENT ON COLUMN public.m_board_status.code IS '1: 募集中, 2: 進行中, 3: 完了, 4: キャンセル';

COMMIT;
