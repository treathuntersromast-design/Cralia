-- ============================================================
-- public.user_personal_info（非公開の個人情報・決済用）
-- 依存: public.users
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_personal_info (
  user_id          UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  real_name        TEXT,
  company_name     TEXT,
  postal_code      TEXT,
  prefecture       TEXT,
  address          TEXT,
  phone_number     TEXT,
  corporate_number TEXT        CHECK (corporate_number IS NULL OR corporate_number ~ '^[0-9]{13}$'),
  invoice_number   TEXT        CHECK (invoice_number   IS NULL OR invoice_number   ~ '^T[0-9]{13}$'),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_personal_info ENABLE ROW LEVEL SECURITY;

-- 本人のみ読み書き可。service_role は全件アクセス可（管理・決済用）
CREATE POLICY "personal_info_own"          ON public.user_personal_info FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "personal_info_service_role" ON public.user_personal_info FOR ALL TO service_role USING (true);

COMMENT ON COLUMN public.user_personal_info.corporate_number IS '法人番号（国税庁）13桁の数字';
COMMENT ON COLUMN public.user_personal_info.invoice_number   IS '適格請求書発行事業者登録番号 T + 13桁';

COMMIT;
