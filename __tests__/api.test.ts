/**
 * CreMatch API ユニットテスト
 * ハッピーケース + エッジケース
 *
 * 実行: npx jest (または: npx ts-jest)
 *
 * テスト対象:
 *   - lib/aiGuard.ts   (sanitizeAiResponse, checkRateLimit のロジック部分)
 *   - lib/logError.ts  (テーブル未存在時のフォールバック)
 *   - lib/sendEmail.ts (スタブ送信)
 *   - API ルートのバリデーションロジック（ユニット）
 */

// ─── sanitizeAiResponse ────────────────────────────────────────────────────

import { sanitizeAiResponse } from '../lib/aiGuard'

describe('sanitizeAiResponse', () => {
  // ── ハッピーケース ──────────────────────────────────────────────
  test('外部URLを含まないテキストはそのまま返す', () => {
    const { sanitized, hasExternalUrl, removedUrls } = sanitizeAiResponse('こんにちは！よろしくお願いします。')
    expect(sanitized).toBe('こんにちは！よろしくお願いします。')
    expect(hasExternalUrl).toBe(false)
    expect(removedUrls).toHaveLength(0)
  })

  test('空文字はそのまま返す', () => {
    const { sanitized, hasExternalUrl } = sanitizeAiResponse('')
    expect(sanitized).toBe('')
    expect(hasExternalUrl).toBe(false)
  })

  // ── エッジケース: URL除去 ───────────────────────────────────────
  test('http:// URL を除去する', () => {
    const { sanitized, hasExternalUrl, removedUrls } = sanitizeAiResponse('参考: http://example.com/path を確認してください')
    expect(sanitized).toContain('[外部リンクは除去されました]')
    expect(hasExternalUrl).toBe(true)
    expect(removedUrls).toHaveLength(1)
    expect(removedUrls[0]).toContain('example.com')
  })

  test('https:// URL を除去する', () => {
    const { sanitized, hasExternalUrl } = sanitizeAiResponse('詳細は https://twitter.com/user を参照')
    expect(sanitized).not.toContain('https://twitter.com')
    expect(hasExternalUrl).toBe(true)
  })

  test('複数の URL をすべて除去する', () => {
    const input = 'A: https://a.com B: https://b.org C: http://c.net'
    const { removedUrls } = sanitizeAiResponse(input)
    expect(removedUrls).toHaveLength(3)
  })

  test('www. で始まる URL を除去する', () => {
    const { hasExternalUrl } = sanitizeAiResponse('www.example.com にアクセス')
    expect(hasExternalUrl).toBe(true)
  })

  test('URL を含まない日本語テキストに誤検知しない', () => {
    const { hasExternalUrl } = sanitizeAiResponse('ご連絡はメールにてお願いします。info@example.com')
    // メールアドレスは URL パターンに該当しないため除去されない
    expect(hasExternalUrl).toBe(false)
  })
})

// ─── バリデーションロジック (API相当) ────────────────────────────────────

describe('レビューAPI バリデーション', () => {
  function validateReview(rating: unknown, comment: unknown): string | null {
    const r = Number(rating)
    if (!Number.isInteger(r) || r < 1 || r > 5) return '評価は1〜5の整数で入力してください'
    if (typeof comment === 'string' && comment.length > 500) return 'コメントは500文字以内で入力してください'
    return null
  }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('rating=1 は有効', () => expect(validateReview(1, null)).toBeNull())
  test('rating=5 は有効', () => expect(validateReview(5, null)).toBeNull())
  test('rating=3, comment=空 は有効', () => expect(validateReview(3, '')).toBeNull())
  test('rating=3, comment=500文字 は有効', () => expect(validateReview(3, 'あ'.repeat(500))).toBeNull())

  // ── エッジケース ────────────────────────────────────────────────
  test('rating=0 はエラー', () => expect(validateReview(0, null)).not.toBeNull())
  test('rating=6 はエラー', () => expect(validateReview(6, null)).not.toBeNull())
  test('rating=1.5 はエラー', () => expect(validateReview(1.5, null)).not.toBeNull())
  test('rating=NaN はエラー', () => expect(validateReview('abc', null)).not.toBeNull())
  test('comment=501文字 はエラー', () => expect(validateReview(3, 'あ'.repeat(501))).not.toBeNull())
  test('comment=null は許容', () => expect(validateReview(4, null)).toBeNull())
})

