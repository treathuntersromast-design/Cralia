-- ============================================================
-- CreMatch - Full Schema v1.1
-- 実行順序: このファイルを Supabase SQL Editor で実行してください
-- ============================================================

-- ============================================================
-- 1. users テーブル（Supabase auth.users の拡張）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  roles        TEXT[] NOT NULL DEFAULT '{}',
  display_name TEXT,
  avatar_url   TEXT,
  entity_type  TEXT DEFAULT 'individual',
  sns_links    JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"   ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own"   ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_service_role" ON public.users FOR ALL TO service_role USING (true);

-- ============================================================
-- 2. creator_profiles テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  creator_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  creator_type  TEXT[] NOT NULL DEFAULT '{}',
  skills        TEXT[] DEFAULT '{}',
  bio           TEXT CHECK (char_length(bio) <= 400),
  price_min     INTEGER CHECK (price_min >= 0),
  price_note    TEXT,
  delivery_days TEXT,
  project_types TEXT[] DEFAULT '{}',
  availability  TEXT NOT NULL CHECK (availability IN ('open', 'one_slot', 'full')) DEFAULT 'open',
  schedule      JSONB NOT NULL DEFAULT '{"days": [1, 2, 3, 4, 5], "default_working_days": 10}'::jsonb,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_profiles_select_all"   ON public.creator_profiles FOR SELECT USING (true);
CREATE POLICY "creator_profiles_insert_own"   ON public.creator_profiles FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "creator_profiles_update_own"   ON public.creator_profiles FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "creator_profiles_delete_own"   ON public.creator_profiles FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "creator_profiles_service_role" ON public.creator_profiles FOR ALL TO service_role USING (true);

-- ============================================================
-- 3. portfolios テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portfolios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,
  url           TEXT NOT NULL,
  title         TEXT,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolios_select_all"   ON public.portfolios FOR SELECT USING (true);
CREATE POLICY "portfolios_insert_own"   ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "portfolios_update_own"   ON public.portfolios FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "portfolios_delete_own"   ON public.portfolios FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "portfolios_service_role" ON public.portfolios FOR ALL TO service_role USING (true);

-- ============================================================
-- 4. creator_tokens テーブル（Googleカレンダー連携用）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.creator_tokens (
  creator_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.creator_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_tokens_own"          ON public.creator_tokens FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "creator_tokens_service_role" ON public.creator_tokens FOR ALL TO service_role USING (true);

-- ============================================================
-- 5. projects（依頼）テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES public.users(id),
  creator_id  UUID NOT NULL REFERENCES public.users(id),
  title       TEXT NOT NULL,
  description TEXT,
  budget      INTEGER CHECK (budget >= 0),
  deadline    DATE,
  status      TEXT NOT NULL CHECK (status IN (
    'draft', 'pending', 'accepted', 'in_progress',
    'delivered', 'completed', 'cancelled', 'disputed'
  )) DEFAULT 'draft',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_participant" ON public.projects FOR SELECT USING (auth.uid() = client_id OR auth.uid() = creator_id);
CREATE POLICY "projects_insert_client"      ON public.projects FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "projects_update_participant" ON public.projects FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = creator_id);
CREATE POLICY "projects_service_role"       ON public.projects FOR ALL TO service_role USING (true);

-- ============================================================
-- 6. messages テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES public.users(id),
  body       TEXT,
  file_url   TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_participant" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.client_id = auth.uid() OR p.creator_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.client_id = auth.uid() OR p.creator_id = auth.uid())
    )
  );

CREATE POLICY "messages_service_role" ON public.messages FOR ALL TO service_role USING (true);

-- ============================================================
-- 7. payments テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID NOT NULL REFERENCES public.projects(id),
  amount                   INTEGER NOT NULL CHECK (amount > 0),
  fee                      INTEGER DEFAULT 0 CHECK (fee >= 0),
  status                   TEXT NOT NULL CHECK (status IN ('held', 'released', 'refunded')) DEFAULT 'held',
  stripe_payment_intent_id TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_participant" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.client_id = auth.uid() OR p.creator_id = auth.uid())
    )
  );

CREATE POLICY "payments_service_role" ON public.payments FOR ALL TO service_role USING (true);

-- ============================================================
-- 8. subscriptions テーブル（単一プラン: standard ¥500/月・税抜）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan                   TEXT NOT NULL DEFAULT 'standard',
  status                 TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due')) DEFAULT 'active',
  current_period_end     TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"   ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_service_role" ON public.subscriptions FOR ALL TO service_role USING (true);

-- ============================================================
-- 9. reviews テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id),
  reviewer_id UUID NOT NULL REFERENCES public.users(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_all"    ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own"    ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "reviews_service_role"  ON public.reviews FOR ALL TO service_role USING (true);

-- ============================================================
-- 10. notifications テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"   ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own"   ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_service_role" ON public.notifications FOR ALL TO service_role USING (true);

-- ============================================================
-- Storage: avatars バケット（Public）
-- Supabase ダッシュボード > Storage > New bucket で作成してください
-- Bucket name: avatars / Public bucket: ON
-- ============================================================
