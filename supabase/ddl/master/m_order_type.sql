-- ============================================================
-- public.m_order_type（依頼・案件タイプマスタ）
-- projects.order_type および job_listings.order_type の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_order_type (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_order_type (code, value, label_ja, sort_order) VALUES
  (1, 'paid', '有償', 1),
  (2, 'free', '無償', 2)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_order_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_order_type_select_all" ON public.m_order_type FOR SELECT USING (true);

COMMENT ON TABLE  public.m_order_type      IS '依頼・案件タイプマスタ';
COMMENT ON COLUMN public.m_order_type.code IS '1: 有償, 2: 無償';

COMMIT;
