import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/profile/setup/route'

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

function makeAuthClient(user: { id: string } | null = { id: 'user-1' }) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

/**
 * サービスクライアントモック。
 * - users テーブル upsert の結果
 * - creator_profiles テーブル upsert の結果
 * - portfolios テーブル delete/insert の結果
 */
function makeServiceClient({
  userUpsertError     = null as unknown,
  profileUpsertError  = null as unknown,
  portfolioError      = null as unknown,
} = {}) {
  const usersQb      = makeQueryBuilder({ data: null, error: userUpsertError })
  const profilesQb   = makeQueryBuilder({ data: null, error: profileUpsertError })
  const portfoliosQb = makeQueryBuilder({ data: null, error: portfolioError })

  return {
    from: vi.fn((table: string) => {
      if (table === 'users')            return usersQb
      if (table === 'creator_profiles') return profilesQb
      if (table === 'portfolios')       return portfoliosQb
      return makeQueryBuilder({ data: null, error: null })
    }),
    _usersQb:      usersQb,
    _profilesQb:   profilesQb,
    _portfoliosQb: portfoliosQb,
  }
}

const makePostReq = (body: unknown) =>
  new NextRequest('http://localhost/api/profile/setup', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

// 最小有効リクエスト（クリエイター）
const minCreatorBody = {
  roles:       ['creator'],
  displayName: 'テストユーザー',
  entityType:  'individual',
}

// 最小有効リクエスト（依頼者）
const minClientBody = {
  roles:       ['client'],
  displayName: 'テスト依頼者',
  entityType:  'individual',
}

// 全項目入力リクエスト（クリエイター）
const fullCreatorBody = {
  roles:        ['creator'],
  displayName:  'フルクリエイター',
  entityType:   'individual',
  bio:          '自己紹介です',
  creatorTypes: ['イラストレーター', 'デザイナー'],
  skills:       ['Illustrator', 'Photoshop', 'Figma'],
  portfolios:   [
    { platform: 'pixiv',   url: 'https://pixiv.net/test',   title: 'ポートフォリオ1' },
    { platform: 'twitter', url: 'https://twitter.com/test', title: 'ポートフォリオ2' },
  ],
  snsLinks:     [{ platform: 'twitter', id: 'testuser' }],
  priceMin:     5000,
  priceNote:    '単価の補足説明',
  availability: 'open',
  deliveryDays: '5〜7日',
  clientTypes:  [],
}

// ─────────────────────────────────────────────────────────
describe('POST /api/profile/setup', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthFactory.mockReturnValue(makeAuthClient())
    mockServiceFactory.mockReturnValue(makeServiceClient())
  })

  // ── ハッピーケース ────────────────────────────────────
  it('[happy] 最小クリエイタープロフィールで 200 を返す', async () => {
    const res = await POST(makePostReq(minCreatorBody))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('[happy] 最小依頼者プロフィールで 200 を返す', async () => {
    const res = await POST(makePostReq(minClientBody))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('[happy] クリエイター＋依頼者の両ロールで 200 を返す', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, roles: ['creator', 'client'] }))
    expect(res.status).toBe(200)
  })

  it('[happy] 全項目入力のクリエイタープロフィールで 200 を返す', async () => {
    const res = await POST(makePostReq(fullCreatorBody))
    expect(res.status).toBe(200)
  })

  it('[happy] 表示名が30文字ちょうどで成功する', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, displayName: 'あ'.repeat(30) }))
    expect(res.status).toBe(200)
  })

  it('[happy] bio が400文字ちょうどで成功する', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, bio: 'a'.repeat(400) }))
    expect(res.status).toBe(200)
  })

  it('[happy] priceNote が500文字ちょうどで成功する', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, priceNote: 'a'.repeat(500) }))
    expect(res.status).toBe(200)
  })

  it('[happy] スキル20個ちょうどで成功する', async () => {
    const skills = Array.from({ length: 20 }, (_, i) => `skill${i}`)
    const res = await POST(makePostReq({ ...minCreatorBody, skills }))
    expect(res.status).toBe(200)
  })

  it('[happy] ポートフォリオ5件ちょうどで成功する', async () => {
    const portfolios = Array.from({ length: 5 }, (_, i) => ({
      platform: 'pixiv',
      url:      `https://example.com/${i}`,
      title:    `作品${i}`,
    }))
    const res = await POST(makePostReq({ ...minCreatorBody, portfolios }))
    expect(res.status).toBe(200)
  })

  it('[happy] SNSリンク7件ちょうどで成功する', async () => {
    const snsLinks = Array.from({ length: 7 }, (_, i) => ({ platform: 'twitter', id: `user${i}` }))
    const res = await POST(makePostReq({ ...minCreatorBody, snsLinks }))
    expect(res.status).toBe(200)
  })

  it('[happy] priceMin が負のとき null 扱いで 200 を返す（サイレント）', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, priceMin: -100 }))
    expect(res.status).toBe(200)
  })

  it('[happy] http:// のポートフォリオ URL は有効として保存される', async () => {
    const res = await POST(makePostReq({
      ...minCreatorBody,
      portfolios: [{ platform: 'other', url: 'http://example.com/work', title: '作品' }],
    }))
    expect(res.status).toBe(200)
  })

  it('[happy] 不正な URL のポートフォリオはフィルタリングされるが 200 を返す（バリデーションエラーなし）', async () => {
    const res = await POST(makePostReq({
      ...minCreatorBody,
      portfolios: [
        { platform: 'pixiv', url: 'javascript:alert(1)', title: '危険' },
        { platform: 'pixiv', url: 'https://pixiv.net/valid', title: '有効' },
      ],
    }))
    // 不正URLはフィルタされるが、有効なURLが残るので成功
    expect(res.status).toBe(200)
  })

  it('[happy] ID が空の SNS リンクはフィルタリングされる（エラーなし）', async () => {
    const res = await POST(makePostReq({
      ...minCreatorBody,
      snsLinks: [
        { platform: 'twitter', id: '' },
        { platform: 'instagram', id: 'valid_user' },
      ],
    }))
    expect(res.status).toBe(200)
  })

  // ── エッジケース：認証 ──────────────────────────────
  it('[edge] 未認証は 401', async () => {
    mockAuthFactory.mockReturnValue(makeAuthClient(null))
    expect((await POST(makePostReq(minCreatorBody))).status).toBe(401)
  })

  // ── エッジケース：JSON ──────────────────────────────
  it('[edge] 不正な JSON ボディは 400', async () => {
    const req = new NextRequest('http://localhost/api/profile/setup', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    'not-json',
    })
    expect((await POST(req)).status).toBe(400)
  })

  // ── エッジケース：バリデーション ──────────────────────
  it('[edge] roles が空配列は 400', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, roles: [] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('活動スタイル')
  })

  it('[edge] roles が欠落は 400', async () => {
    const { roles: _r, ...rest } = minCreatorBody as Record<string, unknown>
    const res = await POST(makePostReq(rest))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('活動スタイル')
  })

  it('[edge] displayName が空は 400', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, displayName: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('表示名')
  })

  it('[edge] displayName が空白のみは 400', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, displayName: '   ' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('表示名')
  })

  it('[edge] displayName が31文字は 400', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, displayName: 'あ'.repeat(31) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('30文字')
  })

  it('[edge] bio が401文字は 400', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, bio: 'a'.repeat(401) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('400文字')
  })

  it('[edge] priceNote が501文字は 400', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, priceNote: 'a'.repeat(501) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('500文字')
  })

  it('[edge] deliveryDays が31文字は 400', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, deliveryDays: 'a'.repeat(31) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('30文字')
  })

  it('[edge] スキルタグが21個は 400', async () => {
    const skills = Array.from({ length: 21 }, (_, i) => `skill${i}`)
    const res = await POST(makePostReq({ ...minCreatorBody, skills }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('20個')
  })

  it('[edge] スキルタグが51文字は 400', async () => {
    const res = await POST(makePostReq({
      ...minCreatorBody,
      skills: ['a'.repeat(51)],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('50文字')
  })

  it('[edge] ポートフォリオが6件は 400', async () => {
    const portfolios = Array.from({ length: 6 }, (_, i) => ({
      platform: 'pixiv',
      url:      `https://example.com/${i}`,
      title:    `作品${i}`,
    }))
    const res = await POST(makePostReq({ ...minCreatorBody, portfolios }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('5件')
  })

  it('[edge] SNSリンクが8件は 400', async () => {
    const snsLinks = Array.from({ length: 8 }, (_, i) => ({ platform: 'twitter', id: `user${i}` }))
    const res = await POST(makePostReq({ ...minCreatorBody, snsLinks }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('7件')
  })

  it('[edge] bio が数値型は 400', async () => {
    const res = await POST(makePostReq({ ...minCreatorBody, bio: 12345 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('不正なリクエスト')
  })

  // ── エッジケース：DB ──────────────────────────────────
  it('[edge] users upsert エラーは 500', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      userUpsertError: { message: 'upsert failed', code: 'XXXXX' },
    }))
    const res = await POST(makePostReq(minCreatorBody))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('ユーザー情報')
  })

  it('[edge] creator_profiles upsert エラーは 500', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      profileUpsertError: { message: 'profile upsert failed', code: 'XXXXX' },
    }))
    const res = await POST(makePostReq(minCreatorBody))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('プロフィール')
  })

  it('[edge] portfolios insert エラーは 500', async () => {
    mockServiceFactory.mockReturnValue(makeServiceClient({
      portfolioError: { message: 'portfolio insert failed', code: 'XXXXX' },
    }))
    const res = await POST(makePostReq({
      ...minCreatorBody,
      portfolios: [{ platform: 'pixiv', url: 'https://pixiv.net/test', title: 'テスト' }],
    }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('ポートフォリオ')
  })
})
