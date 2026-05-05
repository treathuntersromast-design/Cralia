-- ============================================================
-- public.pitch_messages（クリエイター → 依頼者 営業メッセージ）
-- クリエイターが依頼者に直接送る売り込みメッセージテーブル
-- 依存: public.users
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.pitch_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message      TEXT        NOT NULL,
  read_at      TIMESTAMPTZ,
  replied_at   TIMESTAMPTZ,
  reply_body   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.pitch_messages ENABLE ROW LEVEL SECURITY;

-- creator_id または client_id が自分なら閲覧可能
CREATE POLICY "pitch_messages_select_parties"  ON public.pitch_messages FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = client_id);
-- 送信は creator_id = 自分のみ
CREATE POLICY "pitch_messages_insert_creator"  ON public.pitch_messages FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
-- service_role は全権（返信更新に使用）
CREATE POLICY "pitch_messages_service_role"    ON public.pitch_messages FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON TABLE  public.pitch_messages            IS 'クリエイターが依頼者に送る営業メッセージ';
COMMENT ON COLUMN public.pitch_messages.creator_id IS 'FK → users.id（送信したクリエイター）';
COMMENT ON COLUMN public.pitch_messages.client_id  IS 'FK → users.id（受信した依頼者）';
COMMENT ON COLUMN public.pitch_messages.message    IS '営業メッセージ本文';
COMMENT ON COLUMN public.pitch_messages.read_at    IS '依頼者が既読した日時（NULL = 未読）';
COMMENT ON COLUMN public.pitch_messages.replied_at IS '依頼者が返信した日時（NULL = 未返信）';
COMMENT ON COLUMN public.pitch_messages.reply_body IS '依頼者の返信本文';

COMMIT;
