-- ============================================================
-- public.m_payment_status（支払いステータスマスタ）
-- payments.status の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_payment_status (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_payment_status (code, value, label_ja, sort_order) VALUES
  (1, 'held',     '仮払い中', 1),
  (2, 'released', '支払い完了', 2),
  (3, 'refunded', '返金済み', 3)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_payment_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_payment_status_select_all" ON public.m_payment_status FOR SELECT USING (true);

COMMENT ON TABLE  public.m_payment_status      IS '支払いステータスマスタ（エスクロー）';
COMMENT ON COLUMN public.m_payment_status.code IS '1: 仮払い中, 2: 支払い完了, 3: 返金済み';

COMMIT;
