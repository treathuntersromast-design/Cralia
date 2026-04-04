import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/jobs/route'

// ── Supabase モック ───────────────────────────────────────
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'
const mockCreateClient = createClient as ReturnType<typeof vi.fn>

/**
 * Supabase クエリビルダーを模倣するヘルパー。
 * 全メソッドがチェーンを返し、await したときに resolved を返す（thenable）。
 */
function makeQueryBuilder(resolved: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb: Record<string, any> = {}
  for (const m of ['select', 'eq', 'contains', 'order', 'not', 'insert', 'update', 'delete', 'upsert']) {
    qb[m] = vi.fn().mockReturnValue(qb)
  }
  qb['limit']  = vi.fn().mockReturnValue(qb)  // thenable を維持するため self を返す
  qb['single'] = vi.fn().mockResolvedValue(resolved)
  // `await queryBuilder` で resolved を返す
  qb['then'] = (ok: (v: unknown) => unknown, ng?: (e: unknown) => unknown) =>
    Promise.resolve(resolved).then(ok, ng)
  return qb
}

/**
 * テーブルごとに異なる振る舞いを返す Supabase モック全体を組み立てる。
 */
function makeSupabase({
  user       = { id: 'user-1' } as { id: string } | null,
  userRoles  = ['client'],
  listingsResult = { data: [] as unknown, error: null as unknown },
  insertResult   = { data: { id: 'new-job-1' } as unknown, error: null as unknown },
} = {}) {
  const usersQb    = makeQueryBuilder({ data: { roles: userRoles }, error: null })
  const listingsQb = makeQueryBuilder(listingsResult)
  const insertQb   = makeQueryBuilder(insertResult)

  // insert 呼び出し時は insertQb へ切り替え
  listingsQb['insert'] = vi.fn().mockReturnValue(insertQb)

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn((table: string) => {
      if (table === 'users')        return usersQb
      if (table === 'job_listings') return listingsQb
      return makeQueryBuilder({ data: null, error: null })
    }),
    _listingsQb: listingsQb, // テスト内でスパイ確認用
    _usersQb:    usersQb,
  }
}

const makeGetReq  = (qs = '') => new NextRequest(`http://localhost/api/jobs${qs}`)
const makePostReq = (body: unknown) => new NextRequest('http://localhost/api/jobs', {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(body),
})

