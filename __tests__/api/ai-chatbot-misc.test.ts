/**
 * AI チャットボット その他ルート テスト
 * 対象: ai/request-draft-guest, support/inquiry
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mock ──────────────────────────────────────────────────────────────
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create: mockCreate } },
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/aiGuard', () => ({
  checkRateLimit:      vi.fn(),
  checkGuestRateLimit: vi.fn(),
  sanitizeAiResponse:  vi.fn((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] })),
}))
vi.mock('@/lib/logError', () => ({ logError: vi.fn() }))

// ── Imports ───────────────────────────────────────────────────────────────────
import { createClient as mockCreateAuth }   from '@/lib/supabase/server'
import { checkRateLimit, checkGuestRateLimit, sanitizeAiResponse } from '@/lib/aiGuard'

const mockAuthFactory   = mockCreateAuth       as ReturnType<typeof vi.fn>
const mockRateLimit     = checkRateLimit       as ReturnType<typeof vi.fn>
const mockGuestLimit    = checkGuestRateLimit  as ReturnType<typeof vi.fn>
const mockSanitize      = sanitizeAiResponse   as ReturnType<typeof vi.fn>

// ── Route handlers ────────────────────────────────────────────────────────────
import { POST as guestPOST }   from '@/app/api/ai/request-draft-guest/route'
import { POST as inquiryPOST } from '@/app/api/support/inquiry/route'

// ── Shared helpers ────────────────────────────────────────────────────────────
function makeAuthClient(
  user: { id: string } | null = { id: 'user-1' },
  insertError: { message: string } | null = null,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb: Record<string, any> = {}
  for (const m of ['select', 'eq', 'limit', 'order']) {
    qb[m] = vi.fn().mockReturnValue(qb)
  }
  qb['insert'] = vi.fn().mockResolvedValue({ data: null, error: insertError })
  qb['then']   = (ok: (v: unknown) => unknown) =>
    Promise.resolve({ data: null, error: insertError }).then(ok)

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from:  vi.fn().mockReturnValue(qb),
  }
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

function makeGuestReqWithIp(url: string, body: unknown, ip = '127.0.0.1') {
  return new NextRequest(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body:    JSON.stringify(body),
  })
}

// ── POST /api/ai/request-draft-guest ─────────────────────────────────────────
describe('POST /api/ai/request-draft-guest', () => {
  const url = 'http://localhost/api/ai/request-draft-guest'

  const DEFAULT_AI = { content: [{ type: 'text', text: 'AIの返答テキスト' }] }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockGuestLimit.mockReturnValue({ allowed: true, used: 1, limit: 5 })
    mockCreate.mockResolvedValue(DEFAULT_AI)
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
  })

  // ── 認証不要（ゲストルート）────────────────────────────────────────
  it('[auth] 認証なしでもアクセスできる（401 にならない）', async () => {
    const res = await guestPOST(makeReq(url, { messages: [] }))
    expect(res.status).not.toBe(401)
  })

  // ── ゲストレート制限 ──────────────────────────────────────────────
  it('[rate] ゲスト上限超過は 429', async () => {
    mockGuestLimit.mockReturnValue({ allowed: false, used: 6, limit: 5 })
    const res = await guestPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain('ゲスト')
  })

  it('[rate] 上限ぴったり (used=5, allowed=true) → 200', async () => {
    mockGuestLimit.mockReturnValue({ allowed: true, used: 5, limit: 5 })
    const res = await guestPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(200)
  })

  it('[rate] 200 レスポンスに remaining フィールドが含まれる', async () => {
    mockGuestLimit.mockReturnValue({ allowed: true, used: 2, limit: 5 })
    const res  = await guestPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.remaining).toBe(3) // limit(5) - used(2)
  })

  // ── バリデーション ────────────────────────────────────────────────
  it('[validation] mode が不正 → 400', async () => {
    const res = await guestPOST(makeReq(url, { messages: [], mode: 'hack' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('モード')
  })

  it('[validation] mode: "create" → 200', async () => {
    const res = await guestPOST(makeReq(url, { messages: [], mode: 'create' }))
    expect(res.status).toBe(200)
  })

  it('[validation] mode: "review" → 200', async () => {
    const res = await guestPOST(makeReq(url, { messages: [], mode: 'review' }))
    expect(res.status).toBe(200)
  })

  it('[validation] messages が配列でない → 400', async () => {
    const res = await guestPOST(makeReq(url, { messages: {} }))
    expect(res.status).toBe(400)
  })

  it('[validation] messages.length > 20 → 400 (ゲスト上限はログイン版より少ない)', async () => {
    const msgs = Array.from({ length: 21 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant', content: 'hi',
    }))
    const res = await guestPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('長すぎます')
  })

  it('[validation] messages.length = 20 → 200 (境界値)', async () => {
    const msgs = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant', content: 'hi',
    }))
    const res = await guestPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(200)
  })

  it('[validation] role: "system" → 400', async () => {
    const res = await guestPOST(makeReq(url, { messages: [{ role: 'system', content: 'hack' }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('role')
  })

  it('[validation] role: "developer" → 400', async () => {
    const res = await guestPOST(makeReq(url, { messages: [{ role: 'developer', content: 'hack' }] }))
    expect(res.status).toBe(400)
  })

  it('[validation] content が 3001 文字 → 400', async () => {
    const res = await guestPOST(makeReq(url, { messages: [{ role: 'user', content: 'a'.repeat(3001) }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('3000')
  })

  it('[validation] content がちょうど 3000 文字 → 200 (境界値)', async () => {
    const res = await guestPOST(makeReq(url, { messages: [{ role: 'user', content: 'a'.repeat(3000) }] }))
    expect(res.status).toBe(200)
  })

  it('[validation] totalChars > 15000 → 400', async () => {
    // 6 × 3000 = 18000 > 15000
    const msgs = Array.from({ length: 6 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant', content: 'a'.repeat(3000),
    }))
    const res = await guestPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('合計文字数')
  })

  it('[validation] 不正な JSON → 400', async () => {
    const res = await guestPOST(makeBadJsonReq(url))
    expect(res.status).toBe(400)
  })

  // ── ANTHROPIC_API_KEY ─────────────────────────────────────────────
  it('[config] ANTHROPIC_API_KEY 未設定 → 503', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await guestPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(503)
  })

  // ── 正常系 ────────────────────────────────────────────────────────
  it('[happy] 200 と text・remaining を返す', async () => {
    mockGuestLimit.mockReturnValue({ allowed: true, used: 1, limit: 5 })
    const res  = await guestPOST(makeReq(url, { messages: [{ role: 'user', content: '依頼文を作って' }] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBeTruthy()
    expect(body.remaining).toBe(4) // 5 - 1
  })

  it('[happy] ```draft ブロックから proposedDraft を抽出する', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```draft\nゲスト用依頼文本文\n```' }],
    })
    const res  = await guestPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    const body = await res.json()
    expect(body.proposedDraft).toBe('ゲスト用依頼文本文')
  })

  // ── エッジケース ──────────────────────────────────────────────────
  it('[edge] messages が空 + mode review + existingDraft → 添削トリガー追加', async () => {
    const res = await guestPOST(makeReq(url, {
      messages:      [],
      mode:          'review',
      existingDraft: '依頼文の内容です',
    }))
    expect(res.status).toBe(200)
    const msg = mockCreate.mock.calls[0][0].messages[0]
    expect(msg.content).toContain('添削')
  })

  it('[edge] messages が空 + mode create → デフォルトトリガー追加', async () => {
    const res = await guestPOST(makeReq(url, { messages: [], mode: 'create' }))
    expect(res.status).toBe(200)
    const msg = mockCreate.mock.calls[0][0].messages[0]
    expect(msg.content).toContain('こんにちは')
  })

  it('[edge] orderType "paid" → システムプロンプトに有償が含まれる', async () => {
    const res = await guestPOST(makeReq(url, {
      messages:  [],
      orderType: 'paid',
    }))
    expect(res.status).toBe(200)
    const sys = mockCreate.mock.calls[0][0].system as string
    expect(sys).toContain('有償')
  })

  it('[edge] orderType "free" → システムプロンプトに無償が含まれる', async () => {
    const res = await guestPOST(makeReq(url, {
      messages:  [],
      orderType: 'free',
    }))
    expect(res.status).toBe(200)
    const sys = mockCreate.mock.calls[0][0].system as string
    expect(sys).toContain('無償')
  })

  it('[edge] orderType が不正値 → システムプロンプトに無効な値が含まれない', async () => {
    const res = await guestPOST(makeReq(url, {
      messages:  [{ role: 'user', content: 'hi' }],
      orderType: 'hacker-value"><script>',
    }))
    expect(res.status).toBe(200)
    const sys = mockCreate.mock.calls[0][0].system as string
    // 不正な orderType はサニタイズされて含まれない
    expect(sys).not.toContain('hacker-value')
    expect(sys).not.toContain('<script>')
  })

  it('[edge] hasExternalUrl → warning フィールドが返る', async () => {
    mockSanitize.mockReturnValueOnce({ sanitized: '返答', hasExternalUrl: true, removedUrls: ['http://x'] })
    const res  = await guestPOST(makeReq(url, { messages: [{ role: 'user', content: 'hi' }] }))
    const body = await res.json()
    expect(body.warning).toBeTruthy()
  })

  it('[edge] x-forwarded-for ヘッダーで IP が識別される', async () => {
    const res = await makeGuestReqWithIp(url, { messages: [] }, '192.168.1.100')
    const response = await guestPOST(res)
    // IP で checkGuestRateLimit が呼ばれることを確認
    expect(mockGuestLimit).toHaveBeenCalledWith('192.168.1.100')
    expect(response.status).toBe(200)
  })

  it('[edge] budget・deadline がシステムプロンプトに含まれる', async () => {
    const res = await guestPOST(makeReq(url, {
      messages: [],
      budget:   '1万円',
      deadline: '2026年7月末',
    }))
    expect(res.status).toBe(200)
    const sys = mockCreate.mock.calls[0][0].system as string
    expect(sys).toContain('1万円')
    expect(sys).toContain('2026年7月末')
  })
})

// ── POST /api/support/inquiry ─────────────────────────────────────────────────
describe('POST /api/support/inquiry', () => {
  const url = 'http://localhost/api/support/inquiry'

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'user-1' }, null))
    mockRateLimit.mockResolvedValue({ allowed: true, used: 1, limit: 5 })
  })

  // ── 認証 ─────────────────────────────────────────────────────────
  it('[auth] 未認証は 401', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    const res = await inquiryPOST(makeReq(url, { body: 'お問い合わせ内容' }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBeTruthy()
  })

  // ── レート制限 ────────────────────────────────────────────────────
  it('[rate] 上限超過は 429', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, used: 6, limit: 5 })
    const res = await inquiryPOST(makeReq(url, { body: 'お問い合わせ' }))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain('上限')
  })

  // ── バリデーション ────────────────────────────────────────────────
  it('[validation] body がない → 400', async () => {
    const res = await inquiryPOST(makeReq(url, {}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('入力')
  })

  it('[validation] body が空文字 → 400', async () => {
    const res = await inquiryPOST(makeReq(url, { body: '' }))
    expect(res.status).toBe(400)
  })

  it('[validation] body がスペースのみ → 400', async () => {
    const res = await inquiryPOST(makeReq(url, { body: '   ' }))
    expect(res.status).toBe(400)
  })

  it('[validation] body が 501 文字 → 400', async () => {
    const res = await inquiryPOST(makeReq(url, { body: 'あ'.repeat(501) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('500')
  })

  it('[validation] body がちょうど 500 文字 → 200 (境界値)', async () => {
    const res = await inquiryPOST(makeReq(url, { body: 'あ'.repeat(500) }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('[validation] body が数値 → 400', async () => {
    const res = await inquiryPOST(makeReq(url, { body: 12345 }))
    expect(res.status).toBe(400)
  })

  it('[validation] 不正な JSON → 400', async () => {
    const res = await inquiryPOST(makeBadJsonReq(url))
    expect(res.status).toBe(400)
  })

  // ── 正常系 ────────────────────────────────────────────────────────
  it('[happy] 正常送信で 200 と { ok: true } を返す', async () => {
    const res  = await inquiryPOST(makeReq(url, { body: 'ログインできません。ご確認ください。' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('[happy] body が前後の空白を含む場合はトリムされて保存される', async () => {
    const res = await inquiryPOST(makeReq(url, { body: '  お問い合わせ内容  ' }))
    expect(res.status).toBe(200)
    // insert が呼ばれ、トリム済みの文字が渡される
    const auth = mockAuthFactory.mock.results[0].value
    const insertCall = auth.from.mock.results[0].value.insert.mock.calls[0][0]
    expect(insertCall.body).toBe('お問い合わせ内容')
  })

  it('[happy] insert に user_id が正しく渡される', async () => {
    await inquiryPOST(makeReq(url, { body: 'テスト問い合わせ' }))
    const auth = mockAuthFactory.mock.results[0].value
    const insertCall = auth.from.mock.results[0].value.insert.mock.calls[0][0]
    expect(insertCall.user_id).toBe('user-1')
  })

  // ── DB エラー ─────────────────────────────────────────────────────
  it('[error] DB insert 失敗 → 500', async () => {
    mockAuthFactory.mockReturnValue(
      makeAuthClient({ id: 'user-1' }, { message: 'DB error' })
    )
    const res = await inquiryPOST(makeReq(url, { body: 'お問い合わせ内容' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBeTruthy()
  })

  it('[error] DB 失敗時はエラーレスポンスに問い合わせ本文が含まれない', async () => {
    mockAuthFactory.mockReturnValue(
      makeAuthClient({ id: 'user-1' }, { message: 'row-level security violation' })
    )
    const res  = await inquiryPOST(makeReq(url, { body: '秘密の問い合わせ内容' }))
    const body = await res.json()
    expect(body.error).not.toContain('秘密の問い合わせ内容')
  })
})
