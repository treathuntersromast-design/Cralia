import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase モック ───────────────────────────────────────────
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/logError', () => ({ logError: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/events/route'
import { POST, DELETE } from '@/app/api/events/[id]/route'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeQb(resolved: { data?: any; error?: any; count?: number } = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb: Record<string, any> = {}
  for (const m of ['select', 'eq', 'in', 'order', 'insert', 'delete', 'not', 'neq', 'single']) {
    qb[m] = vi.fn().mockReturnValue(qb)
  }
  qb['then'] = (ok: (v: unknown) => unknown) =>
    Promise.resolve({ data: resolved.data ?? null, error: resolved.error ?? null, count: resolved.count ?? null }).then(ok)
  return qb
}

// ─────────────────────────────────────────────────────────────
// GET /api/events
// ─────────────────────────────────────────────────────────────
describe('GET /api/events', () => {

  beforeEach(() => { vi.clearAllMocks() })

  it('[happy] 未ログインは 401 を返す', async () => {
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    })
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('認証が必要です')
  })

  it('[happy] イベント0件のとき空配列を返す', async () => {
    const eventsQb = makeQb({ data: [] })
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockReturnValue(eventsQb),
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
  })

  it('[happy] イベントがある場合、申込数と自分の申込状態が付与される', async () => {
    const events = [{ id: 'ev-1', title: 'テストイベント', event_date: '2026-08-01T14:00:00Z', location: 'オンライン', capacity: 30, tags: [], status: 'open' }]
    const eventsQb   = makeQb({ data: events })
    const allRegsQb  = makeQb({ data: [{ event_id: 'ev-1' }, { event_id: 'ev-1' }] })  // 2件申込
    const myRegsQb   = makeQb({ data: [{ event_id: 'ev-1' }] })  // 自分も申込済み

    let callCount = 0
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') return eventsQb
        // event_registrations は2回呼ばれる（全件・自分）
        callCount++
        return callCount === 1 ? allRegsQb : myRegsQb
      }),
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].applicants).toBe(2)
    expect(body.data[0].isRegistered).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/events/[id]（参加申込）
// ─────────────────────────────────────────────────────────────
describe('POST /api/events/[id]', () => {

  beforeEach(() => { vi.clearAllMocks() })

  function makeRequest() {
    return new NextRequest('http://localhost/api/events/ev-1', { method: 'POST' })
  }

  it('[happy] 未ログインは 401 を返す', async () => {
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    })
    const res = await POST(makeRequest(), { params: { id: 'ev-1' } })
    expect(res.status).toBe(401)
  })

  it('[happy] 受付中イベントへの申込が 201 を返す', async () => {
    const eventQb = makeQb({ data: { id: 'ev-1', status: 'open', capacity: 30 } })
    const countQb = makeQb({ count: 5 })
    const insertQb = makeQb({ error: null })

    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') return eventQb
        if (table === 'event_registrations') {
          return {
            ...countQb,
            insert: vi.fn().mockReturnValue(insertQb),
          }
        }
        return makeQb()
      }),
    })

    const res = await POST(makeRequest(), { params: { id: 'ev-1' } })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('[happy] status が open 以外のイベントは 409 を返す', async () => {
    const eventQb = makeQb({ data: { id: 'ev-1', status: 'closed', capacity: 30 } })
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockReturnValue(eventQb),
    })
    const res = await POST(makeRequest(), { params: { id: 'ev-1' } })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('受付していません')
  })

  it('[happy] 定員に達している場合は 409 を返す', async () => {
    const eventQb = makeQb({ data: { id: 'ev-1', status: 'open', capacity: 10 } })
    const countQb = makeQb({ count: 10 })  // 定員ちょうど

    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') return eventQb
        return countQb
      }),
    })

    const res = await POST(makeRequest(), { params: { id: 'ev-1' } })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('定員')
  })

  it('[happy] 存在しないイベントは 404 を返す', async () => {
    const eventQb = makeQb({ data: null })
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockReturnValue(eventQb),
    })
    const res = await POST(makeRequest(), { params: { id: 'nonexistent' } })
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/events/[id]（申込キャンセル）
// ─────────────────────────────────────────────────────────────
describe('DELETE /api/events/[id]', () => {

  beforeEach(() => { vi.clearAllMocks() })

  function makeRequest() {
    return new NextRequest('http://localhost/api/events/ev-1', { method: 'DELETE' })
  }

  it('[happy] 未ログインは 401 を返す', async () => {
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    })
    const res = await DELETE(makeRequest(), { params: { id: 'ev-1' } })
    expect(res.status).toBe(401)
  })

  it('[happy] キャンセルが成功すると 200 と success: true を返す', async () => {
    const deleteQb = makeQb({ error: null })
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockReturnValue(deleteQb),
    })
    const res = await DELETE(makeRequest(), { params: { id: 'ev-1' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
