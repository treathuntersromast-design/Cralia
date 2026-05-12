-- ================================================================
-- CreMatch プラットフォーム預かり決済 マイグレーション
-- 実行後はこのファイルを削除してください。
--
-- 【実行前チェック】
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name='payments' ORDER BY ordinal_position;
--   SELECT value FROM public.m_payment_status ORDER BY code;
-- ================================================================

BEGIN;

-- STEP 1: m_payment_status 全ステータス再定義
-- 旧: held(1) / released(2) / refunded(3) → 新ステータス体系に移行
DELETE FROM public.m_payment_status WHERE code IN (2, 3);
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

-- STEP 2: payments にカラム追加
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id  TEXT        UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_charge_id             TEXT,
  ADD COLUMN IF NOT EXISTS checkout_expires_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_amount              INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency                     TEXT        NOT NULL DEFAULT 'jpy',
  ADD COLUMN IF NOT EXISTS paid_at                      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_status               TEXT,
  ADD COLUMN IF NOT EXISTS admin_note                   TEXT,
  ADD COLUMN IF NOT EXISTS created_at                   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at                   TIMESTAMPTZ DEFAULT NOW();

-- payments.status の DEFAULT を 'held' → 'pending' に変更
ALTER TABLE public.payments ALTER COLUMN status SET DEFAULT 'pending';

-- stripe_payment_intent_id に UNIQUE INDEX（NULL 除外）
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_payment_intent_id_key
  ON public.payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- STEP 3: stripe_webhook_events テーブル作成
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id      TEXT        PRIMARY KEY,
  event_type    TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'processing'
                            CHECK (status IN ('processing', 'processed', 'failed')),
  error_message TEXT,
  processed_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.stripe_webhook_events DISABLE ROW LEVEL SECURITY;

-- STEP 4: refunds テーブル作成
CREATE TABLE IF NOT EXISTS public.refunds (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id              UUID        NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  stripe_refund_id        TEXT        NOT NULL UNIQUE,
  amount                  INTEGER     NOT NULL CHECK (amount > 0),
  status                  TEXT        NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  failure_reason          TEXT,
  previous_payment_status TEXT,
  reason                  TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- STEP 5: creator_payouts テーブル作成
CREATE TABLE IF NOT EXISTS public.creator_payouts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   UUID        NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  creator_id   UUID        NOT NULL REFERENCES public.users(id),
  amount       INTEGER     NOT NULL CHECK (amount > 0),
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_payouts_select_own" ON public.creator_payouts
  FOR SELECT USING (auth.uid() = creator_id);

-- STEP 6: creator_payout_bank_details テーブル作成
CREATE TABLE IF NOT EXISTS public.creator_payout_bank_details (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_payout_id UUID        NOT NULL UNIQUE REFERENCES public.creator_payouts(id) ON DELETE CASCADE,
  bank_info         TEXT        NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.creator_payout_bank_details DISABLE ROW LEVEL SECURITY;

-- STEP 7: payment_adjustments テーブル作成
CREATE TABLE IF NOT EXISTS public.payment_adjustments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID        NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  admin_id    UUID        NOT NULL REFERENCES public.users(id),
  amount      INTEGER     NOT NULL,
  reason      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.payment_adjustments DISABLE ROW LEVEL SECURITY;

-- STEP 8: receipts テーブル作成
CREATE TABLE IF NOT EXISTS public.receipts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   UUID        NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  issued_at    TIMESTAMPTZ DEFAULT NOW(),
  pdf_url      TEXT
);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_select_own" ON public.receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      JOIN public.projects pr ON pr.id = p.project_id
      WHERE p.id = receipts.payment_id AND pr.client_id = auth.uid()
    )
  );

COMMIT;

-- ================================================================
-- 【実行後の確認クエリ】
-- SELECT code, value, label_ja FROM public.m_payment_status ORDER BY code;
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name='payments' ORDER BY ordinal_position;
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public'
--   AND table_name IN ('refunds','creator_payouts','creator_payout_bank_details',
--     'payment_adjustments','receipts','stripe_webhook_events');
-- ================================================================
