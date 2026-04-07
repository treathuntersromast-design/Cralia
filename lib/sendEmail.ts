/**
 * メール通知スタブ
 * 実際の送信処理は未実装。email_logs テーブルに記録するのみ。
 * 将来的に Resend / SendGrid などのサービスと差し替える。
 */
import { createClient as createServiceClient } from '@supabase/supabase-js'

export type EmailType =
  | 'order_received'
  | 'order_accepted'
  | 'order_cancelled'
  | 'order_delivered'
  | 'order_completed'
  | 'message_received'
  | 'review_posted'

export interface EmailPayload {
  to:        string          // 送信先メールアドレス
  type:      EmailType
  subject:   string
  body:      string          // プレーンテキスト本文
  userId?:   string          // 受信者のユーザーID（ログ用）
  meta?:     Record<string, unknown>
}

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * メールを送信する（現在はログ記録のみ）。
 * email_logs テーブルが存在しない場合はコンソール出力にフォールバック。
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { to, type, subject, body, userId, meta } = payload

  // ── 将来: ここに Resend / SendGrid などの実送信処理を追加 ──
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({ from: 'noreply@Cralia.com', to, subject, text: body })

  console.info(`[sendEmail] stub: to=${to} type=${type} subject="${subject}"`)

  try {
    const db = getDb()
    await db.from('email_logs').insert({
      recipient_email: to,
      type,
      subject,
      body,
      user_id:         userId  ?? null,
      meta:            meta    ?? null,
      status:          'stub', // 'sent' に変更するのは実装後
    })
  } catch {
    // email_logs テーブルが未作成の場合はサイレントに無視
  }
}

// ─── テンプレートヘルパー ───────────────────────────────────────

export function orderReceivedEmail(params: {
  creatorEmail:  string
  creatorName:   string
  clientName:    string
  orderTitle:    string
  orderId:       string
  creatorUserId: string
}): EmailPayload {
  return {
    to:      params.creatorEmail,
    type:    'order_received',
    subject: `【Cralia】新しい依頼が届きました「${params.orderTitle}」`,
    body:    [
      `${params.creatorName} さん、`,
      '',
      `${params.clientName} さんから「${params.orderTitle}」の依頼が届きました。`,
      '',
      `依頼の確認: https://Cralia.com/orders/${params.orderId}`,
      '',
      '---',
      'Cralia サポートチーム',
    ].join('\n'),
    userId: params.creatorUserId,
    meta:   { orderId: params.orderId },
  }
}

export function orderStatusChangedEmail(params: {
  recipientEmail: string
  recipientName:  string
  recipientId:    string
  orderTitle:     string
  orderId:        string
  statusLabel:    string
  type:           EmailType
}): EmailPayload {
  return {
    to:      params.recipientEmail,
    type:    params.type,
    subject: `【Cralia】依頼ステータスが更新されました「${params.orderTitle}」`,
    body:    [
      `${params.recipientName} さん、`,
      '',
      `「${params.orderTitle}」のステータスが「${params.statusLabel}」に更新されました。`,
      '',
      `詳細を確認: https://Cralia.com/orders/${params.orderId}`,
      '',
      '---',
      'Cralia サポートチーム',
    ].join('\n'),
    userId: params.recipientId,
    meta:   { orderId: params.orderId },
  }
}
