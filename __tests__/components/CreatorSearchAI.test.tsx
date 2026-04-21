import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// next/navigation モック
vi.mock('next/navigation', () => ({
  useRouter:   () => ({ replace: vi.fn() }),
  usePathname: () => '/search',
}))
const mockFetch = vi.fn()
global.fetch = mockFetch

import CreatorSearchClient from '@/components/CreatorSearchClient'
import type { Creator } from '@/app/search/page'

// ── テストデータ ─────────────────────────────────────────────
function makeCreator(overrides: Partial<Creator> = {}): Creator {
  return {
    creator_id:   overrides.creator_id   ?? 'c-1',
    display_id:   overrides.display_id   ?? '00000001',
    display_name: overrides.display_name ?? 'テストクリエイター',
    creator_type: overrides.creator_type ?? ['イラストレーター'],
    skills:       overrides.skills       ?? ['キャラクターデザイン'],
    bio:          overrides.bio          ?? '自己紹介です',
    price_min:    overrides.price_min    ?? 5000,
    availability: overrides.availability ?? 'open',
    avatar_url:   overrides.avatar_url   ?? null,
    entity_type:  overrides.entity_type  ?? 'individual',
    thumbnails:   overrides.thumbnails   ?? [],
  }
}

const DEFAULT_CREATORS: Creator[] = [
  makeCreator({ creator_id: 'c-1', display_name: 'イラスト太郎', creator_type: ['イラストレーター'], skills: ['キャラクターデザイン'] }),
  makeCreator({ creator_id: 'c-2', display_name: '動画花子',     creator_type: ['動画編集者'],       skills: ['映像編集'] }),
  makeCreator({ creator_id: 'c-3', display_name: 'VTuber三郎',   creator_type: ['VTuber'],           skills: ['Live2D'] }),
]

function renderSearch(overrides: Partial<Parameters<typeof CreatorSearchClient>[0]> = {}) {
  return render(
    <CreatorSearchClient
      creators={overrides.creators ?? DEFAULT_CREATORS}
      initialType={overrides.initialType ?? ''}
      initialAvailability={overrides.initialAvailability ?? ''}
      initialQ={overrides.initialQ ?? ''}
      initialId={overrides.initialId ?? ''}
      initialSkills={overrides.initialSkills ?? []}
    />
  )
}

// ─────────────────────────────────────────────────────────────
describe('CreatorSearchClient — AI フィルター提案', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── ハッピーケース: AI パネル開閉 ─────────────────────────
  it('[happy] 初期状態で AI パネルは閉じている', () => {
    renderSearch()
    expect(screen.queryByPlaceholderText(/Live2Dモデルを作ってほしい/)).not.toBeInTheDocument()
  })

  it('[happy] 「✨ AI でフィルターを提案」クリックでパネルが開く', () => {
    renderSearch()
    fireEvent.click(screen.getByRole('button', { name: /AI でフィルターを提案/ }))
    expect(screen.getByPlaceholderText(/Live2Dモデルを作ってほしい/)).toBeInTheDocument()
  })

  it('[happy] パネルを再クリックで閉じる', () => {
    renderSearch()
    const btn = screen.getByRole('button', { name: /AI でフィルターを提案/ })
    fireEvent.click(btn)
    expect(screen.getByPlaceholderText(/Live2Dモデルを作ってほしい/)).toBeInTheDocument()
    fireEvent.click(btn)
    expect(screen.queryByPlaceholderText(/Live2Dモデルを作ってほしい/)).not.toBeInTheDocument()
  })

  // ── ハッピーケース: 提案ボタン状態 ───────────────────────
  it('[happy] テキスト未入力で「提案する」ボタンが disabled になる', () => {
    renderSearch()
    fireEvent.click(screen.getByRole('button', { name: /AI でフィルターを提案/ }))
    const submitBtn = screen.getByRole('button', { name: '提案する' })
    expect(submitBtn).toBeDisabled()
  })

  it('[happy] テキスト入力後に「提案する」ボタンが有効になる', () => {
    renderSearch()
    fireEvent.click(screen.getByRole('button', { name: /AI でフィルターを提案/ }))
    fireEvent.change(screen.getByPlaceholderText(/Live2Dモデルを作ってほしい/), {
      target: { value: 'VTuberのLive2Dモデルを作ってほしいです' },
    })
    expect(screen.getByRole('button', { name: '提案する' })).not.toBeDisabled()
  })

  // ── ハッピーケース: API 呼び出しと結果反映 ───────────────
  it('[happy] 提案成功後に reason が表示される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        creatorTypes: ['VTuber'],
        skills: ['Live2D', 'キャラクターデザイン'],
        reason: 'VTuber向けのLive2Dモデル制作に適したクリエイターを提案します。',
      }),
    } as Response)

    renderSearch()
    fireEvent.click(screen.getByRole('button', { name: /AI でフィルターを提案/ }))
    fireEvent.change(screen.getByPlaceholderText(/Live2Dモデルを作ってほしい/), {
      target: { value: 'VTuberのLive2Dモデルを作ってほしいです' },
    })
    fireEvent.click(screen.getByRole('button', { name: '提案する' }))

    await waitFor(() => {
      expect(screen.getByText(/VTuber向けのLive2Dモデル制作に適したクリエイター/)).toBeInTheDocument()
    })
  })

  it('[happy] 提案中は「提案中...」に変わる', async () => {
    // 意図的に pending にする
    let resolveFetch!: (v: unknown) => void
    mockFetch.mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve }))

    renderSearch()
    fireEvent.click(screen.getByRole('button', { name: /AI でフィルターを提案/ }))
    fireEvent.change(screen.getByPlaceholderText(/Live2Dモデルを作ってほしい/), {
      target: { value: 'VTuberのLive2Dモデル' },
    })
    fireEvent.click(screen.getByRole('button', { name: '提案する' }))

    expect(screen.getByRole('button', { name: '提案中...' })).toBeInTheDocument()

    // クリーンアップのため resolve する
    resolveFetch({ ok: true, json: () => Promise.resolve({ creatorTypes: [], skills: [], reason: null }) })
  })

  it('[happy] API エラー時にエラーメッセージが表示される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: '1日の利用上限に達しました' }),
    } as Response)

    renderSearch()
    fireEvent.click(screen.getByRole('button', { name: /AI でフィルターを提案/ }))
    fireEvent.change(screen.getByPlaceholderText(/Live2Dモデルを作ってほしい/), {
      target: { value: 'VTuberのLive2Dモデル' },
    })
    fireEvent.click(screen.getByRole('button', { name: '提案する' }))

    await waitFor(() => {
      expect(screen.getByText('1日の利用上限に達しました')).toBeInTheDocument()
    })
  })

  it('[happy] AI 提案で正しい endpoint に POST される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ creatorTypes: ['イラストレーター'], skills: [], reason: null }),
    } as Response)

    renderSearch()
    fireEvent.click(screen.getByRole('button', { name: /AI でフィルターを提案/ }))
    fireEvent.change(screen.getByPlaceholderText(/Live2Dモデルを作ってほしい/), {
      target: { value: 'イラストを描いてほしいです' },
    })
    fireEvent.click(screen.getByRole('button', { name: '提案する' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ai/suggest-creators',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('イラストを描いてほしいです'),
        })
      )
    })
  })
})
