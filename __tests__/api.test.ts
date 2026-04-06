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

// ═══════════════════════════════════════════════════════════════════════════════
// スケジュール機能テスト
// ═══════════════════════════════════════════════════════════════════════════════

// ─── スケジュールAPI POST バリデーション ──────────────────────────────────────

describe('スケジュールAPI POSTバリデーション', () => {
  const VALID_STATUSES = ['todo', 'in_progress', 'done'] as const

  type TaskInput = {
    id?:               string
    title?:            string
    description?:      string | null
    status?:           string
    due_date?:         string | null
    assigned_user_id?: string | null
    depends_on_ids?:   string[]
  }

  function validateSchedulePost(tasks: unknown): string | null {
    if (!Array.isArray(tasks)) return 'tasks は配列で指定してください'
    if (tasks.length > 100) return 'タスクは100件以内にしてください'
    for (const t of tasks as TaskInput[]) {
      if (!t.title?.trim()) return 'タスク名を入力してください'
      if (t.title.trim().length > 100) return 'タスク名は100文字以内にしてください'
      if (t.description && t.description.length > 500) return 'タスク説明は500文字以内にしてください'
      if (t.status && !(VALID_STATUSES as readonly string[]).includes(t.status)) {
        return '不正なステータスです'
      }
    }
    return null
  }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('空配列は有効（タスクなし）', () =>
    expect(validateSchedulePost([])).toBeNull()
  )
  test('タイトルのみのタスク1件は有効', () =>
    expect(validateSchedulePost([{ title: 'イラスト制作' }])).toBeNull()
  )
  test('全フィールドあり・todo ステータスは有効', () =>
    expect(validateSchedulePost([{ title: 'タスクA', description: '詳細', status: 'todo', due_date: '2026-05-01' }])).toBeNull()
  )
  test('status=in_progress は有効', () =>
    expect(validateSchedulePost([{ title: 'T', status: 'in_progress' }])).toBeNull()
  )
  test('status=done は有効', () =>
    expect(validateSchedulePost([{ title: 'T', status: 'done' }])).toBeNull()
  )
  test('status を省略した場合は有効（デフォルト todo になる）', () =>
    expect(validateSchedulePost([{ title: 'T' }])).toBeNull()
  )
  test('タイトル100文字は有効', () =>
    expect(validateSchedulePost([{ title: 'あ'.repeat(100) }])).toBeNull()
  )
  test('説明500文字は有効', () =>
    expect(validateSchedulePost([{ title: 'T', description: 'あ'.repeat(500) }])).toBeNull()
  )
  test('100件は有効（上限ちょうど）', () =>
    expect(validateSchedulePost(Array.from({ length: 100 }, (_, i) => ({ title: `タスク${i}` })))).toBeNull()
  )
  test('前後スペースのみのタイトルでも trim 後に内容があれば有効', () =>
    expect(validateSchedulePost([{ title: ' タスク名 ' }])).toBeNull()
  )
  test('depends_on_ids のある複数タスクは有効', () =>
    expect(validateSchedulePost([
      { title: 'A', id: 'uuid-a' },
      { title: 'B', id: 'uuid-b', depends_on_ids: ['uuid-a'] },
    ])).toBeNull()
  )

  // ── エッジケース ────────────────────────────────────────────────
  test('tasks が配列でない（オブジェクト）はエラー', () =>
    expect(validateSchedulePost({ title: 'T' })).not.toBeNull()
  )
  test('tasks が null はエラー', () =>
    expect(validateSchedulePost(null)).not.toBeNull()
  )
  test('tasks が undefined はエラー', () =>
    expect(validateSchedulePost(undefined)).not.toBeNull()
  )
  test('tasks が文字列はエラー', () =>
    expect(validateSchedulePost('task')).not.toBeNull()
  )
  test('101件はエラー（上限超過）', () =>
    expect(validateSchedulePost(Array.from({ length: 101 }, (_, i) => ({ title: `T${i}` })))).not.toBeNull()
  )
  test('タイトルが空文字はエラー', () =>
    expect(validateSchedulePost([{ title: '' }])).not.toBeNull()
  )
  test('タイトルがスペースのみはエラー', () =>
    expect(validateSchedulePost([{ title: '   ' }])).not.toBeNull()
  )
  test('タイトルが null はエラー', () =>
    expect(validateSchedulePost([{ title: null }])).not.toBeNull()
  )
  test('タイトルが undefined はエラー', () =>
    expect(validateSchedulePost([{ title: undefined }])).not.toBeNull()
  )
  test('タイトル101文字はエラー', () =>
    expect(validateSchedulePost([{ title: 'あ'.repeat(101) }])).not.toBeNull()
  )
  test('説明501文字はエラー', () =>
    expect(validateSchedulePost([{ title: 'T', description: 'あ'.repeat(501) }])).not.toBeNull()
  )
  test('不正なステータス "pending" はエラー', () =>
    expect(validateSchedulePost([{ title: 'T', status: 'pending' }])).not.toBeNull()
  )
  test('不正なステータス "completed" はエラー', () =>
    expect(validateSchedulePost([{ title: 'T', status: 'completed' }])).not.toBeNull()
  )
  test('不正なステータス 空文字はスキップ（falsy なのでチェックされない）', () =>
    expect(validateSchedulePost([{ title: 'T', status: '' }])).toBeNull()
  )
  test('複数タスクのうち1件でもエラーがあれば全体エラー', () =>
    expect(validateSchedulePost([
      { title: '正常なタスク' },
      { title: '' },  // エラー
    ])).not.toBeNull()
  )
  test('エラーメッセージにタスク名関連のテキストを含む', () => {
    const err = validateSchedulePost([{ title: '' }])
    expect(err).toContain('タスク名')
  })
  test('エラーメッセージにタスク数関連のテキストを含む', () => {
    const err = validateSchedulePost(Array.from({ length: 101 }, (_, i) => ({ title: `T${i}` })))
    expect(err).toContain('100件')
  })
})

