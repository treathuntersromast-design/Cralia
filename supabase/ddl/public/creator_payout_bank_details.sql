-- ============================================================
-- public.creator_payout_bank_details（振込先情報・管理者専用）
-- クリエイターには非公開。RLS 無効（service_role のみ）。
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.creator_payout_bank_details (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_payout_id UUID        NOT NULL UNIQUE REFERENCES public.creator_payouts(id) ON DELETE CASCADE,
  bank_info         TEXT        NOT NULL,   -- 振込先情報（管理者入力）
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  public.creator_payout_bank_details          IS '振込先情報。管理者専用。クリエイターには非公開。';
COMMENT ON COLUMN public.creator_payout_bank_details.bank_info IS '管理者が入力する振込先メモ。クリエイターには返さない。';

-- RLS 無効（service_role のみアクセス可）
ALTER TABLE public.creator_payout_bank_details DISABLE ROW LEVEL SECURITY;

COMMIT;
