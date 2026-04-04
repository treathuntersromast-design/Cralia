import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/orders/[id]/status/route'

// ── Supabase モック ───────────────────────────────────────
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

import { createClient as createAuthClientFactory } from '@/lib/supabase/server'
import { createClient as createServiceClientFactory } from '@supabase/supabase-js'

const mockAuthFactory    = createAuthClientFactory    as ReturnType<typeof vi.fn>
const mockServiceFactory = createServiceClientFactory as ReturnType<typeof vi.fn>

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

function makeAuthClient(user: { id: string } | null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

/**
 * DB サービスクライアントモック。
 *
 * from('projects') の最初の呼び出し（select） → orderResult を返す。
 * from('projects') の update チェーン → updateError を返す。
 */
function makeServiceClient({
  order = {
    id: 'order-1', client_id: 'client-1', creator_id: 'creator-1',
    status: 'pending', title: 'テスト依頼',
  } as Record<string, unknown> | null,
  updateError = null as unknown,
} = {}) {
  const projectsSelectQb = makeQueryBuilder({ data: order, error: null })
  const projectsUpdateQb = makeQueryBuilder({ data: null, error: updateError })
  const notificationsQb  = makeQueryBuilder({ data: null, error: null })

  // update チェーンだけ別のビルダーへ
  projectsSelectQb['update'] = vi.fn().mockReturnValue(projectsUpdateQb)

  return {
    from: vi.fn((table: string) => {
      if (table === 'projects')      return projectsSelectQb
      if (table === 'notifications') return notificationsQb
      return makeQueryBuilder({ data: null, error: null })
    }),
    _projectsSelectQb: projectsSelectQb,
    _projectsUpdateQb: projectsUpdateQb,
    _notificationsQb:  notificationsQb,
  }
}

const makePatchReq = (body: unknown) =>
  new NextRequest('http://localhost/api/orders/order-1/status', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

const DEFAULT_PARAMS = { params: { id: 'order-1' } }

// ─────────────────────────────────────────────────────────
describe('PATCH /api/orders/[id]/status', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── ハッピーケース：ステータス遷移 ──────────────────
  it('[happy] pending → accepted（クリエイターが承認）', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'pending', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'accepted' }), DEFAULT_PARAMS)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('[happy] pending → cancelled（クリエイターがキャンセル）', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'pending', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'cancelled' }), DEFAULT_PARAMS)
    expect(res.status).toBe(200)
  })

  it('[happy] pending → cancelled（依頼者がキャンセル）', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'client-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'pending', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'cancelled' }), DEFAULT_PARAMS)
    expect(res.status).toBe(200)
  })

  it('[happy] accepted → in_progress（クリエイターが開始）', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'accepted', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'in_progress' }), DEFAULT_PARAMS)
    expect(res.status).toBe(200)
  })

  it('[happy] accepted → cancelled（依頼者がキャンセル）', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'client-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'accepted', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'cancelled' }), DEFAULT_PARAMS)
    expect(res.status).toBe(200)
  })

  it('[happy] in_progress → delivered（クリエイターが納品）', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'in_progress', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'delivered' }), DEFAULT_PARAMS)
    expect(res.status).toBe(200)
  })

  it('[happy] in_progress → cancelled（クリエイターがキャンセル）', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'in_progress', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'cancelled' }), DEFAULT_PARAMS)
    expect(res.status).toBe(200)
  })

  it('[happy] delivered → completed（依頼者が完了承認）', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'client-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'delivered', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'completed' }), DEFAULT_PARAMS)
    expect(res.status).toBe(200)
  })

  it('[happy] delivered → disputed（依頼者が異議申し立て）', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'client-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'delivered', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'disputed' }), DEFAULT_PARAMS)
    expect(res.status).toBe(200)
  })

  it('[happy] delivered → in_progress（クリエイターが差し戻し対応）', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'delivered', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'in_progress' }), DEFAULT_PARAMS)
    expect(res.status).toBe(200)
  })

  // ── エッジケース：認証 ──────────────────────────────
  it('[edge] 未認証は 401', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    mockServiceFactory.mockReturnValue(makeServiceClient())
    const res = await PATCH(makePatchReq({ status: 'accepted' }), DEFAULT_PARAMS)
    expect(res.status).toBe(401)
  })

  // ── エッジケース：リクエスト ──────────────────────────
  it('[edge] 不正な JSON ボディは 400', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient())
    const req = new NextRequest('http://localhost/api/orders/order-1/status', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    'not-json',
    })
    expect((await PATCH(req, DEFAULT_PARAMS)).status).toBe(400)
  })

  it('[edge] status フィールドが欠落は 400', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient())
    const res = await PATCH(makePatchReq({}), DEFAULT_PARAMS)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('ステータス')
  })

  // ── エッジケース：案件が存在しない ──────────────────
  it('[edge] 存在しない案件 ID は 404', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({ order: null }))
    const res = await PATCH(makePatchReq({ status: 'accepted' }), DEFAULT_PARAMS)
    expect(res.status).toBe(404)
  })

  // ── エッジケース：認可 ──────────────────────────────
  it('[edge] 案件に無関係の第三者は 403', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'stranger-99' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'pending', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'accepted' }), DEFAULT_PARAMS)
    expect(res.status).toBe(403)
  })

  // ── エッジケース：不正なステータス遷移 ──────────────
  it('[edge] pending → delivered は許可されていないので 400', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'pending', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'delivered' }), DEFAULT_PARAMS)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('実行できません')
  })

  it('[edge] pending → completed は許可されていないので 400', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'client-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'pending', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'completed' }), DEFAULT_PARAMS)
    expect(res.status).toBe(400)
  })

  it('[edge] completed は終端ステータスのため さらなる遷移は 400', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'client-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'completed', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'in_progress' }), DEFAULT_PARAMS)
    expect(res.status).toBe(400)
  })

  it('[edge] cancelled は終端ステータスのため さらなる遷移は 400', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'cancelled', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'accepted' }), DEFAULT_PARAMS)
    expect(res.status).toBe(400)
  })

  it('[edge] ロール不一致：依頼者が pending → accepted しようとすると 400', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'client-1' })) // client が承認しようとする
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'pending', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'accepted' }), DEFAULT_PARAMS)
    expect(res.status).toBe(400)
  })

  it('[edge] ロール不一致：クリエイターが delivered → completed しようとすると 400', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' })) // creator が完了承認しようとする
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'delivered', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'completed' }), DEFAULT_PARAMS)
    expect(res.status).toBe(400)
  })

  it('[edge] ロール不一致：クリエイターが delivered → disputed しようとすると 400', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'delivered', title: 'テスト' },
    }))
    const res = await PATCH(makePatchReq({ status: 'disputed' }), DEFAULT_PARAMS)
    expect(res.status).toBe(400)
  })

  // ── エッジケース：DB ──────────────────────────────────
  it('[edge] DB 更新エラーは 500', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'creator-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({
      order: { id: 'order-1', client_id: 'client-1', creator_id: 'creator-1', status: 'pending', title: 'テスト' },
      updateError: { message: 'update failed' },
    }))
    const res = await PATCH(makePatchReq({ status: 'accepted' }), DEFAULT_PARAMS)
    expect(res.status).toBe(500)
  })
})