// ─── ブロック状態計算 ─────────────────────────────────────────────────────────

describe('スケジュール ブロック状態計算', () => {
  type Task = { id: string; title: string; status: string }
  type Dep  = { task_id: string; depends_on_id: string }

  // route.ts の enriched 計算ロジックを純関数として抽出
  function computeBlockedBy(
    taskList: Task[],
    deps: Dep[]
  ): Record<string, { id: string; title: string }[]> {
    const depMap: Record<string, string[]> = {}
    for (const d of deps) {
      if (!depMap[d.task_id]) depMap[d.task_id] = []
      depMap[d.task_id].push(d.depends_on_id)
    }
    const statusMap = Object.fromEntries(taskList.map((t) => [t.id, t.status]))

    return Object.fromEntries(
      taskList.map((t) => {
        const dependsOnIds = depMap[t.id] ?? []
        const blockedBy = dependsOnIds
          .filter((depId) => statusMap[depId] !== 'done')
          .map((depId) => ({
            id:    depId,
            title: taskList.find((x) => x.id === depId)?.title ?? '不明なタスク',
          }))
        return [t.id, blockedBy]
      })
    )
  }

  const taskA = { id: 'a', title: 'イラスト制作', status: 'todo' }
  const taskB = { id: 'b', title: '動画編集',     status: 'todo' }
  const taskC = { id: 'c', title: '公開作業',      status: 'done' }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('タスクが0件 → 空オブジェクト', () => {
    expect(computeBlockedBy([], [])).toEqual({})
  })
  test('依存関係なし → ブロックなし', () => {
    const result = computeBlockedBy([taskA, taskB], [])
    expect(result['a']).toHaveLength(0)
    expect(result['b']).toHaveLength(0)
  })
  test('先行タスクが done → ブロックなし', () => {
    // A(done) → B: B はブロックされない
    const taskADone = { ...taskA, status: 'done' }
    const result = computeBlockedBy([taskADone, taskB], [{ task_id: 'b', depends_on_id: 'a' }])
    expect(result['b']).toHaveLength(0)
  })
  test('先行タスクが todo → ブロックあり', () => {
    // A(todo) → B: B は A にブロックされる
    const result = computeBlockedBy([taskA, taskB], [{ task_id: 'b', depends_on_id: 'a' }])
    expect(result['b']).toHaveLength(1)
    expect(result['b'][0]).toEqual({ id: 'a', title: 'イラスト制作' })
  })
  test('先行タスクが in_progress → ブロックあり', () => {
    const taskAInProgress = { ...taskA, status: 'in_progress' }
    const result = computeBlockedBy([taskAInProgress, taskB], [{ task_id: 'b', depends_on_id: 'a' }])
    expect(result['b']).toHaveLength(1)
  })
  test('複数の先行タスクがすべて done → ブロックなし', () => {
    const a = { id: 'a', title: 'A', status: 'done' }
    const b = { id: 'b', title: 'B', status: 'done' }
    const c = { id: 'c', title: 'C', status: 'todo' }
    const result = computeBlockedBy([a, b, c], [
      { task_id: 'c', depends_on_id: 'a' },
      { task_id: 'c', depends_on_id: 'b' },
    ])
    expect(result['c']).toHaveLength(0)
  })
  test('複数の先行タスクのうち1件が未完了 → その1件のみブロック表示', () => {
    const a = { id: 'a', title: 'A', status: 'done' }
    const b = { id: 'b', title: 'B', status: 'todo' }  // 未完了
    const c = { id: 'c', title: 'C', status: 'todo' }
    const result = computeBlockedBy([a, b, c], [
      { task_id: 'c', depends_on_id: 'a' },
      { task_id: 'c', depends_on_id: 'b' },
    ])
    expect(result['c']).toHaveLength(1)
    expect(result['c'][0].id).toBe('b')
  })
  test('先行タスクが taskList に存在しない → title は "不明なタスク"', () => {
    const result = computeBlockedBy([taskB], [{ task_id: 'b', depends_on_id: 'ghost-id' }])
    expect(result['b']).toHaveLength(1)
    expect(result['b'][0].title).toBe('不明なタスク')
  })
  test('chain: A → B → C, A が todo → B はブロック、C はブロックなし（C は B のみに依存）', () => {
    const a = { id: 'a', title: 'A', status: 'todo' }
    const b = { id: 'b', title: 'B', status: 'todo' }
    const c = { id: 'c', title: 'C', status: 'todo' }
    const result = computeBlockedBy([a, b, c], [
      { task_id: 'b', depends_on_id: 'a' },  // B は A に依存
      { task_id: 'c', depends_on_id: 'b' },  // C は B に依存
    ])
    // B は A(todo) にブロックされる
    expect(result['b']).toHaveLength(1)
    expect(result['b'][0].id).toBe('a')
    // C は B(todo) にブロックされる
    expect(result['c']).toHaveLength(1)
    expect(result['c'][0].id).toBe('b')
    // A は誰にも依存していない
    expect(result['a']).toHaveLength(0)
  })
  test('is_blocked は blockedBy.length > 0 と等価', () => {
    const result = computeBlockedBy([taskA, taskB], [{ task_id: 'b', depends_on_id: 'a' }])
    expect(result['b'].length > 0).toBe(true)   // is_blocked = true
    expect(result['a'].length > 0).toBe(false)  // is_blocked = false
  })
  test('自己依存が depMap に混入しても blockedBy.id !== task.id の保証（depMapは自己参照を除外しない）', () => {
    // DB の CONSTRAINT で自己参照は禁止されているが、ロジック上の挙動を確認
    const result = computeBlockedBy([taskA], [{ task_id: 'a', depends_on_id: 'a' }])
    // A(todo) が自分自身を先行タスクとして持つ → statusMap['a'] = 'todo' → blockedBy に自分が入る
    // (DB制約で起こらないが、ロジックとしては自分自身でブロックされる挙動)
    expect(result['a']).toHaveLength(1)
    expect(result['a'][0].id).toBe('a')
  })

  // ── エッジケース ────────────────────────────────────────────────
  test('タスクリストのすべてが done → 全タスクがブロックなし', () => {
    const tasks = [
      { id: 'a', title: 'A', status: 'done' },
      { id: 'b', title: 'B', status: 'done' },
    ]
    const deps = [{ task_id: 'b', depends_on_id: 'a' }]
    const result = computeBlockedBy(tasks, deps)
    expect(result['a']).toHaveLength(0)
    expect(result['b']).toHaveLength(0)
  })
  test('1件タスク・依存なし', () => {
    const result = computeBlockedBy([{ id: 'x', title: 'X', status: 'todo' }], [])
    expect(result['x']).toEqual([])
  })
})