// ─────────────────────────────────────────────────────────
describe('GET /api/jobs', () => {

  // ── ハッピーケース ────────────────────────────────────
  it('[happy] 認証済みユーザーに公開案件一覧を返す', async () => {
    const listings = [
      { id: 'j1', title: '動画編集募集', creator_types: ['動画編集者'], order_type: 'paid' },
      { id: 'j2', title: 'イラスト依頼', creator_types: ['イラストレーター'], order_type: 'free' },
    ]
    mockCreateClient.mockReturnValue(makeSupabase({ listingsResult: { data: listings, error: null } }))

    const res  = await GET(makeGetReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.data[0].title).toBe('動画編集募集')
  })

  it('[happy] creator_type フィルターが contains で呼ばれる', async () => {
    const mock = makeSupabase()
    mockCreateClient.mockReturnValue(mock)

    await GET(makeGetReq('?creator_type=%E5%8B%95%E7%94%BB%E7%B7%A8%E9%9B%86%E8%80%85'))

    expect(mock._listingsQb.contains).toHaveBeenCalledWith('creator_types', ['動画編集者'])
  })

  it('[happy] order_type=paid フィルターが eq で呼ばれる', async () => {
    const mock = makeSupabase()
    mockCreateClient.mockReturnValue(mock)

    await GET(makeGetReq('?order_type=paid'))

    expect(mock._listingsQb.eq).toHaveBeenCalledWith('order_type', 'paid')
  })

  it('[happy] 案件が0件でも空配列で200を返す', async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ listingsResult: { data: [], error: null } }))
    const res = await GET(makeGetReq())
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual([])
  })

  // ── エッジケース ──────────────────────────────────────
  it('[edge] 未認証は 401 を返す', async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ user: null }))
    expect((await GET(makeGetReq())).status).toBe(401)
  })

  it('[edge] 不正な order_type は eq を呼ばずに全件返す', async () => {
    const mock = makeSupabase()
    mockCreateClient.mockReturnValue(mock)

    const res = await GET(makeGetReq('?order_type=invalid'))
    expect(res.status).toBe(200)
    // eq('order_type', ...) が呼ばれていないこと
    const calls = (mock._listingsQb.eq as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some(([col]: [string]) => col === 'order_type')).toBe(false)
  })

  it('[edge] DBエラー時は 500 を返す', async () => {
    mockCreateClient.mockReturnValue(
      makeSupabase({ listingsResult: { data: null, error: { message: 'DB down' } } })
    )
    expect((await GET(makeGetReq())).status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────
describe('POST /api/jobs', () => {

  const validBody = {
    title:        'テスト案件',
    description:  '詳細説明',
    creatorTypes: ['イラストレーター'],
    orderType:    'paid',
    budgetMin:    5000,
    budgetMax:    30000,
    deadline:     '2026-06-30',
  }

  // ── ハッピーケース ────────────────────────────────────
  it('[happy] 有効なリクエストで案件を作成し 201 を返す', async () => {
    mockCreateClient.mockReturnValue(
      makeSupabase({ insertResult: { data: { id: 'new-1' }, error: null } })
    )
    const res  = await POST(makePostReq(validBody))
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBe('new-1')
  })

  it('[happy] 無償案件（orderType=free）を作成できる', async () => {
    mockCreateClient.mockReturnValue(
      makeSupabase({ insertResult: { data: { id: 'new-2' }, error: null } })
    )
    const res = await POST(makePostReq({ ...validBody, orderType: 'free', budgetMin: null, budgetMax: null }))
    expect(res.status).toBe(201)
  })

  it('[happy] description・budget・deadline は省略可能', async () => {
    mockCreateClient.mockReturnValue(
      makeSupabase({ insertResult: { data: { id: 'new-3' }, error: null } })
    )
    const res = await POST(makePostReq({ title: '最小案件', creatorTypes: ['デザイナー'] }))
    expect(res.status).toBe(201)
  })

  // ── エッジケース ──────────────────────────────────────
  it('[edge] 未認証は 401', async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ user: null }))
    expect((await POST(makePostReq(validBody))).status).toBe(401)
  })

  it('[edge] client ロールがないユーザーは 403', async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ userRoles: ['creator'] }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toContain('依頼者として登録')
  })

  it('[edge] タイトルが空は 400', async () => {
    mockCreateClient.mockReturnValue(makeSupabase())
    const res = await POST(makePostReq({ ...validBody, title: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('タイトル')
  })

  it('[edge] タイトルが101文字は 400', async () => {
    mockCreateClient.mockReturnValue(makeSupabase())
    const res = await POST(makePostReq({ ...validBody, title: 'あ'.repeat(101) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('100文字')
  })

  it('[edge] 説明文が2001文字は 400', async () => {
    mockCreateClient.mockReturnValue(makeSupabase())
    const res = await POST(makePostReq({ ...validBody, description: 'a'.repeat(2001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('2000文字')
  })

  it('[edge] budgetMin > budgetMax は 400', async () => {
    mockCreateClient.mockReturnValue(makeSupabase())
    const res = await POST(makePostReq({ ...validBody, budgetMin: 50000, budgetMax: 10000 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('最小値')
  })

  it('[edge] 不正な JSON ボディは 400', async () => {
    mockCreateClient.mockReturnValue(makeSupabase())
    const req = new NextRequest('http://localhost/api/jobs', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    'not-json',
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('[edge] DB 書き込みエラーは 500', async () => {
    mockCreateClient.mockReturnValue(
      makeSupabase({ insertResult: { data: null, error: { message: 'write failed' } } })
    )
    expect((await POST(makePostReq(validBody))).status).toBe(500)
  })
})
