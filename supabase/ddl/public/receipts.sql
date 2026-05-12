-- ============================================================
-- public.receipts（領収書）
-- 依頼者（client_id）のみ参照可
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.receipts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   UUID        NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  issued_at    TIMESTAMPTZ DEFAULT NOW(),
  pdf_url      TEXT
);

COMMENT ON TABLE public.receipts IS '領収書。依頼者のみ参照可。';

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts_select_own" ON public.receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      JOIN public.projects pr ON pr.id = p.project_id
      WHERE p.id = receipts.payment_id
        AND pr.client_id = auth.uid()
    )
  );

COMMIT;
