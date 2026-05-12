/**
 * AI チャットボット 特殊系ルート テスト
 * 対象: ai/suggest-creators, ai/dashboard-chat
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mock ──────────────────────────────────────────────────────────────
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create: mockCreate } },
}))
vi.mock('@/lib/supabase/server',  () => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js',  () => ({ createClient: vi.fn() }))
vi.mock('@/lib/aiGuard', () => ({
  checkRateLimit:     vi.fn(),
  sanitizeAiResponse: vi.fn((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] })),
}))
vi.mock('@/lib/logError', () => ({ logError: vi.fn() }))

// ── Imports ───────────────────────────────────────────────────────────────────
import { createClient as mockCreateAuth }    from '@/lib/supabase/server'
import { createClient as mockCreateService } from '@supabase/supabase-js'
import { checkRateLimit, sanitizeAiResponse }  from '@/lib/aiGuard'

const mockAuthFactory    = mockCreateAuth    as ReturnType<typeof vi.fn>
const mockServiceFactory = mockCreateService as ReturnType<typeof vi.fn>
const mockRateLimit      = checkRateLimit    as ReturnType<typeof vi.fn>
const mockSanitize       = sanitizeAiResponse as ReturnType<typeof vi.fn>

// ── Route handlers ────────────────────────────────────────────────────────────
import { POST as suggestPOST }   from '@/app/api/ai/suggest-creators/route'
import { POST as dashboardPOST } from '@/app/api/ai/dashboard-chat/route'

// ── Shared helpers ────────────────────────────────────────────────────────────
function makeAuthClient(user: { id: string } | null = { id: 'user-1' }) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

function makeReq(url: string, body: unknown) {
  return new NextRequest(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

function makeBadJsonReq(url: string) {
  return new NextRequest(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    'bad-json{{{',
  })
}

// ── suggest-creators: service client helpers ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeQb(resolved: { data: unknown; error: unknown }): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb: Record<string, any> = {}
  for (const m of ['select', 'eq', 'gte', 'in', 'not', 'limit', 'order', 'neq']) {
    qb[m] = vi.fn().mockReturnValue(qb)
  }
  qb['single'] = vi.fn().mockResolvedValue(resolved)
  qb['then']   = (ok: (v: unknown) => unknown, ng?: (e: unknown) => unknown) =>
    Promise.resolve(resolved).then(ok, ng)
  return qb
}

function makeSuggestServiceClient(aiEnabled: boolean | null = true) {
  const qb = makeQb({ data: { ai_suggestion_enabled: aiEnabled }, error: null })
  return { from: vi.fn().mockReturnValue(qb) }
}

// ── dashboard-chat: service client helpers ────────────────────────────────────
interface DashboardContextOpts {
  activityStyleId?: number
  displayName?:     string
  receivedOrders?:  { deadline: string }[]
  sentOrders?:      { id: string }[]
  tasks?:           { due_date: string; status: string }[]
  portfolioCount?:  number
  creatorProfile?:  { bio?: string; creator_type?: string[]; skills?: string[] } | null
  completedOrders?: { id: string }[]
  events?:          { title: string; event_date: string }[]
  calTokens?:       { creator_id: string }[]
}

function makeDashboardServiceClient(opts: DashboardContextOpts = {}) {
  const {
    activityStyleId = 1,
    displayName     = 'テストユーザー',
    receivedOrders  = [],
    sentOrders      = [],
    tasks           = [],
    portfolioCount  = 0,
    creatorProfile  = null,
    completedOrders = [],
    events          = [],
    calTokens       = [],
  } = opts

  // projects テーブルは3回呼ばれる（受注・発注・完了）
  let projectsCall = 0
  const projectsByCall = [receivedOrders, sentOrders, completedOrders]

  return {
    from: vi.fn((table: string) => {
      if (table === 'creator_profiles') {
        // .single() で解決
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const qb: Record<string, any> = {}
        for (const m of ['select', 'eq', 'gte', 'in', 'not', 'limit', 'order', 'neq']) {
          qb[m] = vi.fn().mockReturnValue(qb)
        }
        qb['single'] = vi.fn().mockResolvedValue({ data: creatorProfile, error: null })
        qb['then']   = (ok: (v: unknown) => unknown) =>
          Promise.resolve({ data: creatorProfile, error: null }).then(ok)
        return qb
      }

      let data: unknown   = []
      let count: number | null = null

      if (table === 'users') {
        data = [{ activity_style_id: activityStyleId, display_name: displayName }]
      } else if (table === 'projects') {
        data = projectsByCall[projectsCall++] ?? []
      } else if (table === 'project_tasks') {
        data = tasks
      } else if (table === 'portfolios') {
        data  = []
        count = portfolioCount
      } else if (table === 'events') {
        data = events
      } else if (table === 'creator_tokens') {
        data = calTokens
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: Record<string, any> = {}
      for (const m of ['select', 'eq', 'gte', 'in', 'not', 'limit', 'order', 'neq']) {
        qb[m] = vi.fn().mockReturnValue(qb)
      }
      qb['single'] = vi.fn().mockResolvedValue({ data, error: null, count })
      qb['then']   = (ok: (v: unknown) => unknown) =>
        Promise.resolve({ data, error: null, count }).then(ok)
      return qb
    }),
  }
}

// ── POST /api/ai/suggest-creators ────────────────────────────────────────────
describe('POST /api/ai/suggest-creators', () => {
  const url = 'http://localhost/api/ai/suggest-creators'

  // 正常系レスポンス JSON（許可リスト内の値）
  const validAiJson = JSON.stringify({
    creatorTypes: ['イラストレーター'],
    skills:       ['イラスト制作', 'サムネイル制作'],
    reason:       'テスト理由です',
  })

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockAuthFactory.mockReturnValue(makeAuthClient())
    mockServiceFactory.mockReturnValue(makeSuggestServiceClient(true))
    mockRateLimit.mockResolvedValue({ allowed: true, used: 1, limit: 20 })
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: validAiJson }] })
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
  })

  // ── 認証 ─────────────────────────────────────────────────────────
  it('[auth] 未認証は 401', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    const res = await suggestPOST(makeReq(url, { title: 'テスト', description: '内容' }))
    expect(res.status).toBe(401)
  })

  // ── ai_suggestion_enabled チェック ────────────────────────────────
  it('[authz] ai_suggestion_enabled=false → 403', async () => {
    mockServiceFactory.mockReturnValue(makeSuggestServiceClient(false))
    const res = await suggestPOST(makeReq(url, { title: 'テスト', description: '内容' }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toContain('無効')
  })

  it('[authz] ai_suggestion_enabled=true → 403 にならない', async () => {
    mockServiceFactory.mockReturnValue(makeSuggestServiceClient(true))
    const res = await suggestPOST(makeReq(url, { title: 'テスト', description: '内容' }))
    expect(res.status).not.toBe(403)
  })

  it('[authz] ai_suggestion_enabled=null (未設定) → 403 にならない', async () => {
    // null の場合は === false にならないため許可
    mockServiceFactory.mockReturnValue(makeSuggestServiceClient(null))
    const res = await suggestPOST(makeReq(url, { title: 'テスト', description: '内容' }))
    expect(res.status).not.toBe(403)
  })

  // ── レート制限 ────────────────────────────────────────────────────
  it('[rate] 上限超過は 429', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, used: 21, limit: 20 })
    const res = await suggestPOST(makeReq(url, { title: 'テスト', description: '内容' }))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain('上限')
  })

  // ── バリデーション ────────────────────────────────────────────────
  it('[validation] title がない → 400', async () => {
    const res = await suggestPOST(makeReq(url, { description: '内容' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('タイトル')
  })

  it('[validation] title が空文字 → 400', async () => {
    const res = await suggestPOST(makeReq(url, { title: '   ', description: '内容' }))
    expect(res.status).toBe(400)
  })

  it('[validation] title が 201 文字 → 400', async () => {
    const res = await suggestPOST(makeReq(url, { title: 'a'.repeat(201), description: '内容' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('タイトル')
  })

  it('[validation] title がちょうど 200 文字 → 200 (境界値)', async () => {
    const res = await suggestPOST(makeReq(url, { title: 'a'.repeat(200), description: '内容' }))
    expect(res.status).toBe(200)
  })

  it('[validation] description がない → 400', async () => {
    const res = await suggestPOST(makeReq(url, { title: 'テスト' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('依頼内容')
  })

  it('[validation] description が空文字 → 400', async () => {
    const res = await suggestPOST(makeReq(url, { title: 'テスト', description: '' }))
    expect(res.status).toBe(400)
  })

  it('[validation] description が 3001 文字 → 400', async () => {
    const res = await suggestPOST(makeReq(url, { title: 'テスト', description: 'a'.repeat(3001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('依頼内容')
  })

  it('[validation] description がちょうど 3000 文字 → 200 (境界値)', async () => {
    const res = await suggestPOST(makeReq(url, { title: 'テスト', description: 'a'.repeat(3000) }))
    expect(res.status).toBe(200)
  })

  it('[validation] 不正な JSON → 400', async () => {
    const res = await suggestPOST(makeBadJsonReq(url))
    expect(res.status).toBe(400)
  })

  // ── ANTHROPIC_API_KEY ─────────────────────────────────────────────
  it('[config] ANTHROPIC_API_KEY 未設定 → 503', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await suggestPOST(makeReq(url, { title: 'テスト', description: '内容' }))
    expect(res.status).toBe(503)
  })

  // ── 正常系 ────────────────────────────────────────────────────────
  it('[happy] 200 と creatorTypes・skills・reason を返す', async () => {
    const res  = await suggestPOST(makeReq(url, { title: 'ロゴ制作依頼', description: 'サービスのロゴを作って欲しい' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.creatorTypes).toEqual(['イラストレーター'])
    expect(body.skills).toEqual(['イラスト制作', 'サムネイル制作'])
    expect(body.reason).toBe('テスト理由です')
  })

  // ── エッジケース ──────────────────────────────────────────────────
  it('[edge] AI が許可リスト外の creatorType を返した場合はフィルタされる', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({
        creatorTypes: ['イラストレーター', '存在しないタイプ', 'HACKER'],
        skills:       ['イラスト制作'],
        reason:       'テスト',
      }) }],
    })
    const res  = await suggestPOST(makeReq(url, { title: 'テスト', description: '内容' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.creatorTypes).toEqual(['イラストレーター'])
    expect(body.creatorTypes).not.toContain('存在しないタイプ')
    expect(body.creatorTypes).not.toContain('HACKER')
  })

  it('[edge] AI が許可リスト外のスキルを返した場合はフィルタされる', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({
        creatorTypes: ['イラストレーター'],
        skills:       ['イラスト制作', 'SQLインジェクション', 'XSSスキル'],
        reason:       'テスト',
      }) }],
    })
    const res  = await suggestPOST(makeReq(url, { title: 'テスト', description: '内容' }))
    const body = await res.json()
    expect(body.skills).toEqual(['イラスト制作'])
  })

  it('[edge] AI が 4 件以上の creatorType を返した場合は 3 件にスライス', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({
        creatorTypes: ['イラストレーター', 'VTuber', 'ボカロP', '動画編集者'],
        skills:       ['イラスト制作'],
        reason:       'テスト',
      }) }],
    })
    const res  = await suggestPOST(makeReq(url, { title: 'テスト', description: '内容' }))
    const body = await res.json()
    expect(body.creatorTypes).toHaveLength(3)
  })

  it('[edge] AI が JSON を返さない場合は空配列が返る', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'I cannot help with that request.' }],
    })
    const res  = await suggestPOST(makeReq(url, { title: 'テスト', description: '内容' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.creatorTypes).toEqual([])
    expect(body.skills).toEqual([])
  })

  it('[edge] title に特殊文字 → 200 (サニタイズ済み)', async () => {
    const res = await suggestPOST(makeReq(url, {
      title:       '<script>alert(1)</script>',
      description: '内容です',
    }))
    expect(res.status).toBe(200)
    // AI に送られたメッセージに <script> が含まれないこと
    const calledMsg = mockCreate.mock.calls[0][0].messages[0].content as string
    expect(calledMsg).not.toContain('<script>')
  })
})

// ── POST /api/ai/dashboard-chat ───────────────────────────────────────────────
describe('POST /api/ai/dashboard-chat', () => {
  const url = 'http://localhost/api/ai/dashboard-chat'

  const DEFAULT_DASHBOARD_AI = { content: [{ type: 'text', text: '今日やることは依頼の確認です。' }] }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY        = 'test-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    mockAuthFactory.mockReturnValue(makeAuthClient())
    mockServiceFactory.mockReturnValue(makeDashboardServiceClient())
    mockRateLimit.mockResolvedValue({ allowed: true, used: 1, limit: 20 })
    mockCreate.mockResolvedValue(DEFAULT_DASHBOARD_AI)
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
  })

  // ── 認証 ─────────────────────────────────────────────────────────
  it('[auth] 未認証は 401', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    const res = await dashboardPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(401)
  })

  // ── レート制限 ────────────────────────────────────────────────────
  it('[rate] 上限超過は 429', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, used: 21, limit: 20 })
    const res = await dashboardPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain('上限')
  })

  // ── バリデーション ────────────────────────────────────────────────
  it('[validation] messages が配列でない → 400', async () => {
    const res = await dashboardPOST(makeReq(url, { messages: 'string' }))
    expect(res.status).toBe(400)
  })

  it('[validation] messages が null → 400', async () => {
    const res = await dashboardPOST(makeReq(url, { messages: null }))
    expect(res.status).toBe(400)
  })

  it('[validation] messages.length > 30 → 400', async () => {
    const msgs = Array.from({ length: 31 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant', content: 'hi',
    }))
    const res = await dashboardPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('30')
  })

  it('[validation] messages.length = 30 → 200 (境界値)', async () => {
    const msgs = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant', content: 'hi',
    }))
    const res = await dashboardPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(200)
  })

  it('[validation] role: "system" → 400', async () => {
    const res = await dashboardPOST(makeReq(url, { messages: [{ role: 'system', content: 'hi' }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('role')
  })

  it('[validation] role: "tool" → 400', async () => {
    const res = await dashboardPOST(makeReq(url, { messages: [{ role: 'tool', content: 'hi' }] }))
    expect(res.status).toBe(400)
  })

  it('[validation] content が 501 文字 → 400', async () => {
    const res = await dashboardPOST(makeReq(url, {
      messages: [{ role: 'user', content: 'a'.repeat(501) }],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('500')
  })

  it('[validation] content がちょうど 500 文字 → 200 (境界値)', async () => {
    const res = await dashboardPOST(makeReq(url, {
      messages: [{ role: 'user', content: 'a'.repeat(500) }],
    }))
    expect(res.status).toBe(200)
  })

  it('[validation] content が文字列でない → 400', async () => {
    const res = await dashboardPOST(makeReq(url, {
      messages: [{ role: 'user', content: 123 }],
    }))
    expect(res.status).toBe(400)
  })

  it('[validation] totalChars > 5000 → 400', async () => {
    // 11 × 500 = 5500 > 5000
    const msgs = Array.from({ length: 11 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant', content: 'a'.repeat(500),
    }))
    const res = await dashboardPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('合計文字数')
  })

  it('[validation] 不正な JSON → 400', async () => {
    const res = await dashboardPOST(makeBadJsonReq(url))
    expect(res.status).toBe(400)
  })

  // ── ANTHROPIC_API_KEY ─────────────────────────────────────────────
  it('[config] ANTHROPIC_API_KEY 未設定 → 503', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await dashboardPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(503)
  })

  // ── 正常系 ────────────────────────────────────────────────────────
  it('[happy] 200 と sanitize 済み text を返す', async () => {
    const res  = await dashboardPOST(makeReq(url, { messages: [{ role: 'user', content: '今日やることは？' }] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBeTruthy()
  })

  it('[happy] クリエイターロール (activityStyleId=1) → context にクリエイター情報が含まれる', async () => {
    mockServiceFactory.mockReturnValue(makeDashboardServiceClient({
      activityStyleId: 1,
      displayName:     'テストクリエイター',
      creatorProfile:  { bio: '自己紹介', creator_type: ['イラストレーター'], skills: ['イラスト制作'] },
    }))
    const res = await dashboardPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(200)
    // context にクリエイター情報フラグが渡されること
    const systemPrompt = mockCreate.mock.calls[0][0].system as string
    expect(systemPrompt).toContain('クリエイター')
  })

  it('[happy] 依頼者ロール (activityStyleId=2) → context にロール"依頼者"が含まれる', async () => {
    mockServiceFactory.mockReturnValue(makeDashboardServiceClient({ activityStyleId: 2 }))
    const res = await dashboardPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(200)
    const systemPrompt = mockCreate.mock.calls[0][0].system as string
    expect(systemPrompt).toContain('依頼者')
  })

  // ── エッジケース: sanitizeChatResponse ───────────────────────────
  it('[edge] messages が空 → 初期メッセージ自動追加で 200', async () => {
    const res = await dashboardPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(200)
    const msg = mockCreate.mock.calls[0][0].messages[0]
    expect(msg.role).toBe('user')
    expect(msg.content).toContain('ダッシュボード')
  })

  it('[edge] AI レスポンスのコードブロックは sanitizeChatResponse で除去される', async () => {
    // sanitizeAiResponse は text をそのまま返すよう設定
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '以下をご確認ください。\n```python\nprint("hello")\n```\n以上です。' }],
    })
    const res  = await dashboardPOST(makeReq(url, { messages: [] }))
    const body = await res.json()
    expect(body.text).not.toContain('```python')
    expect(body.text).not.toContain('print(')
    expect(body.text).toContain('[コードは表示できません]')
  })

  it('[edge] AI レスポンスに SQL キーワードを含む行は除去される', async () => {
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'ご確認ください。\nSELECT * FROM users;\n以上です。' }],
    })
    const res  = await dashboardPOST(makeReq(url, { messages: [] }))
    const body = await res.json()
    expect(body.text).not.toContain('SELECT * FROM users')
    expect(body.text).toContain('[この行は表示できません]')
  })

  it('[edge] AI レスポンスが 300 文字を超えると 300 文字 + … に切り詰められる', async () => {
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
    const longText = 'あ'.repeat(400)
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: longText }] })
    const res  = await dashboardPOST(makeReq(url, { messages: [] }))
    const body = await res.json()
    expect(body.text.length).toBeLessThanOrEqual(301) // 300 + '…'
    expect(body.text.endsWith('…')).toBe(true)
  })

  it('[edge] AI レスポンスがちょうど 300 文字 → 切り詰めなし', async () => {
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
    const exactText = 'あ'.repeat(300)
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: exactText }] })
    const res  = await dashboardPOST(makeReq(url, { messages: [] }))
    const body = await res.json()
    expect(body.text).toBe(exactText)
    expect(body.text.endsWith('…')).toBe(false)
  })

  it('[edge] AI レスポンスのインラインコード (`code`) は除去される', async () => {
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'コマンドは `rm -rf` です。' }],
    })
    const res  = await dashboardPOST(makeReq(url, { messages: [] }))
    const body = await res.json()
    expect(body.text).not.toContain('`rm -rf`')
    expect(body.text).toContain('[コード]')
  })

  it('[edge] 受注中の依頼あり → context に納期が含まれる', async () => {
    mockServiceFactory.mockReturnValue(makeDashboardServiceClient({
      activityStyleId: 1,
      receivedOrders:  [{ deadline: '2026-06-01' }],
    }))
    const res = await dashboardPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(200)
    const sys = mockCreate.mock.calls[0][0].system as string
    expect(sys).toContain('2026-06-01')
  })

  it('[edge] displayName に注入文字が含まれても 200 (バッククォート・タグは除去)', async () => {
    mockServiceFactory.mockReturnValue(makeDashboardServiceClient({
      displayName: '```user```<b>name',
    }))
    const res = await dashboardPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(200)
    const sys = mockCreate.mock.calls[0][0].system as string
    // バッククォートと HTML タグが除去されていること
    expect(sys).not.toContain('```')
    expect(sys).not.toContain('<b>')
  })
})