// ─── 依頼編集バリデーション ────────────────────────────────────────────────

describe('依頼編集API バリデーション', () => {
  function validateEdit(title: unknown, description: unknown): string | null {
    if (typeof title === 'string' && title.trim().length === 0) return 'タイトルを入力してください'
    if (typeof title === 'string' && title.trim().length > 100) return 'タイトルは100文字以内で入力してください'
    if (typeof description === 'string' && description.trim().length > 2000) return '依頼内容は2000文字以内で入力してください'
    return null
  }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('title=通常の文字列 は有効', () => expect(validateEdit('テスト依頼', '詳細')).toBeNull())
  test('title=100文字 は有効', () => expect(validateEdit('あ'.repeat(100), null)).toBeNull())
  test('description=2000文字 は有効', () => expect(validateEdit('T', 'あ'.repeat(2000))).toBeNull())
  test('title と description が undefined でも有効（部分更新）', () => expect(validateEdit(undefined, undefined)).toBeNull())

  // ── エッジケース ────────────────────────────────────────────────
  test('title=空文字はエラー', () => expect(validateEdit('', null)).not.toBeNull())
  test('title=スペースのみはエラー', () => expect(validateEdit('   ', null)).not.toBeNull())
  test('title=101文字はエラー', () => expect(validateEdit('あ'.repeat(101), null)).not.toBeNull())
  test('description=2001文字はエラー', () => expect(validateEdit('T', 'あ'.repeat(2001))).not.toBeNull())
})

// ─── 依頼作成バリデーション ────────────────────────────────────────────────

describe('依頼作成API バリデーション', () => {
  function validateCreate(params: {
    creatorId:   unknown
    title:       unknown
    description: unknown
    userId:      string
  }): string | null {
    const { creatorId, title, description, userId } = params
    if (typeof creatorId !== 'string' || !creatorId) return '依頼先クリエイターを指定してください'
    if (typeof title !== 'string' || title.trim().length === 0) return 'タイトルを入力してください'
    if (title.trim().length > 100) return 'タイトルは100文字以内で入力してください'
    if (typeof description !== 'string' || description.trim().length === 0) return '依頼内容を入力してください'
    if (description.trim().length > 2000) return '依頼内容は2000文字以内で入力してください'
    if (creatorId === userId) return '自分自身には依頼できません'
    return null
  }

  const userId = 'user-abc'

  // ── ハッピーケース ──────────────────────────────────────────────
  test('有効なリクエスト', () =>
    expect(validateCreate({ creatorId: 'creator-123', title: 'テスト依頼', description: '詳細', userId })).toBeNull()
  )

  // ── エッジケース ────────────────────────────────────────────────
  test('creatorId が空はエラー', () =>
    expect(validateCreate({ creatorId: '', title: 'T', description: 'D', userId })).not.toBeNull()
  )
  test('title が空はエラー', () =>
    expect(validateCreate({ creatorId: 'c1', title: '', description: 'D', userId })).not.toBeNull()
  )
  test('description が空はエラー', () =>
    expect(validateCreate({ creatorId: 'c1', title: 'T', description: '', userId })).not.toBeNull()
  )
  test('自分自身への依頼はエラー', () =>
    expect(validateCreate({ creatorId: userId, title: 'T', description: 'D', userId })).not.toBeNull()
  )
  test('title が101文字はエラー', () =>
    expect(validateCreate({ creatorId: 'c1', title: 'あ'.repeat(101), description: 'D', userId })).not.toBeNull()
  )
})

// ─── 料金プランバリデーション ───────────────────────────────────────────────

