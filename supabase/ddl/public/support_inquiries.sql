BEGIN;

CREATE TABLE IF NOT EXISTS public.support_inquiries (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  status     TEXT        NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  public.support_inquiries         IS 'ユーザーからの管理者問い合わせ';
COMMENT ON COLUMN public.support_inquiries.user_id IS 'FK → users.id（問い合わせ送信者）';
COMMENT ON COLUMN public.support_inquiries.body    IS '問い合わせ本文（1〜500文字）';
COMMENT ON COLUMN public.support_inquiries.status  IS '対応ステータス: open（未対応）/ resolved（解決済み）';

ALTER TABLE public.support_inquiries ENABLE ROW LEVEL SECURITY;

-- 本人のみ INSERT 可・参照可
CREATE POLICY "support_inquiries_insert_own" ON public.support_inquiries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "support_inquiries_select_own" ON public.support_inquiries
  FOR SELECT USING (auth.uid() = user_id);

-- service_role ポリシーは不要:
-- service_role は RLS をバイパスするため明示的なポリシーがなくても全行アクセス可能。
-- 管理者用の読み取りは Supabase Dashboard または直接 DB 操作で行う。

COMMIT;
