-- ============================================================
-- public.m_job_status（案件ステータスマスタ）
-- job_listings.status の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_job_status (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_job_status (code, value, label_ja, sort_order) VALUES
  (1, 'open',   '募集中',    1),
  (2, 'closed', '締め切り',  2)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_job_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_job_status_select_all" ON public.m_job_status FOR SELECT USING (true);

COMMENT ON TABLE  public.m_job_status      IS '案件ステータスマスタ';
COMMENT ON COLUMN public.m_job_status.code IS '1: 募集中, 2: 締め切り';

COMMIT;
