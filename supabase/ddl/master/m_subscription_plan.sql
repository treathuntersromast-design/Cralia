-- ============================================================
-- public.m_subscription_plan（サブスクリプションプランマスタ）
-- subscriptions.plan の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_subscription_plan (
  code        SMALLINT    PRIMARY KEY,
  value       TEXT        NOT NULL UNIQUE,
  label_ja    TEXT        NOT NULL,
  price_jpy   INTEGER     NOT NULL DEFAULT 0 CHECK (price_jpy >= 0),
  is_beta     BOOLEAN     NOT NULL DEFAULT false,  -- ベータ版無料期間対象
  sort_order  SMALLINT    NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_subscription_plan (code, value, label_ja, price_jpy, is_beta, sort_order) VALUES
  (1, 'beta',      'ベータプラン',    0,     true,  1),
  (2, 'standard',  'スタンダード',    0,     false, 2),  -- 準備中（ベータ期間は¥0）
  (3, 'pro',       'プロ',           0,     false, 3),  -- 準備中
  (4, 'corporate', '法人プラン',      0,     false, 4)   -- 準備中
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_subscription_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_subscription_plan_select_all" ON public.m_subscription_plan FOR SELECT USING (true);

COMMENT ON TABLE  public.m_subscription_plan          IS 'サブスクリプションプランマスタ';
COMMENT ON COLUMN public.m_subscription_plan.is_beta  IS 'ベータ版無料期間の対象プランかどうか';
COMMENT ON COLUMN public.m_subscription_plan.price_jpy IS '月額料金（円）※ベータ期間中は全プラン¥0';

COMMIT;
