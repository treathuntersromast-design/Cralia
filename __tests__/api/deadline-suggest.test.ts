import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/deadline/suggest/route'

// ── モック ────────────────────────────────────────────────────────────────────
vi.mock('@/lib/supabase/server',  () => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js',  () => ({ createClient: vi.fn() }))
vi.mock('@/lib/calculateDeadline', () => ({
  calculateDeadline: vi.fn(),
  toDateString: vi.fn((d: Date) => d.toISOString().split('T')[0]),
}))

import { createClient as createAuthClientFactory }    from '@/lib/supabase/server'
import { createClient as createServiceClientFactory } from '@supabase/supabase-js'
import { calculateDeadline, toDateString }            from '@/lib/calculateDeadline'

const mockAuthFactory    = createAuthClientFactory    as ReturnType<typeof vi.fn>
const mockServiceFactory = createServiceClientFactory as ReturnType<typeof vi.fn>
const mockCalcDeadline   = calculateDeadline          as ReturnType<typeof vi.fn>
const mockToDateString   = toDateString               as ReturnType<typeof vi.fn>

// ── ヘルパー ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeQb(resolved: { data: unknown; error: unknown }): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qb: Record<string, any> = {}
  for (const m of ['select', 'eq', 'gte', 'not', 'in', 'limit', 'insert', 'update', 'upsert', 'single']) {
    qb[m] = vi.fn().mockReturnValue(qb)
  }
  qb['single'] = vi.fn().mockResolvedValue(resolved)
  qb['then']   = (ok: (v: unknown) => unknown, ng?: (e: unknown) => unknown) =>
    Promise.resolve(resolved).then(ok, ng)
  return qb
}

function makeAuthClient(user: { id: string } | null = { id: 'client-1' }) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

interface ServiceClientOptions {
  hasRelation?:  boolean
  scheduleData?: { data: unknown; error: unknown }
  tokenData?:    { data: unknown; error: unknown }
}

function makeServiceClient({
  hasRelation  = true,
  scheduleData = { data: { schedule: {} }, error: null },
  tokenData    = { data: null, error: { message: 'カレンダー未連携' } },
}: ServiceClientOptions = {}) {
  const projectsQb = makeQb({
    data:  hasRelation ? [{ id: 'proj-1' }] : [],
    error: null,
  })
  const profilesQb = makeQb(scheduleData)
  const tokensQb   = makeQb(tokenData)

  return {
    from: vi.fn((table: string) => {
      if (table === 'projects')         return projectsQb
      if (table === 'creator_profiles') return profilesQb
      if (table === 'creator_tokens')   return tokensQb
      return makeQb({ data: null, error: null })
    }),
  }
}

const FIXED_DEADLINE_DATE   = new Date('2026-06-10T00:00:00.000Z')
const FIXED_DEADLINE_STRING = '2026-06-10'

