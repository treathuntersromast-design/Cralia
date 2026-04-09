-- ============================================================
-- public.payments（エスクロー決済）
-- 依存: public.projects, m_payment_status
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.payments (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID        NOT NULL REFERENCES public.projects(id),
  amount                   INTEGER     NOT NULL CHECK (amount > 0),
  fee                      INTEGER     DEFAULT 0 CHECK (fee >= 0),
  -- ステータス FK → m_payment_status(value)
  status                   TEXT        NOT NULL DEFAULT 'held'
                                       REFERENCES public.m_payment_status(value),
  stripe_payment_intent_id TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

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
COMMENT ON COLUMN public.payments.status IS 'FK → m_payment_status.value（held / released / refunded）';

COMMIT;
