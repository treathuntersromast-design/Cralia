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
  (0,  'pending',            '決済待ち',         0),
  (1,  'held',               '保留中',           1),
  (2,  'payout_pending',     '支払確定済み',      2),
  (3,  'payout_paid',        '振込済み',          3),
  (4,  'refunded',           '全額返金済み',      4),
  (5,  'partially_refunded', '部分返金済み',      5),
  (6,  'expired',            '期限切れ',          6),
  (7,  'refund_pending',     '返金処理中',        7),
  (8,  'payment_mismatch',   '金額不一致',        8),
  (9,  'disputed',           '異議申し立て中',    9),
  (10, 'failed',             '決済失敗',          10)
ON CONFLICT (code) DO UPDATE SET value = EXCLUDED.value, label_ja = EXCLUDED.label_ja, sort_order = EXCLUDED.sort_order;

ALTER TABLE public.m_payment_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "m_payment_status_select_all" ON public.m_payment_status;
CREATE POLICY "m_payment_status_select_all" ON public.m_payment_status FOR SELECT USING (true);

COMMENT ON TABLE  public.m_payment_status      IS '支払いステータスマスタ（プラットフォーム預かり決済）';
COMMENT ON COLUMN public.m_payment_status.code IS '0:pending 1:held 2:payout_pending 3:payout_paid 4:refunded 5:partially_refunded 6:expired 7:refund_pending 8:payment_mismatch 9:disputed 10:failed';

COMMIT;
