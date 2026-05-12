-- ============================================================
-- public.users（auth.users の拡張）
-- 依存: auth.users, m_activity_style, m_entity_type
--
-- ■ 変更履歴
--   roles TEXT[] → activity_style_id SMALLINT FK（m_activity_style）
--   entity_type TEXT → FK制約追加（m_entity_type）
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.users (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 活動スタイル（1: クリエイター / 2: 依頼者 / 3: クリエイター・依頼者）
  activity_style_id SMALLINT    REFERENCES public.m_activity_style(code),
  display_name      TEXT,
  avatar_url        TEXT,
  -- エンティティタイプ FK → m_entity_type(value)
  entity_type       TEXT        DEFAULT 'individual'
                                REFERENCES public.m_entity_type(value),
  sns_links         JSONB       DEFAULT '{}',
  -- 依頼者タイプ（m_client_type.value の複数選択）
  client_type       TEXT[]      NOT NULL DEFAULT '{}',
  -- 公開ユーザーID（8桁数字、検索・プロフィール表示用）
  display_id             CHAR(8)     UNIQUE,
  -- 依頼者向けAIクリエイター提案機能の有効/無効
  ai_suggestion_enabled  BOOLEAN     NOT NULL DEFAULT true,
  -- 利用規約への同意日時
  terms_agreed_at        TIMESTAMPTZ,
  -- 評価の外部公開設定（false=5件未満は自動非表示、true=件数に関わらず公開）
  show_rating_publicly   BOOLEAN     NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"   ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own"   ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_service_role" ON public.users FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON COLUMN public.users.activity_style_id    IS 'FK → m_activity_style.code（1: クリエイター, 2: 依頼者, 3: 両方）';
COMMENT ON COLUMN public.users.entity_type           IS 'FK → m_entity_type.value（individual / corporate）';
COMMENT ON COLUMN public.users.client_type           IS '依頼者タイプ（m_client_type.value の複数選択）';
COMMENT ON COLUMN public.users.show_rating_publicly  IS 'true: 受注件数に関わらず評価を外部公開。false(デフォルト): order_to_creator レビューが REVIEW_DISPLAY_THRESHOLD 件未満の場合は非表示';

COMMIT;