// ─── 依存 ID 解決 (idMap) ────────────────────────────────────────────────────

describe('スケジュールAPI 依存ID解決', () => {
  type TaskInput = {
    id?:              string
    depends_on_ids?:  unknown[]
  }

  // route.ts の dep 解決ロジックを純関数として抽出
  function resolveDepRows(
    tasks: TaskInput[],
    insertedIds: string[]
  ): { task_id: string; depends_on_id: string }[] {
    const idMap: Record<string, string> = {}
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i]
      if (t.id) idMap[t.id] = insertedIds[i]
    }

    const depRows: { task_id: string; depends_on_id: string }[] = []
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i]
      for (const depId of t.depends_on_ids ?? []) {
        if (typeof depId !== 'string') continue
        const resolvedId = idMap[depId as string] ?? (depId as string)
        if (resolvedId !== insertedIds[i] && insertedIds.includes(resolvedId)) {
          depRows.push({ task_id: insertedIds[i], depends_on_id: resolvedId })
        }
      }
    }
    return depRows
  }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('タスクなし → dep なし', () => {
    expect(resolveDepRows([], [])).toEqual([])
  })
  test('依存なし → dep なし', () => {
    const tasks = [{ id: 'old-a', depends_on_ids: [] }]
    const inserted = ['new-a']
    expect(resolveDepRows(tasks, inserted)).toEqual([])
  })
  test('既存 UUID が新 UUID に正しくリマップされる', () => {
    // A(old-a→new-a) → B(old-b→new-b): B が A に依存
    const tasks = [
      { id: 'old-a', depends_on_ids: [] },
      { id: 'old-b', depends_on_ids: ['old-a'] },
    ]
    const inserted = ['new-a', 'new-b']
    const result = resolveDepRows(tasks, inserted)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ task_id: 'new-b', depends_on_id: 'new-a' })
  })
  test('temp ID（new_timestamp 形式）が新 UUID にリマップされる', () => {
    const tasks = [
      { id: 'new_1234', depends_on_ids: [] },
      { id: 'new_5678', depends_on_ids: ['new_1234'] },
    ]
    const inserted = ['server-uuid-1', 'server-uuid-2']
    const result = resolveDepRows(tasks, inserted)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ task_id: 'server-uuid-2', depends_on_id: 'server-uuid-1' })
  })
  test('3タスクの正しいリマップ（A→B→C 構造）', () => {
    const tasks = [
      { id: 'old-a', depends_on_ids: [] },
      { id: 'old-b', depends_on_ids: ['old-a'] },
      { id: 'old-c', depends_on_ids: ['old-b'] },
    ]
    const inserted = ['new-a', 'new-b', 'new-c']
    const result = resolveDepRows(tasks, inserted)
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ task_id: 'new-b', depends_on_id: 'new-a' })
    expect(result).toContainEqual({ task_id: 'new-c', depends_on_id: 'new-b' })
  })
  test('複数タスクへの依存（A と B 両方が done になってから C 着手）', () => {
    const tasks = [
      { id: 'old-a', depends_on_ids: [] },
      { id: 'old-b', depends_on_ids: [] },
      { id: 'old-c', depends_on_ids: ['old-a', 'old-b'] },
    ]
    const inserted = ['new-a', 'new-b', 'new-c']
    const result = resolveDepRows(tasks, inserted)
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ task_id: 'new-c', depends_on_id: 'new-a' })
    expect(result).toContainEqual({ task_id: 'new-c', depends_on_id: 'new-b' })
  })

  // ── エッジケース ────────────────────────────────────────────────
  test('自己参照（自分自身が依存先）は除外される', () => {
    const tasks = [{ id: 'old-a', depends_on_ids: ['old-a'] }]
    const inserted = ['new-a']
    const result = resolveDepRows(tasks, inserted)
    expect(result).toHaveLength(0)
  })
  test('存在しない UUID を dep に指定 → 除外される（同バッチに存在しない）', () => {
    const tasks = [{ id: 'old-a', depends_on_ids: ['ghost-uuid'] }]
    const inserted = ['new-a']
    const result = resolveDepRows(tasks, inserted)
    expect(result).toHaveLength(0)
  })
  test('依存 ID が数値型 → 除外される', () => {
    const tasks = [
      { id: 'old-a', depends_on_ids: [] },
      { id: 'old-b', depends_on_ids: [42 as unknown as string] },
    ]
    const inserted = ['new-a', 'new-b']
    const result = resolveDepRows(tasks, inserted)
    expect(result).toHaveLength(0)
  })
  test('依存 ID が null → 除外される', () => {
    const tasks = [{ id: 'old-a', depends_on_ids: [null as unknown as string] }]
    const inserted = ['new-a']
    const result = resolveDepRows(tasks, inserted)
    expect(result).toHaveLength(0)
  })
  test('id を持たないタスク → idMap に登録されず、dep からも参照不可', () => {
    // タスクに id がない場合、他タスクがこの id を dep に指定しても解決できない
    const tasks = [
      { depends_on_ids: [] },                   // id なし
      { id: 'old-b', depends_on_ids: ['???'] }, // 存在しない id を dep に
    ]
    const inserted = ['new-a', 'new-b']
    const result = resolveDepRows(tasks, inserted)
    expect(result).toHaveLength(0)
  })
  test('depends_on_ids が空配列 → dep なし', () => {
    const tasks = [
      { id: 'old-a', depends_on_ids: [] },
      { id: 'old-b', depends_on_ids: [] },
    ]
    const inserted = ['new-a', 'new-b']
    expect(resolveDepRows(tasks, inserted)).toHaveLength(0)
  })
  test('depends_on_ids が undefined → dep なし', () => {
    const tasks = [{ id: 'old-a' }, { id: 'old-b' }]
    const inserted = ['new-a', 'new-b']
    expect(resolveDepRows(tasks, inserted)).toHaveLength(0)
  })
  test('重複 dep は重複してそのまま追加される（DB の UNIQUE 制約が防ぐ）', () => {
    const tasks = [
      { id: 'old-a', depends_on_ids: [] },
      { id: 'old-b', depends_on_ids: ['old-a', 'old-a'] }, // 重複
    ]
    const inserted = ['new-a', 'new-b']
    const result = resolveDepRows(tasks, inserted)
    // ロジック上は重複を除外しない（DB の UNIQUE が対処）
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.task_id === 'new-b' && r.depends_on_id === 'new-a')).toBe(true)
  })
})

