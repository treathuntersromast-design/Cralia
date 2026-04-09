-- ============================================================
-- public.m_activity_style（活動スタイルマスタ）
-- users.activity_style_id の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_activity_style (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,   -- アプリ内部キー
  label_ja   TEXT        NOT NULL,          -- 日本語表示名
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_activity_style (code, value, label_ja, sort_order) VALUES
  (1, 'creator', 'クリエイター',          1),
  (2, 'client',  '依頼者',               2),
  (3, 'both',    'クリエイター / 依頼者', 3)
ON CONFLICT (code) DO NOTHING;

-- 参照元テーブルから直接 SELECT できるよう全員に READ 権限を付与
ALTER TABLE public.m_activity_style ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_activity_style_select_all" ON public.m_activity_style FOR SELECT USING (true);

COMMENT ON TABLE  public.m_activity_style       IS '活動スタイルマスタ（クリエイター / 依頼者 / 両方）';
COMMENT ON COLUMN public.m_activity_style.code  IS '1: クリエイター, 2: 依頼者, 3: クリエイター / 依頼者';
COMMENT ON COLUMN public.m_activity_style.value IS 'アプリ内部キー（creator / client / both）';

COMMIT;
