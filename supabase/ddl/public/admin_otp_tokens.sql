BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_otp_tokens (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL,
  code       CHAR(6)     NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_otp_tokens_user_expires
  ON public.admin_otp_tokens (user_id, expires_at DESC);

COMMENT ON TABLE  public.admin_otp_tokens              IS '管理者ログイン時のワンタイムパスコード（2要素認証用）';
COMMENT ON COLUMN public.admin_otp_tokens.user_id      IS 'auth.users.id（FK制約は意図的に省略：RLS無効化と整合）';
COMMENT ON COLUMN public.admin_otp_tokens.code         IS '6桁の数字コード';
COMMENT ON COLUMN public.admin_otp_tokens.expires_at   IS '有効期限（発行から5分）';
COMMENT ON COLUMN public.admin_otp_tokens.used         IS '使用済みフラグ（検証後 true にして再利用を防ぐ）';

-- service_role のみアクセス可（公開ポリシーなし = 一般ユーザーは読み書き不可）
ALTER TABLE public.admin_otp_tokens ENABLE ROW LEVEL SECURITY;

COMMIT;
