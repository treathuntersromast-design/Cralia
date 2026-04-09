/**
 * AI エンドポイント共通ガード
 * - レート制限：1日あたりの呼び出し上限チェック（ai_rate_limit テーブル + RPC）
 * - 外部URLチェック：AIレスポンスから外部リンクを検出・除去
 */
import { createClient as createServiceClient } from '@supabase/supabase-js'

const DAILY_LIMITS: Record<string, number> = {
  'ai/bio':              30,
  'ai/request-draft':    30,
  'ai/suggest-creators': 20,
}

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * レート制限チェック。呼び出し回数を +1 してから上限を判定。
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = DAILY_LIMITS[endpoint] ?? 20
  const today = new Date().toISOString().slice(0, 10)
  const db    = getDb()

  // インクリメント RPC（存在しなければ INSERT、あれば UPDATE）
  await db.rpc('increment_ai_rate_limit', {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_date: today,
  })

  const { data } = await db
    .from('ai_rate_limit')
    .select('call_count')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .eq('date', today)
    .single()

  const used = data?.call_count ?? 1
  return { allowed: used <= limit, used, limit }
}

// 外部URLパターン
const URL_PATTERN = /https?:\/\/[^\s"')\]]+|www\.[a-z0-9-]+\.[a-z]{2,}[^\s"')\]]*/gi

const ALLOWED_DOMAINS: string[] = []

/**
 * AIレスポンスに外部URLが含まれていれば除去して返す。
 */
export function sanitizeAiResponse(text: string): {
  sanitized: string
  hasExternalUrl: boolean
  removedUrls: string[]
} {
  const removedUrls: string[] = []

  const sanitized = text.replace(URL_PATTERN, (url) => {
    try {
      const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      if (ALLOWED_DOMAINS.some((d) => hostname.endsWith(d))) return url
    } catch { /* ignore */ }
    removedUrls.push(url)
    return '[外部リンクは除去されました]'
  })

  return { sanitized, hasExternalUrl: removedUrls.length > 0, removedUrls }
}