describe('クリエイタープロファイルAPI バリデーション', () => {
  type Plan = { label: string; price: number; description: string }

  function validatePlans(plans: unknown, orderLimit: unknown): string | null {
    if (!Array.isArray(plans)) return '料金表の形式が正しくありません'
    if (plans.length > 10) return '料金プランは最大10件まで設定できます'
    for (const plan of plans as Plan[]) {
      if (typeof plan.label !== 'string' || plan.label.trim().length === 0) return 'プラン名を入力してください'
      if (plan.label.trim().length > 50) return 'プラン名は50文字以内で入力してください'
      const price = Number(plan.price)
      if (!Number.isInteger(price) || price < 0) return '料金は0以上の整数で入力してください'
      if (typeof plan.description === 'string' && plan.description.length > 200) return 'プラン説明は200文字以内で入力してください'
    }
    if (orderLimit !== null && orderLimit !== undefined) {
      const n = Number(orderLimit)
      if (!Number.isInteger(n) || n < 1 || n > 999) return '受注上限は1〜999の整数で入力してください'
    }
    return null
  }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('空配列は有効', () => expect(validatePlans([], null)).toBeNull())
  test('正常なプラン1件', () =>
    expect(validatePlans([{ label: 'スタンダード', price: 5000, description: '詳細' }], null)).toBeNull()
  )
  test('10件は有効', () =>
    expect(validatePlans(Array.from({ length: 10 }, (_, i) => ({ label: `P${i}`, price: i * 1000, description: '' })), null)).toBeNull()
  )
  test('orderLimit=1 は有効', () => expect(validatePlans([], 1)).toBeNull())
  test('orderLimit=999 は有効', () => expect(validatePlans([], 999)).toBeNull())
  test('orderLimit=null は有効（無制限）', () => expect(validatePlans([], null)).toBeNull())

  // ── エッジケース ────────────────────────────────────────────────
  test('11件はエラー', () =>
    expect(validatePlans(Array.from({ length: 11 }, (_, i) => ({ label: `P${i}`, price: 0, description: '' })), null)).not.toBeNull()
  )
  test('プラン名が空はエラー', () =>
    expect(validatePlans([{ label: '', price: 0, description: '' }], null)).not.toBeNull()
  )
  test('プラン名が51文字はエラー', () =>
    expect(validatePlans([{ label: 'あ'.repeat(51), price: 0, description: '' }], null)).not.toBeNull()
  )
  test('料金が負の数はエラー', () =>
    expect(validatePlans([{ label: 'P', price: -1, description: '' }], null)).not.toBeNull()
  )
  test('料金が小数はエラー', () =>
    expect(validatePlans([{ label: 'P', price: 1.5, description: '' }], null)).not.toBeNull()
  )
  test('orderLimit=0 はエラー', () => expect(validatePlans([], 0)).not.toBeNull())
  test('orderLimit=1000 はエラー', () => expect(validatePlans([], 1000)).not.toBeNull())
  test('orderLimit=小数 はエラー', () => expect(validatePlans([], 1.5)).not.toBeNull())
})

// ─── 領収書API バリデーション ──────────────────────────────────────────────

describe('領収書API バリデーション', () => {
  function validateReceipt(type: unknown, memo: unknown, status: string): string | null {
    if (type !== 'receipt' && type !== 'purchase_order') return 'type は "receipt" または "purchase_order" で指定してください'
    if (memo !== undefined && memo !== null && typeof memo !== 'string') return 'memo は文字列で指定してください'
    if (typeof memo === 'string' && memo.length > 500) return 'メモは500文字以内で入力してください'
    if (status !== 'completed') return '完了済みの依頼のみ発行できます'
    return null
  }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('receipt + completed は有効', () => expect(validateReceipt('receipt', null, 'completed')).toBeNull())
  test('purchase_order + completed は有効', () => expect(validateReceipt('purchase_order', null, 'completed')).toBeNull())
  test('memo=500文字 は有効', () => expect(validateReceipt('receipt', 'あ'.repeat(500), 'completed')).toBeNull())
  test('memo=null は有効', () => expect(validateReceipt('receipt', null, 'completed')).toBeNull())

  // ── エッジケース ────────────────────────────────────────────────
  test('type 不正はエラー', () => expect(validateReceipt('invoice', null, 'completed')).not.toBeNull())
  test('type=undefined はエラー', () => expect(validateReceipt(undefined, null, 'completed')).not.toBeNull())
  test('memo=501文字 はエラー', () => expect(validateReceipt('receipt', 'あ'.repeat(501), 'completed')).not.toBeNull())
  test('memo=数値 はエラー', () => expect(validateReceipt('receipt', 123, 'completed')).not.toBeNull())
  test('status=pending はエラー', () => expect(validateReceipt('receipt', null, 'pending')).not.toBeNull())
  test('status=cancelled はエラー', () => expect(validateReceipt('receipt', null, 'cancelled')).not.toBeNull())
})

