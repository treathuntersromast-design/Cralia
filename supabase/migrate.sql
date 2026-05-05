-- ================================================================
-- Cralia 一括マイグレーション: 2ステップキャンセル・営業→受注連携
-- 実行後はこのファイルを削除してください。
--
-- 【実行前チェック】
--   SELECT code, value, label_ja FROM public.m_project_status ORDER BY code;
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'projects';
--   SELECT table_name FROM information_schema.tables WHERE table_name = 'pitch_messages';
-- ================================================================

BEGIN;

-- STEP 1: pitch_messages テーブル作成（存在しない場合のみ）
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

ALTER TABLE public.pitch_messages ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（IF NOT EXISTS は CREATE POLICY では使えないため DROP IF EXISTS で冪等対応）
DROP POLICY IF EXISTS "pitch_messages_select_parties" ON public.pitch_messages;
CREATE POLICY "pitch_messages_select_parties" ON public.pitch_messages FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = client_id);

DROP POLICY IF EXISTS "pitch_messages_insert_creator" ON public.pitch_messages;
CREATE POLICY "pitch_messages_insert_creator" ON public.pitch_messages FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "pitch_messages_service_role" ON public.pitch_messages;
CREATE POLICY "pitch_messages_service_role" ON public.pitch_messages FOR ALL TO service_role USING (true);

COMMENT ON TABLE  public.pitch_messages            IS 'クリエイターが依頼者に送る営業メッセージ';
COMMENT ON COLUMN public.pitch_messages.creator_id IS 'FK → users.id（送信したクリエイター）';
COMMENT ON COLUMN public.pitch_messages.client_id  IS 'FK → users.id（受信した依頼者）';
COMMENT ON COLUMN public.pitch_messages.message    IS '営業メッセージ本文';
COMMENT ON COLUMN public.pitch_messages.read_at    IS '依頼者が既読した日時（NULL = 未読）';
COMMENT ON COLUMN public.pitch_messages.replied_at IS '依頼者が返信した日時（NULL = 未返信）';
COMMENT ON COLUMN public.pitch_messages.reply_body IS '依頼者の返信本文';

-- STEP 2: m_project_status に cancel_requested を追加
INSERT INTO public.m_project_status (code, value, label_ja, is_terminal, sort_order) VALUES
  (9, 'cancel_requested', 'キャンセル申請中', false, 9)
ON CONFLICT (code) DO NOTHING;

-- STEP 3: projects テーブルに新カラム追加
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cancel_requested_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS cancel_prev_status  TEXT REFERENCES public.m_project_status(value),
  ADD COLUMN IF NOT EXISTS pitch_id            UUID REFERENCES public.pitch_messages(id);

-- STEP 4: コメント付与
COMMENT ON COLUMN public.projects.cancel_requested_by IS 'キャンセル申請者の user_id（cancel_requested 状態時のみセット）';
COMMENT ON COLUMN public.projects.cancel_prev_status  IS 'キャンセル申請前のステータス（cancel_requested 解除時に戻す先）';
COMMENT ON COLUMN public.projects.pitch_id            IS '営業メッセージ起点の依頼の場合、元の pitch_messages.id を参照';

COMMIT;

-- ================================================================
-- 【実行後の確認クエリ】
--   SELECT code, value, label_ja FROM public.m_project_status ORDER BY code;
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'projects' AND column_name IN ('cancel_requested_by','cancel_prev_status','pitch_id');
--   SELECT table_name FROM information_schema.tables WHERE table_name = 'pitch_messages';
-- ================================================================
