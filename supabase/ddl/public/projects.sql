-- ============================================================
-- public.projects（依頼）
-- 依存: public.users, m_order_type, m_project_status
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES public.users(id),
  creator_id  UUID        NOT NULL REFERENCES public.users(id),
  title       TEXT        NOT NULL,
  description TEXT,
  budget      INTEGER     CHECK (budget >= 0),
  deadline    DATE,
  -- 依頼タイプ FK → m_order_type(value)
  order_type  TEXT        NOT NULL DEFAULT 'paid'
                          REFERENCES public.m_order_type(value),
  -- ステータス FK → m_project_status(value)
  status      TEXT        NOT NULL DEFAULT 'draft'
                          REFERENCES public.m_project_status(value),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_participant" ON public.projects FOR SELECT USING (auth.uid() = client_id OR auth.uid() = creator_id);
CREATE POLICY "projects_insert_client"      ON public.projects FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "projects_update_participant" ON public.projects FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = creator_id);
CREATE POLICY "projects_service_role"       ON public.projects FOR ALL TO service_role USING (true);

-- ── コメント ─────────────────────────────────────────────────
COMMENT ON COLUMN public.projects.order_type IS 'FK → m_order_type.value（paid / free）';
COMMENT ON COLUMN public.projects.status     IS 'FK → m_project_status.value（draft〜disputed）';

COMMIT;
