-- ============================================================
-- public.evaluation_reports（評価への異議申し立て）
-- 依存: public.reviews, public.users
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.evaluation_reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID        NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id UUID        NOT NULL REFERENCES public.users(id),
  reason      TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  -- 同一レビューへの重複報告を防止
  UNIQUE (review_id, reporter_id)
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.evaluation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eval_reports_select_own"   ON public.evaluation_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "eval_reports_insert_own"   ON public.evaluation_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "eval_reports_service_role" ON public.evaluation_reports FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON TABLE  public.evaluation_reports            IS '評価への異議申し立て（被評価者がサイトオーナーに報告）';
COMMENT ON COLUMN public.evaluation_reports.reason     IS '報告理由（最大1000文字）';
COMMENT ON COLUMN public.evaluation_reports.status     IS 'pending: 受付済み / reviewing: 確認中 / resolved: 対応済み / dismissed: 却下';
COMMENT ON COLUMN public.evaluation_reports.admin_note IS '管理者による対応メモ';
COMMENT ON COLUMN public.evaluation_reports.resolved_at IS '対応完了日時（resolved / dismissed のとき設定）';

COMMIT;
