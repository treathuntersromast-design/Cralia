-- ============================================================
-- public.creator_listings（クリエイター仕事募集掲示板）
-- クリエイターが「こんな仕事できます」を投稿するテーブル
-- 依存: public.users, m_order_type
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.creator_listings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  description   TEXT,
  -- 対応クリエイタータイプ（m_creator_type.value の複数選択）
  creator_types TEXT[]      NOT NULL DEFAULT '{}',
  -- 依頼タイプ FK → m_order_type(value)
  order_type    TEXT        NOT NULL DEFAULT 'paid'
                            REFERENCES public.m_order_type(value),
  price_min     INTEGER     CHECK (price_min >= 0),
  price_max     INTEGER     CHECK (price_max >= 0),
  -- price_min ≤ price_max
  CONSTRAINT creator_listings_price_order CHECK (
    price_min IS NULL OR price_max IS NULL OR price_min <= price_max
  ),
  -- open / closed
  status        TEXT        NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'closed')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.creator_listings ENABLE ROW LEVEL SECURITY;

-- open な投稿は全ログインユーザーが閲覧可能
CREATE POLICY "creator_listings_select_open"   ON public.creator_listings FOR SELECT USING (status = 'open' OR auth.uid() = creator_id);
CREATE POLICY "creator_listings_insert_own"    ON public.creator_listings FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "creator_listings_update_own"    ON public.creator_listings FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "creator_listings_delete_own"    ON public.creator_listings FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "creator_listings_service_role"  ON public.creator_listings FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON TABLE  public.creator_listings             IS 'クリエイター仕事募集掲示板。クリエイターが依頼者に向けて提供サービスを投稿する';
COMMENT ON COLUMN public.creator_listings.creator_id  IS 'FK → users.id（投稿したクリエイター）';
COMMENT ON COLUMN public.creator_listings.creator_types IS '対応クリエイタータイプ（m_creator_type.value の複数選択）';
COMMENT ON COLUMN public.creator_listings.order_type  IS 'FK → m_order_type.value（paid / free）';
COMMENT ON COLUMN public.creator_listings.price_min   IS '希望価格下限（円）';
COMMENT ON COLUMN public.creator_listings.price_max   IS '希望価格上限（円）';
COMMENT ON COLUMN public.creator_listings.status      IS '公開状態（open: 公開中 / closed: 締め切り済み）';

COMMIT;
