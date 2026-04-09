-- ============================================================
-- public.subscriptions（サブスクプラン）
-- 依存: public.users, m_subscription_plan, m_subscription_status
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- プラン FK → m_subscription_plan(value)
  plan                   TEXT        NOT NULL DEFAULT 'beta'
                                     REFERENCES public.m_subscription_plan(value),
  -- ステータス FK → m_subscription_status(value)
  status                 TEXT        NOT NULL DEFAULT 'active'
                                     REFERENCES public.m_subscription_status(value),
  current_period_end     TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"   ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_service_role" ON public.subscriptions FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON COLUMN public.subscriptions.plan   IS 'FK → m_subscription_plan.value（beta / standard / pro / corporate）';
COMMENT ON COLUMN public.subscriptions.status IS 'FK → m_subscription_status.value（active / cancelled / past_due）';

COMMIT;
