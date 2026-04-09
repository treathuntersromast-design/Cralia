-- ============================================================
-- public.m_creator_type（クリエイタータイプマスタ）
-- creator_profiles.creator_type[]  および
-- job_listings.creator_types[]     の選択肢
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_creator_type (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_creator_type (code, value, label_ja, sort_order) VALUES
  (1,  'illustrator',   'イラストレーター', 1),
  (2,  'video_editor',  '動画編集者',        2),
  (3,  'vtuber',        'VTuber',           3),
  (4,  'modeler_3d',    '3Dモデラー',        4),
  (5,  'designer',      'デザイナー',        5),
  (6,  'director',      '監督・監修',         6),
  (7,  'other',         'その他',            7)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_creator_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_creator_type_select_all" ON public.m_creator_type FOR SELECT USING (true);

COMMENT ON TABLE  public.m_creator_type      IS 'クリエイタータイプマスタ';
COMMENT ON COLUMN public.m_creator_type.code IS '1: イラストレーター, 2: 動画編集者, 3: VTuber, 4: 3Dモデラー, 5: デザイナー, 6: 監督・監修, 7: その他';

COMMIT;