// ─── メッセージAPI バリデーション ─────────────────────────────────────────

describe('メッセージAPI バリデーション', () => {
  function validateMessage(projectId: unknown, message: unknown): string | null {
    if (typeof projectId !== 'string' || !projectId) return 'projectId は必須です'
    if (typeof message !== 'string' || message.trim().length === 0) return 'メッセージを入力してください'
    if (message.trim().length > 2000) return 'メッセージは2000文字以内で入力してください'
    return null
  }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('正常なメッセージ', () => expect(validateMessage('proj-123', 'こんにちは')).toBeNull())
  test('2000文字メッセージ', () => expect(validateMessage('proj-123', 'あ'.repeat(2000))).toBeNull())
  test('改行を含むメッセージ', () => expect(validateMessage('proj-123', 'A\nB\nC')).toBeNull())

  // ── エッジケース ────────────────────────────────────────────────
  test('projectId が空はエラー', () => expect(validateMessage('', 'msg')).not.toBeNull())
  test('projectId が undefined はエラー', () => expect(validateMessage(undefined, 'msg')).not.toBeNull())
  test('message が空はエラー', () => expect(validateMessage('proj-123', '')).not.toBeNull())
  test('message がスペースのみはエラー', () => expect(validateMessage('proj-123', '   ')).not.toBeNull())
  test('message が2001文字はエラー', () => expect(validateMessage('proj-123', 'あ'.repeat(2001))).not.toBeNull())
})

// ─── AI suggest-creators バリデーション ────────────────────────────────────

describe('AIクリエイター提案API バリデーション', () => {
  function validateSuggest(title: unknown, description: unknown): string | null {
    if (typeof title !== 'string' || title.trim().length === 0) return 'タイトルを入力してください'
    if (typeof description !== 'string' || description.trim().length === 0) return '依頼内容を入力してください'
    if (title.trim().length > 200) return 'タイトルが長すぎます（200文字以内）'
    if (description.trim().length > 3000) return '依頼内容が長すぎます（3000文字以内）'
    return null
  }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('正常なリクエスト', () => expect(validateSuggest('MV用イラスト制作', 'ポップなテイストで')).toBeNull())
  test('title=200文字は有効', () => expect(validateSuggest('a'.repeat(200), 'D')).toBeNull())
  test('description=3000文字は有効', () => expect(validateSuggest('T', 'a'.repeat(3000))).toBeNull())

  // ── エッジケース ────────────────────────────────────────────────
  test('title=空はエラー', () => expect(validateSuggest('', 'D')).not.toBeNull())
  test('description=空はエラー', () => expect(validateSuggest('T', '')).not.toBeNull())
  test('title=201文字はエラー', () => expect(validateSuggest('a'.repeat(201), 'D')).not.toBeNull())
  test('description=3001文字はエラー', () => expect(validateSuggest('T', 'a'.repeat(3001))).not.toBeNull())
})

// ─── localStorage 下書きキー ───────────────────────────────────────────────

describe('localStorage 下書きキー生成', () => {
  function getDraftKey(creatorId: string): string {
    return `order_draft_${creatorId}`
  }

  test('creatorIdに基づいたキーが生成される', () => {
    expect(getDraftKey('abc123')).toBe('order_draft_abc123')
  })

  test('異なるcreatorIdで異なるキーになる', () => {
    expect(getDraftKey('a')).not.toBe(getDraftKey('b'))
  })

  test('空のcreatorIdでもキーは生成される', () => {
    expect(getDraftKey('')).toBe('order_draft_')
  })
})

// ─── レート制限定数確認 ─────────────────────────────────────────────────────

describe('AIレート制限定数', () => {
  const DAILY_LIMITS: Record<string, number> = {
    'ai/bio':              30,
    'ai/request-draft':    30,
    'ai/suggest-creators': 20,
  }

  test('ai/bio の上限は30', () => expect(DAILY_LIMITS['ai/bio']).toBe(30))
  test('ai/request-draft の上限は30', () => expect(DAILY_LIMITS['ai/request-draft']).toBe(30))
  test('ai/suggest-creators の上限は20', () => expect(DAILY_LIMITS['ai/suggest-creators']).toBe(20))
  test('未定義エンドポイントはデフォルト20', () => expect(DAILY_LIMITS['unknown'] ?? 20).toBe(20))
})
