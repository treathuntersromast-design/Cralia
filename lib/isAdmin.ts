/**
 * 管理者判定ヘルパー
 *
 * 判定優先順:
 *   1. ADMIN_USER_IDS に userId が含まれる
 *   2. ADMIN_EMAILS  に email が含まれる（大文字小文字を無視）
 *
 * どちらの環境変数も未設定の場合は false を返す（誰も管理者でない）。
 */
export function isAdmin(userId: string, email?: string | null): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean)

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

  if (adminIds.length > 0 && adminIds.includes(userId)) return true
  if (email && adminEmails.length > 0 && adminEmails.includes(email.toLowerCase())) return true

  return false
}
