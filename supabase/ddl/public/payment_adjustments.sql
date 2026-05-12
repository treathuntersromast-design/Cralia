-- ============================================================
-- public.payment_adjustments（手動調整履歴・記録のみ）
-- MVP では支払額の計算には反映しない（記録のみ）。
-- 将来的に反映する場合は payout_amount = amount - fee - refunded_amount + adjustment_total に変更。
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_adjustments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID        NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  admin_id    UUID        NOT NULL REFERENCES public.users(id),
  amount      INTEGER     NOT NULL,   -- 正: 追加, 負: 減算（現在は記録のみ・支払額に非反映）
  reason      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  public.payment_adjustments        IS '手動調整履歴（記録のみ）。現在は payout_amount に非反映。';
COMMENT ON COLUMN public.payment_adjustments.amount IS '正: 追加, 負: 減算。MVP では支払額の計算に使用しない（UI で「記録のみ」と明示する）。';

-- RLS 無効（service_role のみアクセス可）
ALTER TABLE public.payment_adjustments DISABLE ROW LEVEL SECURITY;

COMMIT;
