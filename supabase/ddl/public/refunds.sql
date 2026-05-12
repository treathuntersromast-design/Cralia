-- ============================================================
-- public.refunds（返金記録）
-- refund.created で pending INSERT のみ。
-- refund.updated (succeeded) 確認後に refunded_amount を加算する。
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.refunds (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id              UUID        NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  stripe_refund_id        TEXT        NOT NULL UNIQUE,   -- 冪等性: 同一 refund_id の二重 INSERT を防ぐ
  amount                  INTEGER     NOT NULL CHECK (amount > 0),
  status                  TEXT        NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  failure_reason          TEXT,
  previous_payment_status TEXT,       -- 返金失敗・キャンセル時の payment.status 巻き戻し用
  reason                  TEXT,       -- Stripe reason フィールド
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  public.refunds                             IS '返金記録。previous_payment_status は返金失敗時の巻き戻しに使用';
COMMENT ON COLUMN public.refunds.stripe_refund_id           IS 'UNIQUE: 同一 refund_id の重複 INSERT を防ぐ';
COMMENT ON COLUMN public.refunds.previous_payment_status    IS 'refund.updated (failed/canceled) 時に payment.status をこの値に戻す';
COMMENT ON COLUMN public.refunds.status                     IS 'Stripe refund status に準拠: pending/succeeded/failed/canceled';

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
-- RLS ポリシーなし: authenticated ユーザーへの直接アクセスを禁止（管理 API / service_role のみ）
-- TODO: 将来的にクリエイターが自分の返金履歴を参照できる RLS を追加する場合はここに追加する

COMMIT;
