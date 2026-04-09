import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/orders/route'

// ── Supabase モック ───────────────────────────────────────
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

import { createClient as createAuthClientFactory } from '@/lib/supabase/server'
import { createClient as createServiceClientFactory } from '@supabase/supabase-js'

const mockAuthFactory    = createAuthClientFactory   as ReturnType<typeof vi.fn>
const mockServiceFactory = createServiceClientFactory as ReturnType<typeof vi.fn>

/**
 * Supabase クエリビルダーを模倣するヘルパー（thenable）。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeQueryBuilder(resolved: { data: unknown; error: unknown }): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb: Record<string, any> = {}
  for (const m of ['select', 'eq', 'contains', 'order', 'not', 'insert', 'update', 'delete', 'upsert', 'limit']) {
    qb[m] = vi.fn().mockReturnValue(qb)
  }
  qb['single'] = vi.fn().mockResolvedValue(resolved)
  qb['then']   = (ok: (v: unknown) => unknown, ng?: (e: unknown) => unknown) =>
    Promise.resolve(resolved).then(ok, ng)
  return qb
}

/**
 * 認証クライアントモック（auth.getUser のみ）
 */
function makeAuthClient(user: { id: string } | null = { id: 'client-1' }) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

/**
 * サービスクライアントモック。
 * from('users') の single() は呼ばれた順番で creatorResult → clientResult を返す。
 * from('projects') は projectsQb、from('notifications') は notificationsQb。
 */
function makeServiceClient({
  creatorResult = { data: { id: 'creator-1', display_name: 'テストクリエイター' }, error: null } as { data: unknown; error: unknown },
  clientResult  = { data: { display_name: 'テスト依頼者' }, error: null } as { data: unknown; error: unknown },
  insertResult  = { data: { id: 'project-new-1' }, error: null } as { data: unknown; error: unknown },
  insertError   = null as unknown,
} = {}) {
  const usersQb        = makeQueryBuilder({ data: null, error: null })
  const insertQb       = makeQueryBuilder(insertResult)
  const notificationsQb = makeQueryBuilder({ data: null, error: null })

  // insert チェーンだけ insertQb に切り替え
  const projectsQb       = makeQueryBuilder({ data: null, error: null })
  const insertProjectsQb = makeQueryBuilder(insertResult)
  insertProjectsQb['then'] = (ok: (v: unknown) => unknown, ng?: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: insertError }).then(ok, ng)
  insertProjectsQb['single'] = vi.fn().mockResolvedValue(
    insertError ? { data: null, error: insertError } : insertResult
  )
  projectsQb['insert'] = vi.fn().mockReturnValue(insertProjectsQb)

  // users: single() を呼び出した順に creatorResult → clientResult を返す
  usersQb['single'] = vi.fn()
    .mockResolvedValueOnce(creatorResult)
    .mockResolvedValueOnce(clientResult)

  return {
    from: vi.fn((table: string) => {
      if (table === 'users')         return usersQb
      if (table === 'projects')      return projectsQb
      if (table === 'notifications') return notificationsQb
      return makeQueryBuilder({ data: null, error: null })
    }),
    _usersQb:         usersQb,
    _projectsQb:      projectsQb,
    _notificationsQb: notificationsQb,
    _insertQb:        insertQb,
  }
}

