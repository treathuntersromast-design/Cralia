-- ============================================================
-- public.creator_profiles
-- 依存: public.users, m_availability
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  creator_id    UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name  TEXT        NOT NULL,
  -- クリエイタータイプ（m_creator_type.value の複数選択）
  creator_type  TEXT[]      NOT NULL DEFAULT '{}',
  skills        TEXT[]      DEFAULT '{}',
  bio           TEXT        CHECK (char_length(bio) <= 400),
  price_min     INTEGER     CHECK (price_min >= 0),
  price_note    TEXT,
  delivery_days TEXT,
  project_types TEXT[]      DEFAULT '{}',
  -- 稼働状況 FK → m_availability(value)
  availability  TEXT        NOT NULL DEFAULT 'open'
                            REFERENCES public.m_availability(value),
  schedule      JSONB       NOT NULL DEFAULT '{"days": [1, 2, 3, 4, 5], "default_working_days": 10}'::jsonb,
  -- 同時受注可能な最大件数（NULL = 制限なし）
  order_limit   SMALLINT    CHECK (order_limit > 0),
  -- 料金プラン一覧 [{name, price, description, delivery_days}]
  pricing_plans JSONB       NOT NULL DEFAULT '[]'::jsonb,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_profiles_select_all"   ON public.creator_profiles FOR SELECT USING (true);
CREATE POLICY "creator_profiles_insert_own"   ON public.creator_profiles FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "creator_profiles_update_own"   ON public.creator_profiles FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "creator_profiles_delete_own"   ON public.creator_profiles FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "creator_profiles_service_role" ON public.creator_profiles FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON COLUMN public.creator_profiles.creator_type IS '活動タイプ（m_creator_type.value の複数選択）';
COMMENT ON COLUMN public.creator_profiles.availability IS 'FK → m_availability.value（open / one_slot / full）';

COMMIT;
