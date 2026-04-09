/**
 * エラーログ基盤
 * Supabase の error_logs テーブルに非同期で記録する。
 * テーブルが存在しない場合はコンソール出力にフォールバック。
 */
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function logError(params: {
  endpoint: string
  message:  string
  stack?:   string
  userId?:  string
  meta?:    Record<string, unknown>
}): Promise<void> {
  const { endpoint, message, stack, userId, meta } = params

  // 常にコンソールにも出力
  console.error(`[${endpoint}]`, message, stack ?? '')

  try {
    const db = getDb()
    await db.from('error_logs').insert({
      endpoint,
      message,
      stack:    stack ?? null,
      user_id:  userId ?? null,
      meta:     meta   ?? null,
    })
  } catch {
    // error_logs テーブルが未作成の場合はサイレントに無視
  }
}