const makePostReq = (body: unknown) =>
  new NextRequest('http://localhost/api/orders', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

const validBody = {
  creatorId:   'creator-1',
  title:       'テスト依頼',
  description: '詳細な依頼内容です',
  budget:      10000,
  deadline:    '2026-12-31',
  orderType:   'paid',
}

// ─────────────────────────────────────────────────────────
describe('POST /api/orders', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトは認証済み（client-1）
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'client-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient())
  })

  // ── ハッピーケース ────────────────────────────────────
  it('[happy] 有効なリクエストで依頼を作成し 200 を返す', async () => {
    const res  = await POST(makePostReq(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('project-new-1')
  })

  it('[happy] 無償依頼（orderType=free）を作成できる', async () => {
    const res = await POST(makePostReq({ ...validBody, orderType: 'free' }))
    expect(res.status).toBe(200)
    expect((await res.json()).id).toBeDefined()
  })

  it('[happy] 予算・納期・orderType が省略可能', async () => {
    const res = await POST(makePostReq({
      creatorId:   'creator-1',
      title:       '最小依頼',
      description: '最小説明',
    }))
    expect(res.status).toBe(200)
  })

  it('[happy] 予算が 0 円でも有効', async () => {
    const res = await POST(makePostReq({ ...validBody, budget: 0 }))
    expect(res.status).toBe(200)
  })

  it('[happy] 予算が空文字のとき null 扱いになる（200 を返す）', async () => {
    const res = await POST(makePostReq({ ...validBody, budget: '' }))
    expect(res.status).toBe(200)
  })

  it('[happy] タイトルが100文字ちょうどで成功する', async () => {
    const res = await POST(makePostReq({ ...validBody, title: 'あ'.repeat(100) }))
    expect(res.status).toBe(200)
  })

  it('[happy] 説明文が2000文字ちょうどで成功する', async () => {
    const res = await POST(makePostReq({ ...validBody, description: 'a'.repeat(2000) }))
    expect(res.status).toBe(200)
  })

  // ── エッジケース：認証 ──────────────────────────────
  it('[edge] 未認証は 401', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    expect((await POST(makePostReq(validBody))).status).toBe(401)
  })

  // ── エッジケース：バリデーション ──────────────────────
  it('[edge] 不正な JSON ボディは 400', async () => {
    const req = new NextRequest('http://localhost/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    'not-json',
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('[edge] creatorId が欠落は 400', async () => {
    const { creatorId: _removed, ...rest } = validBody
    const res = await POST(makePostReq(rest))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('クリエイター')
  })

  it('[edge] creatorId が空文字は 400', async () => {
    const res = await POST(makePostReq({ ...validBody, creatorId: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('クリエイター')
  })

  it('[edge] タイトルが空は 400', async () => {
    const res = await POST(makePostReq({ ...validBody, title: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('タイトル')
  })

  it('[edge] タイトルが空白のみは 400', async () => {
    const res = await POST(makePostReq({ ...validBody, title: '   ' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('タイトル')
  })

  it('[edge] タイトルが101文字は 400', async () => {
    const res = await POST(makePostReq({ ...validBody, title: 'あ'.repeat(101) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('100文字')
  })

  it('[edge] 説明が欠落は 400', async () => {
    const { description: _removed, ...rest } = validBody
    const res = await POST(makePostReq(rest))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('依頼内容')
  })

  it('[edge] 説明が空は 400', async () => {
    const res = await POST(makePostReq({ ...validBody, description: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('依頼内容')
  })

  it('[edge] 説明が2001文字は 400', async () => {
    const res = await POST(makePostReq({ ...validBody, description: 'a'.repeat(2001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('2000文字')
  })

  it('[edge] 自分自身への依頼は 400', async () => {
    // client-1 が client-1 に依頼 → 自己依頼エラー
    const res = await POST(makePostReq({ ...validBody, creatorId: 'client-1' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('自分自身')
  })

  it('[edge] 負の予算は null 扱いになり 200 を返す（サイレント）', async () => {
    const res = await POST(makePostReq({ ...validBody, budget: -1 }))
    expect(res.status).toBe(200)
  })

  it('[edge] 数値でない予算（文字列）は null 扱いになり 200 を返す', async () => {
    const res = await POST(makePostReq({ ...validBody, budget: 'invalid' }))
    expect(res.status).toBe(200)
  })

  // ── エッジケース：DB ──────────────────────────────────
  it('[edge] クリエイターが存在しない場合は 404', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      creatorResult: { data: null, error: null },
    }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toContain('クリエイター')
  })

  it('[edge] DB 書き込みエラーは 500', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      insertError: { message: 'write failed', code: 'XXXXX' },
    }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(500)
  })
})
