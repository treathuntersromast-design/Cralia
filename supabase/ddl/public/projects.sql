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
  -- ポートフォリオ掲載許可（クリエイターが納品物をポートフォリオに使用できるか）
  portfolio_allowed BOOLEAN NOT NULL DEFAULT false,
  -- キャンセル申請（2ステップキャンセル用）
  cancel_requested_by UUID        REFERENCES public.users(id),
  cancel_prev_status  TEXT        REFERENCES public.m_project_status(value),
  -- 営業メッセージ起点（pitch_messages.id への任意参照）
  pitch_id            UUID        REFERENCES public.pitch_messages(id),
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
COMMENT ON COLUMN public.projects.order_type            IS 'FK → m_order_type.value（paid / free）';
COMMENT ON COLUMN public.projects.status                IS 'FK → m_project_status.value（draft〜cancel_requested）';
COMMENT ON COLUMN public.projects.portfolio_allowed     IS 'クリエイターが納品物をポートフォリオとして公開することを依頼者が許可するか（デフォルト: false）';
COMMENT ON COLUMN public.projects.cancel_requested_by  IS 'キャンセル申請者の user_id（cancel_requested 状態時のみセット）';
COMMENT ON COLUMN public.projects.cancel_prev_status   IS 'キャンセル申請前のステータス（cancel_requested 解除時に戻す先）';
COMMENT ON COLUMN public.projects.pitch_id             IS '営業メッセージ起点の依頼の場合、元の pitch_messages.id を参照';

COMMIT;
