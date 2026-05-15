import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
const OTP_EXPIRY_MS     = 5 * 60 * 1000  // 5 分
const RESEND_COOLDOWN_S = 60              // 再送信クールダウン秒数

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(_request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // クールダウンチェック（1分以内に送信済みなら拒否）
  const cooldownCutoff = new Date(Date.now() - RESEND_COOLDOWN_S * 1000).toISOString()
  const { data: recent } = await db
    .from('admin_otp_tokens')
    .select('id')
    .eq('user_id', user.id)
    .gte('created_at', cooldownCutoff)
    .limit(1)

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: `再送信は ${RESEND_COOLDOWN_S} 秒後にお試しください` },
      { status: 429 }
    )
  }

  // コード生成・保存
  const code      = generateOtp()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString()
  await db.from('admin_otp_tokens').insert({ user_id: user.id, code, expires_at: expiresAt })

  // 古いトークンを削除（クリーンアップ）
  await db
    .from('admin_otp_tokens')
    .delete()
    .eq('user_id', user.id)
    .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // ── メール送信 ────────────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[ADMIN OTP] RESEND_API_KEY が未設定です。コード: ${code} (宛先: ${user.email})`)
    }
    return NextResponse.json({
      sent:     true,
      cooldown: RESEND_COOLDOWN_S,
      _devNote: process.env.NODE_ENV !== 'production'
        ? `RESEND_API_KEY 未設定: サーバーログでコードを確認してください (${code})`
        : undefined,
    })
  }

  const from   = process.env.RESEND_FROM_EMAIL ?? 'Cralia <noreply@cralia.com>'
  const resend = new Resend(apiKey)

  const { error: sendError } = await resend.emails.send({
    from,
    to:      user.email!,
    subject: '【Cralia】管理者認証コード',
    text: [
      '管理者ログインの確認コードです。',
      '',
      `認証コード: ${code}`,
      '',
      'このコードは 5 分間有効です。',
      '心当たりがない場合は無視してください。',
      '',
      '---',
      'Cralia サポートチーム',
    ].join('\n'),
  })

  if (sendError) {
    console.error('[ADMIN OTP] Resend エラー:', sendError)
    // DB に保存済みのコードを無効化して再送信できるようにする
    await db.from('admin_otp_tokens').update({ used: true }).eq('user_id', user.id).eq('code', code)
    return NextResponse.json(
      { error: `メール送信に失敗しました: ${sendError.message}` },
      { status: 500 }
    )
  }
  // ─────────────────────────────────────────────────────────────────

  return NextResponse.json({ sent: true, cooldown: RESEND_COOLDOWN_S })
}