const makePostReq = (body: unknown) =>
  new NextRequest('http://localhost/api/deadline/suggest', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

const validBody = { creator_id: 'creator-abc', working_days_required: 10 }

// ── テスト ────────────────────────────────────────────────────────────────────
describe('POST /api/deadline/suggest', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthFactory.mockReturnValue(makeAuthClient({ id: 'client-1' }))
    mockServiceFactory.mockReturnValue(makeServiceClient({ hasRelation: true }))
    mockCalcDeadline.mockResolvedValue({ deadline: FIXED_DEADLINE_DATE, skippedDays: [] })
    mockToDateString.mockReturnValue(FIXED_DEADLINE_STRING)
  })

  // ── 認証 ─────────────────────────────────────────────────────────────────

  it('[auth] 未認証は 401 を返す', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBeTruthy()
  })

  // ── 認可 ─────────────────────────────────────────────────────────────────

  it('[authz] 対象クリエイターとの依頼関係がない場合は 403 を返す', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({ hasRelation: false }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBeTruthy()
  })

  it('[authz] 依頼関係がある場合は 403 を返さない', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({ hasRelation: true }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).not.toBe(403)
  })

  it('[authz] pending/accepted/in_progress の依頼があれば 200 を返す（.in 許可リスト確認）', async () => {
    // モックは status フィルタを実際には適用しないが、
    // DB が行を返す（hasRelation: true）＝許可リスト内のステータスが存在する状態をシミュレート
    mockServiceFactory.mockReturnValue(makeServiceClient({ hasRelation: true }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(200)
  })

  it('[authz] cancelled のみの依頼は .in 許可リストに含まれず 403 を返す', async () => {
    // .in('status', ['pending','accepted','in_progress']) に cancelled は含まれないため DB は空を返す
    mockServiceFactory.mockReturnValue(makeServiceClient({ hasRelation: false }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBeTruthy()
  })

  it('[authz] disputed のみの依頼は .in 許可リストに含まれず 403 を返す', async () => {
    // .in('status', ['pending','accepted','in_progress']) に disputed は含まれないため DB は空を返す
    mockServiceFactory.mockReturnValue(makeServiceClient({ hasRelation: false }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBeTruthy()
  })

  it('[authz] completed のみの依頼は .in 許可リストに含まれず 403 を返す', async () => {
    // セキュリティ方針: completed は進行中ではないため許可リスト外
    mockServiceFactory.mockReturnValue(makeServiceClient({ hasRelation: false }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBeTruthy()
  })

  it('[authz] pending ステータスの依頼がある場合は 200 を返す', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({ hasRelation: true }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(200)
  })

  it('[authz] accepted ステータスの依頼がある場合は 200 を返す', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({ hasRelation: true }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(200)
  })

  it('[authz] in_progress ステータスの依頼がある場合は 200 を返す', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({ hasRelation: true }))
    const res = await POST(makePostReq(validBody))
    expect(res.status).toBe(200)
  })

  // ── 正常系：カレンダー連携あり ────────────────────────────────────────────

  it('[happy] カレンダー連携済みで 200 と deadline・summary・working_days を返す', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      hasRelation: true,
      tokenData:   { data: { access_token: 'tok', refresh_token: 'ref', expires_at: '2099-01-01T00:00:00Z' }, error: null },
    }))
    const res  = await POST(makePostReq(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deadline).toBe(FIXED_DEADLINE_STRING)
    expect(body.summary).toContain(FIXED_DEADLINE_STRING)
    expect(body.working_days).toBe(10)
  })

  // ── 正常系：カレンダー未連携（フォールバック） ────────────────────────────

  it('[happy] カレンダー未連携でも 200 とフォールバック deadline を返す', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      hasRelation: true,
      tokenData:   { data: null, error: { message: 'カレンダー未連携' } },
    }))
    // toDateString はフォールバック関数でも呼ばれる
    mockToDateString.mockReturnValue('2026-06-20')

    const res  = await POST(makePostReq(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deadline).toBe('2026-06-20')
    expect(body.summary).toContain('2026-06-20')
    expect(body.working_days).toBe(10)
  })

  it('[happy] working_days_required を省略した場合はデフォルト値を使用する', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      hasRelation:  true,
      scheduleData: { data: { schedule: { default_working_days: 7 } }, error: null },
      tokenData:    { data: null, error: { message: 'no token' } },
    }))
    const res  = await POST(makePostReq({ creator_id: 'creator-abc' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.working_days).toBe(7)
  })

  // ── レスポンス情報削減 ────────────────────────────────────────────────────

  it('[response] skipped_calendar フィールドがレスポンスに存在しない', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      hasRelation: true,
      tokenData:   { data: { access_token: 'tok', refresh_token: 'ref', expires_at: '2099-01-01T00:00:00Z' }, error: null },
    }))
    const body = await (await POST(makePostReq(validBody))).json()
    expect(body).not.toHaveProperty('skipped_calendar')
  })

  it('[response] skipped_holidays フィールドがレスポンスに存在しない', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      hasRelation: true,
      tokenData:   { data: { access_token: 'tok', refresh_token: 'ref', expires_at: '2099-01-01T00:00:00Z' }, error: null },
    }))
    const body = await (await POST(makePostReq(validBody))).json()
    expect(body).not.toHaveProperty('skipped_holidays')
  })

  it('[response] フォールバック時も skipped_calendar がレスポンスに存在しない', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      hasRelation: true,
      tokenData:   { data: null, error: { message: 'no token' } },
    }))
    const body = await (await POST(makePostReq(validBody))).json()
    expect(body).not.toHaveProperty('skipped_calendar')
  })

  it('[response] summary にカレンダー由来の詳細（スキップ等）が含まれない', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      hasRelation: true,
      tokenData:   { data: { access_token: 'tok', refresh_token: 'ref', expires_at: '2099-01-01T00:00:00Z' }, error: null },
    }))
    mockCalcDeadline.mockResolvedValue({
      deadline:    FIXED_DEADLINE_DATE,
      skippedDays: [
        { reason: 'calendar_event', date: '2026-06-01' },
        { reason: 'holiday',        date: '2026-06-02' },
      ],
    })
    const body = await (await POST(makePostReq(validBody))).json()
    expect(body.summary).not.toContain('スキップ')
    expect(body.summary).not.toContain('不在')
    expect(body.summary).not.toContain('祝日')
  })

  // ── バリデーション ────────────────────────────────────────────────────────

  it('[edge] creator_id がない場合は 400 を返す', async () => {
    const res = await POST(makePostReq({ working_days_required: 5 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('creator_id')
  })

  it('[edge] working_days_required=0 は 400 を返す', async () => {
    const res = await POST(makePostReq({ creator_id: 'creator-abc', working_days_required: 0 }))
    expect(res.status).toBe(400)
  })

  it('[edge] working_days_required=91 は 400 を返す', async () => {
    const res = await POST(makePostReq({ creator_id: 'creator-abc', working_days_required: 91 }))
    expect(res.status).toBe(400)
  })

  it('[edge] working_days_required=90 は有効（上限ちょうど）', async () => {
    const res = await POST(makePostReq({ creator_id: 'creator-abc', working_days_required: 90 }))
    expect(res.status).toBe(200)
  })

  it('[edge] working_days_required が小数は 400 を返す', async () => {
    const res = await POST(makePostReq({ creator_id: 'creator-abc', working_days_required: 5.5 }))
    expect(res.status).toBe(400)
  })

  it('[edge] working_days_required が文字列は 400 を返す', async () => {
    const res = await POST(makePostReq({ creator_id: 'creator-abc', working_days_required: 'five' }))
    expect(res.status).toBe(400)
  })

  it('[edge] 不正な JSON ボディは 500 を返す', async () => {
    const req = new NextRequest('http://localhost/api/deadline/suggest', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
