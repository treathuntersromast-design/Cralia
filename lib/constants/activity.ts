// ============================================================
// 活動スタイル（m_activity_style FK）
// DB: users.activity_style_id SMALLINT
// ============================================================

export const ACTIVITY_STYLE_ID = {
  CREATOR: 1,
  CLIENT:  2,
  BOTH:    3,
} as const

export type ActivityStyleId = typeof ACTIVITY_STYLE_ID[keyof typeof ACTIVITY_STYLE_ID]

export const ROLE_LABELS: Record<string, string> = {
  creator: 'クリエイター',
  client:  '依頼者',
}

/** activity_style_id → roles 文字列配列 */
export function activityStyleToRoles(styleId: number | null): ('creator' | 'client')[] {
  if (styleId === ACTIVITY_STYLE_ID.BOTH)    return ['creator', 'client']
  if (styleId === ACTIVITY_STYLE_ID.CLIENT)  return ['client']
  if (styleId === ACTIVITY_STYLE_ID.CREATOR) return ['creator']
  return []
}

/** activity_style_id → 日本語ラベル文字列 */
export function activityStyleToLabel(styleId: number | null): string {
  if (styleId === ACTIVITY_STYLE_ID.BOTH)    return `${ROLE_LABELS.creator} / ${ROLE_LABELS.client}`
  if (styleId === ACTIVITY_STYLE_ID.CLIENT)  return ROLE_LABELS.client
  return ROLE_LABELS.creator
}

/** roles 配列 → activity_style_id */
export function rolesToActivityStyleId(roles: string[]): ActivityStyleId {
  const isCreator = roles.includes('creator')
  const isClient  = roles.includes('client')
  if (isCreator && isClient) return ACTIVITY_STYLE_ID.BOTH
  if (isClient)              return ACTIVITY_STYLE_ID.CLIENT
  return ACTIVITY_STYLE_ID.CREATOR
}

/** activity_style_id が依頼者権限を持つか */
export function hasClientRole(styleId: number | null): boolean {
  return styleId === ACTIVITY_STYLE_ID.CLIENT || styleId === ACTIVITY_STYLE_ID.BOTH
}
