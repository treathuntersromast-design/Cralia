-- ============================================================
-- public.creator_payouts（管理者による手動銀行振込記録）
-- payment_id UNIQUE で二重振込登録を防ぐ
-- 振込先情報は creator_payout_bank_details で管理者専用に分離
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.creator_payouts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   UUID        NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  creator_id   UUID        NOT NULL REFERENCES public.users(id),
  amount       INTEGER     NOT NULL CHECK (amount > 0),
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  public.creator_payouts           IS '管理者による手動銀行振込記録。payment_id UNIQUE で二重振込防止';
COMMENT ON COLUMN public.creator_payouts.amount    IS 'payout_amount = payment.amount - fee - refunded_amount（INSERT 時に計算して保存）';
COMMENT ON COLUMN public.creator_payouts.paid_at   IS '振込済み登録日時。NULL の場合は未登録（register-payout で設定）';

ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;

-- クリエイター本人は id/payment_id/amount/paid_at のみ参照可
CREATE POLICY "creator_payouts_select_own" ON public.creator_payouts
  FOR SELECT USING (auth.uid() = creator_id);

-- 書き込みは service_role のみ（RLS バイパス）
COMMENT ON COLUMN public.creator_payouts.payment_id IS 'UNIQUE 制約により register-payout の二重実行でも二重 INSERT を防ぐ';

COMMIT;
