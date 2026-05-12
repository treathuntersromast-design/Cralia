/**
 * AI チャットボット 会話系ルート テスト
 * 対象: ai/bio, ai/pitch-draft, ai/request-draft, ai/creator-listing-draft
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
vi.mock('@/lib/aiGuard', () => ({
  checkRateLimit:     vi.fn(),
  sanitizeAiResponse: vi.fn((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] })),
}))
vi.mock('@/lib/logError', () => ({ logError: vi.fn() }))

// ── Imports ───────────────────────────────────────────────────────────────────
import { createClient as mockCreateAuth } from '@/lib/supabase/server'
import { checkRateLimit, sanitizeAiResponse } from '@/lib/aiGuard'

const mockAuthFactory = mockCreateAuth    as ReturnType<typeof vi.fn>
const mockRateLimit   = checkRateLimit    as ReturnType<typeof vi.fn>
const mockSanitize    = sanitizeAiResponse as ReturnType<typeof vi.fn>

// ── Route handlers ────────────────────────────────────────────────────────────
import { POST as bioPOST }     from '@/app/api/ai/bio/route'
import { POST as pitchPOST }   from '@/app/api/ai/pitch-draft/route'
import { POST as requestPOST } from '@/app/api/ai/request-draft/route'
import { POST as listingPOST } from '@/app/api/ai/creator-listing-draft/route'

// ── Shared helpers ────────────────────────────────────────────────────────────
function makeAuthClient(user: { id: string } | null = { id: 'user-1' }) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

const DEFAULT_AI = { content: [{ type: 'text', text: 'AIの返答テキスト' }] }

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
    body:    'not-json{{{',
  })
}

// 長すぎる messages でトータル文字数を超過させる
function makeLongMessages(count: number, charsEach: number) {
  return Array.from({ length: count }, (_, i) => ({
    role:    i % 2 === 0 ? 'user' : 'assistant',
    content: 'a'.repeat(charsEach),
  }))
}

// ── POST /api/ai/bio ──────────────────────────────────────────────────────────
describe('POST /api/ai/bio', () => {
  const url = 'http://localhost/api/ai/bio'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockAuthFactory.mockReturnValue(makeAuthClient())
    mockRateLimit.mockResolvedValue({ allowed: true, used: 1, limit: 30 })
    mockCreate.mockResolvedValue(DEFAULT_AI)
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
  })

  // ── 認証 ─────────────────────────────────────────────────────────
  it('[auth] 未認証は 401', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    const res = await bioPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBeTruthy()
  })

  // ── レート制限 ────────────────────────────────────────────────────
  it('[rate] 上限超過は 429 (error に "上限" を含む)', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, used: 31, limit: 30 })
    const res = await bioPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain('上限')
  })

  // ── バリデーション ────────────────────────────────────────────────
  it('[validation] messages が配列でない → 400', async () => {
    const res = await bioPOST(makeReq(url, { messages: 'not-array' }))
    expect(res.status).toBe(400)
  })

  it('[validation] messages.length > 40 → 400', async () => {
    const msgs = makeLongMessages(41, 1)
    const res  = await bioPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('長すぎます')
  })

  it('[validation] messages.length = 40 → 200 (境界値)', async () => {
    const msgs = makeLongMessages(40, 1)
    const res  = await bioPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(200)
  })

  it('[validation] role: "system" → 400', async () => {
    const res = await bioPOST(makeReq(url, { messages: [{ role: 'system', content: 'hack' }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('role')
  })

  it('[validation] role: "developer" → 400', async () => {
    const res = await bioPOST(makeReq(url, { messages: [{ role: 'developer', content: 'hack' }] }))
    expect(res.status).toBe(400)
  })

  it('[validation] content が 2001 文字 → 400', async () => {
    const res = await bioPOST(makeReq(url, { messages: [{ role: 'user', content: 'a'.repeat(2001) }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('2000')
  })

  it('[validation] content がちょうど 2000 文字 → 200 (境界値)', async () => {
    const res = await bioPOST(makeReq(url, { messages: [{ role: 'user', content: 'a'.repeat(2000) }] }))
    expect(res.status).toBe(200)
  })

  it('[validation] totalChars > 15000 → 400', async () => {
    // 8 × 2000 = 16000 > 15000
    const msgs = makeLongMessages(8, 2000)
    const res  = await bioPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('合計文字数')
  })

  it('[validation] 不正な JSON → 400', async () => {
    const res = await bioPOST(makeBadJsonReq(url))
    expect(res.status).toBe(400)
  })

  // ── ANTHROPIC_API_KEY ─────────────────────────────────────────────
  it('[config] ANTHROPIC_API_KEY 未設定 → 503', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await bioPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect(res.status).toBe(503)
  })

  // ── 正常系 ────────────────────────────────────────────────────────
  it('[happy] 200 と text を返す', async () => {
    const res  = await bioPOST(makeReq(url, { messages: [{ role: 'user', content: '自己紹介文を作って' }] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('AIの返答テキスト')
    expect(body.proposedBio).toBeNull()
  })

  it('[happy] ```bio ブロックから proposedBio を抽出する', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '以下が自己紹介文の案です。\n```bio\nイラストレーターの〇〇です。\n```' }],
    })
    const res  = await bioPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect(res.status).toBe(200)
    expect((await res.json()).proposedBio).toBe('イラストレーターの〇〇です。')
  })

  // ── エッジケース ──────────────────────────────────────────────────
  it('[edge] messages が空 → 初期メッセージ自動追加で 200', async () => {
    const res = await bioPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(200)
  })

  it('[edge] creatorTypes に注入文字が含まれても 200 (サニタイズ済み)', async () => {
    const res = await bioPOST(makeReq(url, {
      messages:     [{ role: 'user', content: 'hello' }],
      creatorTypes: ['イラストレーター<script>alert(1)</script>', '`DROP TABLE users`'],
    }))
    expect(res.status).toBe(200)
  })

  it('[edge] skills が配列でない → 無視して 200', async () => {
    const res = await bioPOST(makeReq(url, {
      messages: [{ role: 'user', content: 'hello' }],
      skills:   'not-array',
    }))
    expect(res.status).toBe(200)
  })
})

// ── POST /api/ai/pitch-draft ──────────────────────────────────────────────────
describe('POST /api/ai/pitch-draft', () => {
  const url = 'http://localhost/api/ai/pitch-draft'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockAuthFactory.mockReturnValue(makeAuthClient())
    mockRateLimit.mockResolvedValue({ allowed: true, used: 1, limit: 30 })
    mockCreate.mockResolvedValue(DEFAULT_AI)
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
  })

  it('[auth] 未認証は 401', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    const res = await pitchPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(401)
  })

  it('[rate] 上限超過は 429', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, used: 31, limit: 30 })
    const res = await pitchPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(429)
  })

  it('[validation] mode が不正 → 400', async () => {
    const res = await pitchPOST(makeReq(url, { messages: [], mode: 'batch' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('モード')
  })

  it('[validation] mode: "create" → 200', async () => {
    const res = await pitchPOST(makeReq(url, { messages: [], mode: 'create' }))
    expect(res.status).toBe(200)
  })

  it('[validation] mode: "review" → 200', async () => {
    const res = await pitchPOST(makeReq(url, { messages: [], mode: 'review' }))
    expect(res.status).toBe(200)
  })

  it('[validation] mode: undefined → 200 (省略可)', async () => {
    const res = await pitchPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect(res.status).toBe(200)
  })

  it('[validation] messages が配列でない → 400', async () => {
    const res = await pitchPOST(makeReq(url, { messages: null }))
    expect(res.status).toBe(400)
  })

  it('[validation] messages.length > 40 → 400', async () => {
    const msgs = makeLongMessages(41, 1)
    const res  = await pitchPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(400)
  })

  it('[validation] role: "system" → 400', async () => {
    const res = await pitchPOST(makeReq(url, { messages: [{ role: 'system', content: 'hi' }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('role')
  })

  it('[validation] content が 3001 文字 → 400', async () => {
    const res = await pitchPOST(makeReq(url, { messages: [{ role: 'user', content: 'a'.repeat(3001) }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('3000')
  })

  it('[validation] content がちょうど 3000 文字 → 200 (境界値)', async () => {
    const res = await pitchPOST(makeReq(url, { messages: [{ role: 'user', content: 'a'.repeat(3000) }] }))
    expect(res.status).toBe(200)
  })

  it('[validation] totalChars > 20000 → 400', async () => {
    // 7 × 3000 = 21000 > 20000
    const msgs = makeLongMessages(7, 3000)
    const res  = await pitchPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('合計文字数')
  })

  it('[validation] 不正な JSON → 400', async () => {
    const res = await pitchPOST(makeBadJsonReq(url))
    expect(res.status).toBe(400)
  })

  it('[happy] 200 と text を返す (draft なし)', async () => {
    const res  = await pitchPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBeTruthy()
    expect(body.proposedDraft).toBeNull()
  })

  it('[happy] ```pitch ブロックから proposedDraft を抽出する', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '修正版です。\n```pitch\n営業メッセージ本文\n```' }],
    })
    const res  = await pitchPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect(res.status).toBe(200)
    expect((await res.json()).proposedDraft).toBe('営業メッセージ本文')
  })

  it('[happy] hasExternalUrl → warning フィールドが返る', async () => {
    mockSanitize.mockReturnValueOnce({ sanitized: 'AIの返答', hasExternalUrl: true, removedUrls: ['http://x.com'] })
    const res  = await pitchPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect(res.status).toBe(200)
    expect((await res.json()).warning).toBeTruthy()
  })

  it('[edge] messages が空 + mode review + existingDraft → 200 (レビュートリガー追加)', async () => {
    const res = await pitchPOST(makeReq(url, {
      messages:      [],
      mode:          'review',
      existingDraft: 'こんにちは、お世話になります。',
    }))
    expect(res.status).toBe(200)
    // AI が呼ばれ、draft を含むメッセージが渡されること
    expect(mockCreate).toHaveBeenCalledOnce()
    const calledWith = mockCreate.mock.calls[0][0]
    expect(calledWith.messages[0].content).toContain('添削')
  })

  it('[edge] displayName に特殊文字 → 200 (サニタイズ済み)', async () => {
    const res = await pitchPOST(makeReq(url, {
      messages:    [{ role: 'user', content: 'hello' }],
      displayName: '<script>alert(1)</script>',
    }))
    expect(res.status).toBe(200)
  })

  it('[edge] existingDraft のバッククォートはサニタイズされる (200)', async () => {
    const res = await pitchPOST(makeReq(url, {
      messages:      [{ role: 'user', content: 'hello' }],
      mode:          'review',
      existingDraft: 'テスト`rm -rf /`テスト',
    }))
    expect(res.status).toBe(200)
    // バッククォートがシングルクォートに変換されてシステムプロンプトに埋め込まれる
    const calledWith = mockCreate.mock.calls[0][0]
    expect(calledWith.system).not.toContain('`rm -rf /`')
  })
})

// ── POST /api/ai/request-draft ────────────────────────────────────────────────
describe('POST /api/ai/request-draft', () => {
  const url = 'http://localhost/api/ai/request-draft'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockAuthFactory.mockReturnValue(makeAuthClient())
    mockRateLimit.mockResolvedValue({ allowed: true, used: 1, limit: 30 })
    mockCreate.mockResolvedValue(DEFAULT_AI)
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
  })

  it('[auth] 未認証は 401', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    const res = await requestPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(401)
  })

  it('[rate] 上限超過は 429', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, used: 31, limit: 30 })
    const res = await requestPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(429)
  })

  it('[validation] mode が不正 → 400', async () => {
    const res = await requestPOST(makeReq(url, { messages: [], mode: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('[validation] role: "tool" → 400', async () => {
    const res = await requestPOST(makeReq(url, { messages: [{ role: 'tool', content: 'hi' }] }))
    expect(res.status).toBe(400)
  })

  it('[validation] content が 3001 文字 → 400', async () => {
    const res = await requestPOST(makeReq(url, { messages: [{ role: 'user', content: 'a'.repeat(3001) }] }))
    expect(res.status).toBe(400)
  })

  it('[validation] totalChars > 20000 → 400', async () => {
    const msgs = makeLongMessages(7, 3000)
    const res  = await requestPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(400)
  })

  it('[validation] 不正な JSON → 400', async () => {
    const res = await requestPOST(makeBadJsonReq(url))
    expect(res.status).toBe(400)
  })

  it('[happy] 200 と text を返す (draft なし)', async () => {
    const res = await requestPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect(res.status).toBe(200)
    expect((await res.json()).proposedDraft).toBeNull()
  })

  it('[happy] ```draft ブロックから proposedDraft を抽出する', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```draft\n依頼文の本文です\n```' }],
    })
    const res = await requestPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect(res.status).toBe(200)
    expect((await res.json()).proposedDraft).toBe('依頼文の本文です')
  })

  it('[edge] messages が空 + mode create → 200 (初期メッセージ自動追加)', async () => {
    const res = await requestPOST(makeReq(url, { messages: [], mode: 'create' }))
    expect(res.status).toBe(200)
  })

  it('[edge] review mode + existingDraft → AI に添削トリガー送信', async () => {
    const res = await requestPOST(makeReq(url, {
      messages:      [],
      mode:          'review',
      existingDraft: 'ロゴデザインをお願いしたい',
    }))
    expect(res.status).toBe(200)
    const msg = mockCreate.mock.calls[0][0].messages[0]
    expect(msg.content).toContain('添削')
  })

  it('[edge] messages が空 + mode review だが existingDraft なし → デフォルトトリガー', async () => {
    const res = await requestPOST(makeReq(url, { messages: [], mode: 'review' }))
    expect(res.status).toBe(200)
    const msg = mockCreate.mock.calls[0][0].messages[0]
    expect(msg.content).toContain('こんにちは')
  })

  it('[edge] hasExternalUrl → warning フィールドが返る', async () => {
    mockSanitize.mockReturnValueOnce({ sanitized: '返答', hasExternalUrl: true, removedUrls: ['http://x'] })
    const res = await requestPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect((await res.json()).warning).toBeTruthy()
  })
})

// ── POST /api/ai/creator-listing-draft ────────────────────────────────────────
describe('POST /api/ai/creator-listing-draft', () => {
  const url = 'http://localhost/api/ai/creator-listing-draft'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockAuthFactory.mockReturnValue(makeAuthClient())
    mockRateLimit.mockResolvedValue({ allowed: true, used: 1, limit: 30 })
    mockCreate.mockResolvedValue(DEFAULT_AI)
    mockSanitize.mockImplementation((t: string) => ({ sanitized: t, hasExternalUrl: false, removedUrls: [] }))
  })

  it('[auth] 未認証は 401', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    const res = await listingPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(401)
  })

  it('[rate] 上限超過は 429', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, used: 31, limit: 30 })
    const res = await listingPOST(makeReq(url, { messages: [] }))
    expect(res.status).toBe(429)
  })

  it('[validation] mode が不正 → 400', async () => {
    const res = await listingPOST(makeReq(url, { messages: [], mode: 'auto' }))
    expect(res.status).toBe(400)
  })

  it('[validation] role: "system" → 400', async () => {
    const res = await listingPOST(makeReq(url, { messages: [{ role: 'system', content: 'hi' }] }))
    expect(res.status).toBe(400)
  })

  it('[validation] content が 3001 文字 → 400', async () => {
    const res = await listingPOST(makeReq(url, { messages: [{ role: 'user', content: 'a'.repeat(3001) }] }))
    expect(res.status).toBe(400)
  })

  it('[validation] totalChars > 20000 → 400', async () => {
    const msgs = makeLongMessages(7, 3000)
    const res  = await listingPOST(makeReq(url, { messages: msgs }))
    expect(res.status).toBe(400)
  })

  it('[validation] 不正な JSON → 400', async () => {
    const res = await listingPOST(makeBadJsonReq(url))
    expect(res.status).toBe(400)
  })

  it('[happy] 200 と text を返す', async () => {
    const res = await listingPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect(res.status).toBe(200)
    expect((await res.json()).text).toBeTruthy()
  })

  it('[happy] ```listing ブロックから proposedDraft を抽出する', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```listing\n仕事募集文の内容\n```' }],
    })
    const res = await listingPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect(res.status).toBe(200)
    expect((await res.json()).proposedDraft).toBe('仕事募集文の内容')
  })

  it('[edge] messages が空 + mode create → 200', async () => {
    const res = await listingPOST(makeReq(url, { messages: [], mode: 'create' }))
    expect(res.status).toBe(200)
  })

  it('[edge] review mode + existingDraft → 添削トリガー', async () => {
    const res = await listingPOST(makeReq(url, {
      messages:      [],
      mode:          'review',
      existingDraft: 'イラスト制作できます。',
    }))
    expect(res.status).toBe(200)
    expect(mockCreate.mock.calls[0][0].messages[0].content).toContain('添削')
  })

  it('[edge] displayName が 61 文字でも 200 (60 文字にトリム)', async () => {
    const res = await listingPOST(makeReq(url, {
      messages:    [{ role: 'user', content: 'hello' }],
      displayName: 'あ'.repeat(61),
    }))
    expect(res.status).toBe(200)
    // システムプロンプトに 61 文字の displayName が含まれない
    const sys = mockCreate.mock.calls[0][0].system as string
    expect(sys).not.toContain('あ'.repeat(61))
  })

  it('[edge] hasExternalUrl → warning が返る', async () => {
    mockSanitize.mockReturnValueOnce({ sanitized: '返答', hasExternalUrl: true, removedUrls: ['http://x'] })
    const res = await listingPOST(makeReq(url, { messages: [{ role: 'user', content: 'hello' }] }))
    expect((await res.json()).warning).toBeTruthy()
  })
})
