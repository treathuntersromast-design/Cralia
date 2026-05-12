-- ============================================================
-- public.payments（プラットフォーム預かり決済）
-- 依存: public.projects, m_payment_status
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.payments (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  UUID        NOT NULL REFERENCES public.projects(id),
  amount                      INTEGER     NOT NULL CHECK (amount > 0),
  fee                         INTEGER     DEFAULT 0 CHECK (fee >= 0),
  -- ステータス FK → m_payment_status(value)
  status                      TEXT        NOT NULL DEFAULT 'pending'
                                          REFERENCES public.m_payment_status(value),
  stripe_payment_intent_id    TEXT,
  stripe_checkout_session_id  TEXT        UNIQUE,
  stripe_charge_id            TEXT,
  checkout_expires_at         TIMESTAMPTZ,
  refunded_amount             INTEGER     NOT NULL DEFAULT 0,
  currency                    TEXT        NOT NULL DEFAULT 'jpy',
  paid_at                     TIMESTAMPTZ,
  payment_status              TEXT,        -- Stripe 側の payment_status（paid / unpaid 等）
  admin_note                  TEXT,        -- 管理者メモ（調整履歴は payment_adjustments）
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- stripe_payment_intent_id に UNIQUE INDEX（NULL 除外）
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_payment_intent_id_key
  ON public.payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_participant" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.client_id = auth.uid() OR p.creator_id = auth.uid())
    )
  );
CREATE POLICY "payments_service_role" ON public.payments FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON TABLE  public.payments                            IS 'プラットフォーム預かり決済（検収後支払い）';
COMMENT ON COLUMN public.payments.status                     IS 'FK → m_payment_status.value';
COMMENT ON COLUMN public.payments.refunded_amount            IS 'refund.updated(succeeded)確認後に累積加算。refund.created では加算しない。';
COMMENT ON COLUMN public.payments.stripe_payment_intent_id  IS 'UNIQUE INDEX（NULL 除外）';
COMMENT ON COLUMN public.payments.admin_note                 IS '管理者メモ。調整履歴は payment_adjustments テーブルで管理。';

COMMIT;
