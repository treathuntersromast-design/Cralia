import { Resend } from 'resend'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export type EmailType =
  | 'order_received'
  | 'order_accepted'
  | 'order_cancelled'
  | 'order_delivered'
  | 'order_completed'
  | 'message_received'
  | 'pitch_received'
  | 'pitch_replied'
  | 'review_posted'
  | 'admin_otp'

export interface EmailPayload {
  to:        string
  type:      EmailType
  subject:   string
  body:      string
  userId?:   string
  meta?:     Record<string, unknown>
}

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { to, type, subject, body, userId, meta } = payload

  let status = 'stub'

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const from = process.env.RESEND_FROM_EMAIL ?? 'Cralia <noreply@cralia.com>'
      await resend.emails.send({ from, to, subject, text: body })
      status = 'sent'
    } catch (err) {
      console.error('[sendEmail] Resend error:', err)
      status = 'error'
    }
  } else {
    console.info(`[sendEmail] stub: to=${to} type=${type} subject="${subject}"`)
  }

  try {
    const db = getDb()
    await db.from('email_logs').insert({
      recipient_email: to,
      type,
      subject,
      body,
      user_id: userId ?? null,
      meta:    meta   ?? null,
      status,
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
    subject: '【Cralia】依頼が届きました！',
    body:    [
      `${params.creatorName} さん、`,
      '',
      `${params.clientName} さんから「${params.orderTitle}」の依頼が届きました。`,
      '',
      'Cralia にログインして確認・返答をお願いします。',
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
    subject: '【Cralia】新しい通知がありました',
    body:    [
      `${params.recipientName} さん、`,
      '',
      `「${params.orderTitle}」のステータスが「${params.statusLabel}」に更新されました。`,
      '',
      'Cralia にログインして確認してください。',
      '',
      '---',
      'Cralia サポートチーム',
    ].join('\n'),
    userId: params.recipientId,
    meta:   { orderId: params.orderId },
  }
}

export function messageReceivedEmail(params: {
  recipientEmail: string
  recipientName:  string
  recipientId:    string
  senderName:     string
  orderTitle?:    string
  projectId:      string
}): EmailPayload {
  return {
    to:      params.recipientEmail,
    type:    'message_received',
    subject: '【Cralia】新しい通知がありました',
    body:    [
      `${params.recipientName} さん、`,
      '',
      `${params.senderName} さんからメッセージが届きました。${params.orderTitle ? `（依頼：「${params.orderTitle}」）` : ''}`,
      '',
      'Cralia にログインして確認してください。',
      '',
      '---',
      'Cralia サポートチーム',
    ].join('\n'),
    userId: params.recipientId,
    meta:   { projectId: params.projectId },
  }
}

export function pitchRepliedEmail(params: {
  recipientEmail: string
  recipientName:  string
  recipientId:    string
  clientName:     string
  pitchId:        string
}): EmailPayload {
  return {
    to:      params.recipientEmail,
    type:    'pitch_replied',
    subject: '【Cralia】新しい通知がありました',
    body:    [
      `${params.recipientName} さん、`,
      '',
      `${params.clientName} さんがあなたの営業メッセージに返信しました。`,
      '',
      'Cralia にログインして確認してください。',
      '',
      '---',
      'Cralia サポートチーム',
    ].join('\n'),
    userId: params.recipientId,
    meta:   { pitchId: params.pitchId },
  }
}

export function reviewPostedEmail(params: {
  recipientEmail: string
  recipientName:  string
  recipientId:    string
  reviewerName:   string
  orderId:        string
}): EmailPayload {
  return {
    to:      params.recipientEmail,
    type:    'review_posted',
    subject: '【Cralia】新しい通知がありました',
    body:    [
      `${params.recipientName} さん、`,
      '',
      `${params.reviewerName} さんが評価を投稿しました。`,
      '',
      'Cralia にログインして確認してください。',
      '',
      '---',
      'Cralia サポートチーム',
    ].join('\n'),
    userId: params.recipientId,
    meta:   { orderId: params.orderId },
  }
}

export function pitchReceivedEmail(params: {
  recipientEmail: string
  recipientName:  string
  recipientId:    string
  creatorName:    string
  pitchId:        string
}): EmailPayload {
  return {
    to:      params.recipientEmail,
    type:    'pitch_received',
    subject: '【Cralia】新しい通知がありました',
    body:    [
      `${params.recipientName} さん、`,
      '',
      `クリエイターの ${params.creatorName} さんから営業メッセージが届きました。`,
      '',
      'Cralia にログインして確認してください。',
      '',
      '---',
      'Cralia サポートチーム',
    ].join('\n'),
    userId: params.recipientId,
    meta:   { pitchId: params.pitchId },
  }
}
