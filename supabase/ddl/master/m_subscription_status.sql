-- ============================================================
-- public.m_subscription_status（サブスクリプションステータスマスタ）
-- subscriptions.status の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_subscription_status (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_subscription_status (code, value, label_ja, sort_order) VALUES
  (1, 'active',    '有効',        1),
  (2, 'cancelled', '解約済み',    2),
  (3, 'past_due',  '支払い期限超過', 3)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_subscription_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_subscription_status_select_all" ON public.m_subscription_status FOR SELECT USING (true);

COMMENT ON TABLE  public.m_subscription_status      IS 'サブスクリプションステータスマスタ';
COMMENT ON COLUMN public.m_subscription_status.code IS '1: 有効, 2: 解約済み, 3: 支払い期限超過';

COMMIT;
