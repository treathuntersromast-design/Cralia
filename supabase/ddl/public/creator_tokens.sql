-- ============================================================
-- public.creator_tokens（Googleカレンダー連携用）
-- 依存: public.users
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.creator_tokens (
  creator_id    UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  access_token  TEXT        NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.creator_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_tokens_own"          ON public.creator_tokens FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "creator_tokens_service_role" ON public.creator_tokens FOR ALL TO service_role USING (true);

COMMIT;
