-- ============================================================
-- public.m_availability（稼働状況マスタ）
-- creator_profiles.availability の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_availability (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_availability (code, value, label_ja, sort_order) VALUES
  (1, 'open',     '受付中',     1),
  (2, 'one_slot', '残り1枠',    2),
  (3, 'full',     '受付停止中', 3)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_availability_select_all" ON public.m_availability FOR SELECT USING (true);

COMMENT ON TABLE  public.m_availability      IS '稼働状況マスタ';
COMMENT ON COLUMN public.m_availability.code IS '1: 受付中, 2: 残り1枠, 3: 受付停止中';

COMMIT;
