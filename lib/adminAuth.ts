/**
 * 管理者 OTP 認証クッキーのヘルパー
 * Web Crypto API を使用 — Edge Middleware と Node.js サーバー両方で動作する
 */

export const ADMIN_COOKIE_NAME = 'admin_verified'

// クッキー有効期間: 1 時間
const EXPIRES_MS = 60 * 60 * 1000

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return toHex(sig)
}

/**
 * OTP 検証後にクッキーへ保存するトークン文字列を生成する。
 * 形式: `userId:expires:hmacSig`
 */
export async function createAdminToken(
  userId: string
): Promise<{ value: string; maxAge: number }> {
  const secret = process.env.ADMIN_OTP_SECRET ?? 'change-me-in-production'
  const expires = Date.now() + EXPIRES_MS
  const data = `${userId}:${expires}`
  const sig = await hmacSign(secret, data)
  return { value: `${data}:${sig}`, maxAge: 3600 }
}

/**
 * クッキートークンを検証し、有効なら userId を返す。無効なら null。
 */
export async function verifyAdminToken(token: string | undefined): Promise<string | null> {
  if (!token) return null
  // UUID にコロンは含まれないため split(':') で 3 要素に分かれることを期待する
  const parts = token.split(':')
  if (parts.length !== 3) return null
  const [userId, expiresStr, sig] = parts
  const expires = parseInt(expiresStr, 10)
  if (isNaN(expires) || Date.now() > expires) return null
  const data = `${userId}:${expires}`
  const secret = process.env.ADMIN_OTP_SECRET ?? 'change-me-in-production'
  const expected = await hmacSign(secret, data)
  if (sig !== expected) return null
  return userId
}
