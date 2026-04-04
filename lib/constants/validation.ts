// ============================================================
// バリデーション上限値
// API ルートとフォームの両方で参照する
// ============================================================

export const VALIDATION = {
  // ユーザープロフィール
  DISPLAY_NAME_MAX:   30,
  BIO_MAX:           400,
  PRICE_NOTE_MAX:    500,
  DELIVERY_DAYS_MAX:  30,
  SKILL_TAG_MAX:      50,
  SKILLS_MAX:         20,
  PORTFOLIOS_MAX:      5,
  SNS_LINKS_MAX:       7,

  // 案件（job_listings）
  JOB_TITLE_MAX:     100,
  JOB_DESC_MAX:     2000,

  // プロジェクト（project_boards）
  PROJECT_TITLE_MAX:   60,
  PROJECT_DESC_MAX:  1000,
  PROJECT_ROLES_MAX:   20,
  ROLE_NAME_MAX:       40,
  ROLE_DESC_MAX:      100,

  // 個人情報
  REAL_NAME_MAX:       50,
  PHONE_MAX:           15,
  ADDRESS_MAX:        200,
} as const
