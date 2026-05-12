-- ============================================================
-- public.stripe_webhook_events（Stripe webhook 冪等性管理）
-- processing → processed / failed の3状態で重複処理を防ぐ
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id      TEXT        PRIMARY KEY,
  event_type    TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'processing'
                            CHECK (status IN ('processing', 'processed', 'failed')),
  error_message TEXT,
  processed_at  TIMESTAMPTZ DEFAULT NOW()  -- processing 開始時刻（stale 判定に使用）
);

COMMENT ON TABLE  public.stripe_webhook_events        IS 'Stripe webhook 冪等性管理。processing→processed/failed';
COMMENT ON COLUMN public.stripe_webhook_events.status IS 'processing: 処理中, processed: 完了, failed: 失敗';
COMMENT ON COLUMN public.stripe_webhook_events.processed_at IS 'processing 開始時刻。5分超過で stale と判断して再処理可能';

-- RLS 無効（service_role のみ使用）
ALTER TABLE public.stripe_webhook_events DISABLE ROW LEVEL SECURITY;

COMMIT;
