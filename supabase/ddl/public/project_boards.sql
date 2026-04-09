-- ============================================================
-- public.project_boards（プロジェクトボード本体）
-- 依存: public.users, m_board_status
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.project_boards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  category    TEXT,
  -- ステータス FK → m_board_status(value)
  status      TEXT        NOT NULL DEFAULT 'recruiting'
              REFERENCES public.m_board_status(value),
  is_public   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.project_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_boards_select"       ON public.project_boards FOR SELECT USING (is_public = true OR auth.uid() = owner_id);
CREATE POLICY "project_boards_insert"       ON public.project_boards FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "project_boards_update"       ON public.project_boards FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "project_boards_delete"       ON public.project_boards FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "project_boards_service_role" ON public.project_boards FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON COLUMN public.project_boards.status IS 'FK → m_board_status.value（recruiting / in_progress / completed / cancelled）';

COMMIT;