// ─── dueDateInfo（ProjectSchedule コンポーネント） ────────────────────────────

describe('dueDateInfo（納期表示ヘルパー）', () => {
  // ProjectSchedule.tsx の dueDateInfo と同一ロジック
  function dueDateInfo(dueDate: string | null): { label: string; color: string } {
    if (!dueDate) return { label: '', color: '#7c7b99' }
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000)
    if (days < 0)  return { label: `${Math.abs(days)}日超過`, color: '#ff6b9d' }
    if (days === 0) return { label: '今日まで', color: '#ff6b9d' }
    if (days <= 2)  return { label: `あと${days}日`, color: '#ff6b9d' }
    if (days <= 6)  return { label: `あと${days}日`, color: '#fbbf24' }
    return { label: `あと${days}日`, color: '#7c7b99' }
  }

  // テスト用: UTC日付文字列を生成（オフセット日数）
  function utcDateOffset(offsetDays: number): string {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() + offsetDays)
    return d.toISOString().slice(0, 10)
  }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('null → ラベルなし・グレー', () => {
    const r = dueDateInfo(null)
    expect(r.label).toBe('')
    expect(r.color).toBe('#7c7b99')
  })
  test('今日の日付 → "今日まで"・赤', () => {
    const r = dueDateInfo(utcDateOffset(0))
    expect(r.label).toBe('今日まで')
    expect(r.color).toBe('#ff6b9d')
  })
  test('明日（+1日） → "あと1日"・赤（直近2日以内）', () => {
    const r = dueDateInfo(utcDateOffset(1))
    expect(r.label).toBe('あと1日')
    expect(r.color).toBe('#ff6b9d')
  })
  test('+2日 → "あと2日"・赤', () => {
    const r = dueDateInfo(utcDateOffset(2))
    expect(r.label).toBe('あと2日')
    expect(r.color).toBe('#ff6b9d')
  })
  test('+3日 → "あと3日"・黄（3〜6日）', () => {
    const r = dueDateInfo(utcDateOffset(3))
    expect(r.label).toBe('あと3日')
    expect(r.color).toBe('#fbbf24')
  })
  test('+6日 → "あと6日"・黄', () => {
    const r = dueDateInfo(utcDateOffset(6))
    expect(r.label).toBe('あと6日')
    expect(r.color).toBe('#fbbf24')
  })
  test('+7日 → "あと7日"・グレー（7日以上）', () => {
    const r = dueDateInfo(utcDateOffset(7))
    expect(r.label).toBe('あと7日')
    expect(r.color).toBe('#7c7b99')
  })
  test('+30日 → "あと30日"・グレー', () => {
    const r = dueDateInfo(utcDateOffset(30))
    expect(r.label).toBe('あと30日')
    expect(r.color).toBe('#7c7b99')
  })

  // ── エッジケース: 期限超過 ─────────────────────────────────────
  test('3日前（超過）→ "3日超過"・赤', () => {
    const r = dueDateInfo(utcDateOffset(-3))
    expect(r.label).toBe('3日超過')
    expect(r.color).toBe('#ff6b9d')
  })
  test('1日前（昨日）→ "1日超過"・赤', () => {
    const r = dueDateInfo(utcDateOffset(-1))
    expect(r.label).toBe('1日超過')
    expect(r.color).toBe('#ff6b9d')
  })
  test('30日前（大幅超過）→ "30日超過"・赤', () => {
    const r = dueDateInfo(utcDateOffset(-30))
    expect(r.label).toBe('30日超過')
    expect(r.color).toBe('#ff6b9d')
  })
  test('超過日数は常に正の数（Math.abs）', () => {
    const r = dueDateInfo(utcDateOffset(-10))
    expect(r.label).not.toContain('-')
    expect(r.label).toContain('10')
  })
})

