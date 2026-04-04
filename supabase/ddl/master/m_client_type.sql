-- ============================================================
-- public.m_client_type（依頼者タイプマスタ）
-- users.client_type[] の選択肢
--
-- 設計方針:
--   「依頼する側になることが多いロール」のみを収録する。
--   制作スキルを持つが外注もする立場（VTuber, ボカロP 等）は含める。
--   純粋な制作者ロール（イラストレーター等）は m_creator_type で管理。
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_client_type (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_client_type (code, value, label_ja, sort_order) VALUES
  (1,  'vtuber',        'VTuber / Vライバー',  1),
  (2,  'vocaloid_p',    'ボカロP',             2),
  (3,  'youtuber',      'YouTuber / 配信者',   3),
  (4,  'music_artist',  '音楽アーティスト',    4),
  (5,  'game_creator',  'ゲーム制作者',        5),
  (6,  'singer',        '歌い手',              6),
  (7,  'director',      '監督・監修',          7),
  (8,  'doujin',        '同人作家',            8),
  (9,  'corporate',     '企業・法人',          9),
  (10, 'other',         'その他',             10)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_client_type ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "m_client_type_select_all" ON public.m_client_type;
CREATE POLICY "m_client_type_select_all" ON public.m_client_type FOR SELECT USING (true);

COMMENT ON TABLE  public.m_client_type      IS '依頼者タイプマスタ（外注・発注する側のロール）';
COMMENT ON COLUMN public.m_client_type.code IS '1: VTuber/Vライバー, 2: ボカロP, 3: YouTuber/配信者, 4: 音楽アーティスト, 5: ゲーム制作者, 6: 歌い手, 7: 監督・監修, 8: 同人作家, 9: 企業・法人, 10: その他';

COMMIT;
