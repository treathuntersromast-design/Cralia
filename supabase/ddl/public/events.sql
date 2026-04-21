-- ============================================================
-- public.events（クリエイター交流会）
-- 依存: なし（管理者が直接 INSERT する運用）
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  description  TEXT,
  event_date   TIMESTAMPTZ NOT NULL,
  location     TEXT        NOT NULL DEFAULT 'オンライン',
  capacity     INTEGER     NOT NULL DEFAULT 30 CHECK (capacity > 0),
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  status       TEXT        NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open', 'closed', 'cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  public.events             IS 'クリエイター交流会イベント';
COMMENT ON COLUMN public.events.event_date  IS 'イベント開催日時（タイムゾーン付き）';
COMMENT ON COLUMN public.events.location    IS '開催場所（"オンライン" or 会場名）';
COMMENT ON COLUMN public.events.capacity    IS '定員人数';
COMMENT ON COLUMN public.events.tags        IS '表示タグ（例: VTuber, 楽曲制作）';
COMMENT ON COLUMN public.events.status      IS 'open: 受付中 / closed: 締切 / cancelled: 中止';

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_all"    ON public.events;
DROP POLICY IF EXISTS "events_service_role"  ON public.events;

CREATE POLICY "events_select_all"   ON public.events FOR SELECT USING (true);
CREATE POLICY "events_service_role" ON public.events FOR ALL TO service_role USING (true);

COMMIT;
