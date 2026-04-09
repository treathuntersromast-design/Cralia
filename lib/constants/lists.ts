// ============================================================
// 選択肢リスト定数
// クリエイター/依頼者タイプ・SNS・ポートフォリオプラットフォーム
// ============================================================

// ── クリエイタータイプ ────────────────────────────────────────
// DB: creator_profiles.creator_type TEXT[]（日本語ラベルをそのまま保存）
export const CREATOR_TYPES = [
  'VTuber', 'ボカロP', 'イラストレーター', '動画編集者',
  '楽曲制作関係', '3Dモデラー', 'デザイナー', 'その他',
] as const

// ── 依頼者タイプ ──────────────────────────────────────────────
// DB: users.client_type TEXT[]（value をそのまま保存）
export const CLIENT_TYPES: { value: string; label: string }[] = [
  { value: 'vtuber',       label: 'VTuber / Vライバー' },
  { value: 'vocaloid_p',   label: 'ボカロP' },
  { value: 'youtuber',     label: 'YouTuber / 配信者' },
  { value: 'music_artist', label: '音楽アーティスト' },
  { value: 'game_creator', label: 'ゲーム制作者' },
  { value: 'singer',       label: '歌い手' },
  { value: 'director',     label: '監督・監修' },
  { value: 'doujin',       label: '同人作家' },
  { value: 'corporate',    label: '企業・法人' },
  { value: 'other',        label: 'その他' },
]

// ── スキルサジェスト ─────────────────────────────────────────
export const SKILL_SUGGESTIONS = [
  // 動画
  'MV制作', '動画編集', '3DCGアニメ', 'Live2D', 'アニメーション',
  // イラスト
  'キャラクターデザイン', 'イラスト制作', '背景イラスト', 'サムネイル制作', 'ロゴデザイン', '3Dモデル制作',
  // 楽曲
  '楽曲制作', '作曲', '作詞', 'BGM制作', 'ミキシング・マスタリング', 'ボーカルミックス', '歌唱', 'コーラス', '声優',
  // その他
  'シナリオ・脚本',
] as const

// ── SNS プラットフォーム（プロフィールリンク用） ─────────────
export const SNS_PLATFORMS = [
  { label: 'X (Twitter)', prefix: '@',           placeholder: 'username'          },
  { label: 'Instagram',   prefix: '@',           placeholder: 'username'          },
  { label: 'TikTok',      prefix: '@',           placeholder: 'username'          },
  { label: 'Twitch',      prefix: 'twitch.tv/',  placeholder: 'username'          },
  { label: 'Bluesky',     prefix: '@',           placeholder: 'handle.bsky.social'},
] as const

export const SNS_ICONS: Record<string, string> = {
  'X (Twitter)': '𝕏',
  Instagram:     '📷',
  TikTok:        '🎵',
  Twitch:        '🟣',
  Bluesky:       '🦋',
}

export const SNS_BASE_URLS: Record<string, string> = {
  'X (Twitter)': 'https://x.com/',
  Instagram:     'https://instagram.com/',
  TikTok:        'https://tiktok.com/@',
  Twitch:        'https://twitch.tv/',
  Bluesky:       'https://bsky.app/profile/',
}

// ── ポートフォリオプラットフォーム ──────────────────────────
export const PORTFOLIO_PLATFORMS = [
  { label: 'YouTube',     placeholder: 'https://youtube.com/...'   },
  { label: 'pixiv',       placeholder: 'https://pixiv.net/...'     },
  { label: 'niconico',    placeholder: 'https://nicovideo.jp/...'  },
  { label: 'X (Twitter)', placeholder: 'https://x.com/...'        },
  { label: 'Instagram',   placeholder: 'https://instagram.com/...' },
  { label: 'その他',      placeholder: 'https://...'              },
] as const