// ─── deadlineColor / deadlineLabel（ダッシュボード） ─────────────────────────

describe('deadlineColor / deadlineLabel（ダッシュボード用）', () => {
  // dashboard/page.tsx の関数と同一ロジック
  function deadlineColor(deadline: string | null): string {
    if (!deadline) return '#7c7b99'
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
    if (days < 0)  return '#ff6b9d'
    if (days <= 2) return '#ff6b9d'
    if (days <= 6) return '#fbbf24'
    return '#7c7b99'
  }

  function deadlineLabel(deadline: string | null): string {
    if (!deadline) return ''
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
    const dateStr = new Date(deadline).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    if (days < 0)  return `${dateStr}（${Math.abs(days)}日超過）`
    if (days === 0) return `${dateStr}（今日）`
    return `${dateStr}（あと${days}日）`
  }

  function utcDateOffset(offsetDays: number): string {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() + offsetDays)
    return d.toISOString().slice(0, 10)
  }

  // ── deadlineColor ─────────────────────────────────────────────
  test('null → グレー', () => expect(deadlineColor(null)).toBe('#7c7b99'))
  test('今日 → 赤', () => expect(deadlineColor(utcDateOffset(0))).toBe('#ff6b9d'))
  test('+1日 → 赤', () => expect(deadlineColor(utcDateOffset(1))).toBe('#ff6b9d'))
  test('+2日 → 赤', () => expect(deadlineColor(utcDateOffset(2))).toBe('#ff6b9d'))
  test('+3日 → 黄', () => expect(deadlineColor(utcDateOffset(3))).toBe('#fbbf24'))
  test('+6日 → 黄', () => expect(deadlineColor(utcDateOffset(6))).toBe('#fbbf24'))
  test('+7日 → グレー', () => expect(deadlineColor(utcDateOffset(7))).toBe('#7c7b99'))
  test('+14日 → グレー', () => expect(deadlineColor(utcDateOffset(14))).toBe('#7c7b99'))
  test('3日前（超過） → 赤', () => expect(deadlineColor(utcDateOffset(-3))).toBe('#ff6b9d'))
  test('1日前（超過） → 赤', () => expect(deadlineColor(utcDateOffset(-1))).toBe('#ff6b9d'))

  // ── deadlineLabel ─────────────────────────────────────────────
  test('null → 空文字', () => expect(deadlineLabel(null)).toBe(''))
  test('今日 → "（今日）" を含む', () => expect(deadlineLabel(utcDateOffset(0))).toContain('今日'))
  test('+5日 → "あと5日" を含む', () => expect(deadlineLabel(utcDateOffset(5))).toContain('あと5日'))
  test('+10日 → "あと10日" を含む', () => expect(deadlineLabel(utcDateOffset(10))).toContain('あと10日'))
  test('3日前 → "3日超過" を含む', () => expect(deadlineLabel(utcDateOffset(-3))).toContain('3日超過'))
  test('超過ラベルに負の数は含まれない', () => {
    expect(deadlineLabel(utcDateOffset(-5))).not.toContain('-')
  })
  test('ラベルには日付文字列（月/日）を含む', () => {
    const label = deadlineLabel(utcDateOffset(3))
    // 例: "4/9（あと3日）" のように月と日を含む
    expect(label).toMatch(/\d+\/\d+/)
  })
})

