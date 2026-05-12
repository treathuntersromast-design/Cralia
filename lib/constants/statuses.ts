// ============================================================
// ステータス定数・ラベルマップ
// orders（projects テーブル）・project_boards 共通
// ============================================================

// ── 依頼ステータス ────────────────────────────────────────────
export const ORDER_STATUS = {
  DRAFT:             'draft',
  PENDING:           'pending',
  ACCEPTED:          'accepted',
  IN_PROGRESS:       'in_progress',
  DELIVERED:         'delivered',
  COMPLETED:         'completed',
  CANCELLED:         'cancelled',
  DISPUTED:          'disputed',
  CANCEL_REQUESTED:  'cancel_requested',
} as const

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]

/** ステータス遷移ステップ（詳細画面のプログレスバー用） */
export const ORDER_STATUS_STEPS = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETED,
] as const

/** 表示ラベル・カラー（bg/border 付き完全版） */
export const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  [ORDER_STATUS.DRAFT]:       { label: '下書き',       color: '#a9a8c0', bg: 'rgba(169,168,192,0.12)', border: 'rgba(169,168,192,0.3)' },
  [ORDER_STATUS.PENDING]:     { label: '提案中',       color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
  [ORDER_STATUS.ACCEPTED]:    { label: '承認済み',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  [ORDER_STATUS.IN_PROGRESS]: { label: '進行中',       color: '#c77dff', bg: 'rgba(199,125,255,0.12)', border: 'rgba(199,125,255,0.3)' },
  [ORDER_STATUS.DELIVERED]:   { label: '納品済み',     color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)'  },
  [ORDER_STATUS.COMPLETED]:   { label: '完了',         color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)'  },
  [ORDER_STATUS.CANCELLED]:         { label: 'キャンセル',      color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)'  },
  [ORDER_STATUS.DISPUTED]:          { label: '異議申し立て',    color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)'  },
  [ORDER_STATUS.CANCEL_REQUESTED]:  { label: 'キャンセル申請中', color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)'   },
}

/** アクティブな依頼を除外するステータスリスト（Supabase .not() 用） */
export const INACTIVE_ORDER_STATUSES = `(${ORDER_STATUS.COMPLETED},${ORDER_STATUS.CANCELLED},${ORDER_STATUS.DISPUTED})`

/** キャンセル申請中ステータス判定 */
export function isCancelRequested(status: string): boolean {
  return status === ORDER_STATUS.CANCEL_REQUESTED
}

// ── プロジェクトボードステータス ─────────────────────────────
export const PROJECT_STATUS = {
  RECRUITING:  'recruiting',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  CANCELLED:   'cancelled',
} as const

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS]

export const PROJECT_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  [PROJECT_STATUS.RECRUITING]:  { label: 'メンバー募集中', color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  [PROJECT_STATUS.IN_PROGRESS]: { label: '進行中',         color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  [PROJECT_STATUS.COMPLETED]:   { label: '完了',           color: '#a9a8c0', bg: 'rgba(169,168,192,0.12)' },
  [PROJECT_STATUS.CANCELLED]:   { label: 'キャンセル',     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

// ── 決済ステータス ────────────────────────────────────────────
export const PAYMENT_STATUS = {
  PENDING:            'pending',
  HELD:               'held',
  PAYOUT_PENDING:     'payout_pending',
  PAYOUT_PAID:        'payout_paid',
  REFUNDED:           'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  EXPIRED:            'expired',
  REFUND_PENDING:     'refund_pending',
  PAYMENT_MISMATCH:   'payment_mismatch',
  DISPUTED:           'disputed',
  FAILED:             'failed',
} as const

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

export const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  [PAYMENT_STATUS.PENDING]:            { label: '決済待ち',         color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)' },
  [PAYMENT_STATUS.HELD]:               { label: 'お預かり中',       color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.25)'  },
  [PAYMENT_STATUS.PAYOUT_PENDING]:     { label: '支払確定済み',     color: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)' },
  [PAYMENT_STATUS.PAYOUT_PAID]:        { label: '振込済み',         color: '#4ade80', bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.25)'  },
  [PAYMENT_STATUS.REFUNDED]:           { label: '全額返金済み',     color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)' },
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: { label: '部分返金済み',     color: '#fb923c', bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.25)'  },
  [PAYMENT_STATUS.EXPIRED]:            { label: '期限切れ',         color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)' },
  [PAYMENT_STATUS.REFUND_PENDING]:     { label: '返金処理中',       color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.25)'  },
  [PAYMENT_STATUS.PAYMENT_MISMATCH]:   { label: '要確認',           color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)' },
  [PAYMENT_STATUS.DISPUTED]:           { label: '異議申し立て中',   color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)' },
  [PAYMENT_STATUS.FAILED]:             { label: '決済失敗',         color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)' },
}

/** 返金可能な状態か */
export function isRefundable(status: PaymentStatus): boolean {
  return status === PAYMENT_STATUS.HELD || status === PAYMENT_STATUS.PARTIALLY_REFUNDED
}

// ── タスクステータス ──────────────────────────────────────────
export const TASK_STATUS = {
  TODO:        'todo',
  IN_PROGRESS: 'in_progress',
  DONE:        'done',
} as const

export const TASK_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  [TASK_STATUS.TODO]:        { label: '未着手', color: '#a9a8c0', bg: 'rgba(169,168,192,0.12)' },
  [TASK_STATUS.IN_PROGRESS]: { label: '進行中', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  [TASK_STATUS.DONE]:        { label: '完了',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
}

// ── 通知タイプ ────────────────────────────────────────────────
export const NOTIFICATION_TYPE = {
  MESSAGE:        'message',
  PROJECT_INVITE: 'project_invite',
  ORDER_RECEIVED: 'order_received',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_DECLINED: 'order_declined',
  REVIEW:         'review',
  SYSTEM:         'system',
  PITCH_RECEIVED: 'pitch_received',
  PITCH_REPLIED:  'pitch_replied',
} as const

export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE]
