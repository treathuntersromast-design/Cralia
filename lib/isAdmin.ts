// TODO: 将来的にこの判定を DB の users.is_admin カラムで行うように移行する
export function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return adminIds.includes(userId)
}
