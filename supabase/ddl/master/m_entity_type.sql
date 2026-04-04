-- ============================================================
-- public.m_entity_type（エンティティタイプマスタ）
-- users.entity_type の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_entity_type (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_entity_type (code, value, label_ja, sort_order) VALUES
  (1, 'individual', '個人',     1),
  (2, 'corporate',  '法人・団体', 2)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_entity_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_entity_type_select_all" ON public.m_entity_type FOR SELECT USING (true);

COMMENT ON TABLE  public.m_entity_type      IS 'エンティティタイプマスタ（個人 / 法人）';
COMMENT ON COLUMN public.m_entity_type.code IS '1: 個人, 2: 法人・団体';

COMMIT;
