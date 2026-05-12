-- ============================================================
-- public.events（クリエイター交流会）
-- 依存: public.users（created_by FK）
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT,
  event_date       TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ,
  apply_deadline   TIMESTAMPTZ,
  location         TEXT        NOT NULL DEFAULT 'オンライン',
  venue_type       TEXT        NOT NULL DEFAULT 'online'
                               CHECK (venue_type IN ('online', 'offline', 'hybrid')),
  capacity         INTEGER     NOT NULL DEFAULT 30 CHECK (capacity > 0),
  fee              INTEGER     NOT NULL DEFAULT 0 CHECK (fee >= 0),
  target_audience  TEXT,
  banner_url       TEXT,
  cancel_policy    TEXT,
  organizer_name   TEXT,
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  status           TEXT        NOT NULL DEFAULT 'open'
                               CHECK (status IN ('open', 'closed', 'cancelled')),
  is_featured      BOOLEAN     NOT NULL DEFAULT false,
  created_by       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  public.events                  IS 'クリエイター交流会イベント';
COMMENT ON COLUMN public.events.event_date       IS '開始日時（タイムゾーン付き）';
COMMENT ON COLUMN public.events.ends_at          IS '終了日時（任意）';
COMMENT ON COLUMN public.events.apply_deadline   IS '申込締め切り日時（任意）';
COMMENT ON COLUMN public.events.location         IS '開催場所（"オンライン" or 会場名）';
COMMENT ON COLUMN public.events.venue_type       IS '開催形式: online / offline / hybrid';
COMMENT ON COLUMN public.events.capacity         IS '定員人数';
COMMENT ON COLUMN public.events.fee              IS '参加費（JPY, 0=無料）';
COMMENT ON COLUMN public.events.target_audience  IS '対象者（例: 初心者向け、クリエイター全般）';
COMMENT ON COLUMN public.events.banner_url       IS 'バナー画像URL（任意）';
COMMENT ON COLUMN public.events.cancel_policy    IS 'キャンセルポリシー（任意）';
COMMENT ON COLUMN public.events.organizer_name   IS '担当者・主催者名（任意）';
COMMENT ON COLUMN public.events.tags             IS '表示タグ（例: VTuber, 楽曲制作）';
COMMENT ON COLUMN public.events.status           IS 'open: 受付中 / closed: 締切 / cancelled: 中止';
COMMENT ON COLUMN public.events.is_featured      IS '注目イベントとしてトップに表示するか';
COMMENT ON COLUMN public.events.created_by       IS 'FK → users.id（作成した管理者）';

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_all"    ON public.events;
DROP POLICY IF EXISTS "events_service_role"  ON public.events;

CREATE POLICY "events_select_all"   ON public.events FOR SELECT USING (true);
CREATE POLICY "events_service_role" ON public.events FOR ALL TO service_role USING (true);

COMMIT;