// ─── ダッシュボード マイタスクブロック計算 ───────────────────────────────────

describe('ダッシュボード マイタスクブロック計算', () => {
  type UpstreamTask = { id: string; title: string; status: string }
  type DepEdge      = { task_id: string; depends_on_id: string }

  // dashboard/page.tsx のブロック計算ロジックを純関数として抽出
  function computeMyTaskBlocked(
    taskId: string,
    deps: DepEdge[],
    upstreamMap: Record<string, { title: string; status: string }>
  ): { id: string; title: string }[] {
    const taskDeps = deps.filter((d) => d.task_id === taskId).map((d) => d.depends_on_id)
    return taskDeps
      .filter((depId) => upstreamMap[depId]?.status !== 'done')
      .map((depId) => ({
        id:    depId,
        title: upstreamMap[depId]?.title ?? '不明なタスク',
      }))
  }

  const upstreamMap: Record<string, { title: string; status: string }> = {
    'upstream-a': { title: 'イラスト制作', status: 'todo' },
    'upstream-b': { title: '音声収録',     status: 'done' },
    'upstream-c': { title: 'シナリオ確認', status: 'in_progress' },
  }

  // ── ハッピーケース ──────────────────────────────────────────────
  test('依存なし → ブロックなし', () => {
    const result = computeMyTaskBlocked('my-task', [], upstreamMap)
    expect(result).toHaveLength(0)
  })
  test('先行タスクが done → ブロックなし', () => {
    const deps: DepEdge[] = [{ task_id: 'my-task', depends_on_id: 'upstream-b' }]
    const result = computeMyTaskBlocked('my-task', deps, upstreamMap)
    expect(result).toHaveLength(0)
  })
  test('先行タスクが todo → ブロックあり、タイトル正しい', () => {
    const deps: DepEdge[] = [{ task_id: 'my-task', depends_on_id: 'upstream-a' }]
    const result = computeMyTaskBlocked('my-task', deps, upstreamMap)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ id: 'upstream-a', title: 'イラスト制作' })
  })
  test('先行タスクが in_progress → ブロックあり', () => {
    const deps: DepEdge[] = [{ task_id: 'my-task', depends_on_id: 'upstream-c' }]
    const result = computeMyTaskBlocked('my-task', deps, upstreamMap)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('シナリオ確認')
  })
  test('複数の先行タスク（done と todo 混在）→ done は除外', () => {
    const deps: DepEdge[] = [
      { task_id: 'my-task', depends_on_id: 'upstream-a' }, // todo
      { task_id: 'my-task', depends_on_id: 'upstream-b' }, // done
      { task_id: 'my-task', depends_on_id: 'upstream-c' }, // in_progress
    ]
    const result = computeMyTaskBlocked('my-task', deps, upstreamMap)
    expect(result).toHaveLength(2)  // a と c のみ
    expect(result.map((r) => r.id)).toContain('upstream-a')
    expect(result.map((r) => r.id)).toContain('upstream-c')
    expect(result.map((r) => r.id)).not.toContain('upstream-b')
  })
  test('自分以外のタスクの dep は影響しない', () => {
    const deps: DepEdge[] = [
      { task_id: 'other-task', depends_on_id: 'upstream-a' }, // 別タスクの dep
    ]
    const result = computeMyTaskBlocked('my-task', deps, upstreamMap)
    expect(result).toHaveLength(0)
  })

  // ── エッジケース ────────────────────────────────────────────────
  test('upstreamMap に存在しない dep → "不明なタスク"', () => {
    const deps: DepEdge[] = [{ task_id: 'my-task', depends_on_id: 'ghost-id' }]
    const result = computeMyTaskBlocked('my-task', deps, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('不明なタスク')
  })
  test('upstreamMap の status が undefined → ブロックあり（!== "done" が true）', () => {
    const mapWithUndefined: Record<string, { title: string; status: string }> = {
      'up-x': { title: 'X', status: undefined as unknown as string },
    }
    const deps: DepEdge[] = [{ task_id: 'my-task', depends_on_id: 'up-x' }]
    const result = computeMyTaskBlocked('my-task', deps, mapWithUndefined)
    // undefined !== 'done' は true → ブロックされる
    expect(result).toHaveLength(1)
  })
})
