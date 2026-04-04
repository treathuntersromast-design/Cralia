-- ============================================================
-- public.m_sns_platform（SNSプラットフォームマスタ）
-- users.sns_links[].platform および portfolios.platform の参照先
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.m_sns_platform (
  code       SMALLINT    PRIMARY KEY,
  value      TEXT        NOT NULL UNIQUE,
  label_ja   TEXT        NOT NULL,
  base_url   TEXT,                               -- プロフィールURL生成用ベースURL
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.m_sns_platform (code, value, label_ja, base_url, sort_order) VALUES
  (1,  'twitter',   'X (Twitter)',  'https://x.com/',              1),
  (2,  'instagram', 'Instagram',    'https://www.instagram.com/',  2),
  (3,  'tiktok',    'TikTok',       'https://www.tiktok.com/@',    3),
  (4,  'twitch',    'Twitch',       'https://www.twitch.tv/',      4),
  (5,  'bluesky',   'Bluesky',      'https://bsky.app/profile/',   5),
  (6,  'youtube',   'YouTube',      'https://www.youtube.com/@',   6),
  (7,  'pixiv',     'pixiv',        'https://www.pixiv.net/users/', 7),
  (8,  'fanbox',    'FANBOX',       'https://www.fanbox.cc/@',     8),
  (9,  'booth',     'BOOTH',        'https://booth.pm/ja/browse/', 9),
  (10, 'skeb',      'Skeb',         'https://skeb.jp/@',           10),
  (11, 'other',     'その他',       NULL,                           11)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.m_sns_platform ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m_sns_platform_select_all" ON public.m_sns_platform FOR SELECT USING (true);

COMMENT ON TABLE  public.m_sns_platform          IS 'SNS・ポートフォリオプラットフォームマスタ';
COMMENT ON COLUMN public.m_sns_platform.base_url IS 'ユーザーID を結合してプロフィールURLを生成する際のベースURL';

COMMIT;
