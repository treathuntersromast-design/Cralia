import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// fetch モック
const mockFetch = vi.fn()
global.fetch = mockFetch

// EventsPage は client component のため動的 import を避け直接 import
import EventsPage from '@/app/events/page'

// ── テストデータ ─────────────────────────────────────────────
type Event = {
  id: string
  title: string
  event_date: string
  location: string
  capacity: number
  applicants: number
  description: string | null
  tags: string[]
  status: 'open' | 'closed' | 'cancelled'
  isRegistered: boolean
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id:           overrides.id           ?? 'ev-1',
    title:        overrides.title        ?? 'Cralia 交流会 Vol.1',
    event_date:   overrides.event_date   ?? '2026-08-01T14:00:00Z',
    location:     overrides.location     ?? 'オンライン',
    capacity:     overrides.capacity     ?? 30,
    applicants:   overrides.applicants   ?? 5,
    description:  'description' in overrides ? (overrides.description ?? null) : 'クリエイター同士の交流会です。',
    tags:         overrides.tags         ?? ['VTuber', 'イラストレーター'],
    status:       overrides.status       ?? 'open',
    isRegistered: overrides.isRegistered ?? false,
  }
}

function setupFetch(events: Event[]) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: events }),
  } as Response)
}

function setupRegisterFetch(events: Event[], registerOk = true) {
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: events }),
    } as Response)
    .mockResolvedValueOnce({
      ok: registerOk,
      json: () => Promise.resolve(registerOk ? { success: true } : { error: '定員に達しています' }),
    } as Response)
}

// ─────────────────────────────────────────────────────────────
describe('EventsPage', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── ハッピーケース: ローディング ──────────────────────────
  it('[happy] 初期表示でローディング状態が表示される', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // 永遠に pending
    render(<EventsPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  // ── ハッピーケース: イベント表示 ─────────────────────────
  it('[happy] イベントが1件あるときタイトルが表示される', async () => {
    setupFetch([makeEvent()])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText('Cralia 交流会 Vol.1')).toBeInTheDocument()
    })
  })

  it('[happy] イベントの説明文が表示される', async () => {
    setupFetch([makeEvent()])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText('クリエイター同士の交流会です。')).toBeInTheDocument()
    })
  })

  it('[happy] 開催場所「オンライン」が表示される', async () => {
    setupFetch([makeEvent({ location: 'オンライン' })])
    render(<EventsPage />)
    await waitFor(() => {
      // '📍 オンライン' を含む SPAN を探す
      const spans = document.querySelectorAll('span')
      const found = Array.from(spans).some((el) => el.textContent?.includes('オンライン'))
      expect(found).toBe(true)
    })
  })

  it('[happy] タグが表示される', async () => {
    setupFetch([makeEvent({ tags: ['VTuber', 'イラストレーター'] })])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText('VTuber')).toBeInTheDocument()
      expect(screen.getByText('イラストレーター')).toBeInTheDocument()
    })
  })

  it('[happy] 残り枠が正しく計算されて表示される (capacity=30, applicants=5 → 25名)', async () => {
    setupFetch([makeEvent({ capacity: 30, applicants: 5 })])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText('25 名')).toBeInTheDocument()
    })
  })

  it('[happy] 定員が表示される', async () => {
    setupFetch([makeEvent({ capacity: 30 })])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText('定員 30 名')).toBeInTheDocument()
    })
  })

  // ── ハッピーケース: 申込ボタン ────────────────────────────
  it('[happy] 未申込イベントに「参加申込」ボタンが表示される', async () => {
    setupFetch([makeEvent({ isRegistered: false, status: 'open' })])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '参加申込' })).toBeInTheDocument()
    })
  })

  it('[happy] 申込済みイベントに「キャンセルする」ボタンが表示される', async () => {
    setupFetch([makeEvent({ isRegistered: true, status: 'open' })])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'キャンセルする' })).toBeInTheDocument()
    })
  })

  it('[happy] 「参加申込」クリックで POST が発行され申込済みに切り替わる', async () => {
    setupRegisterFetch([makeEvent({ isRegistered: false, status: 'open' })])
    render(<EventsPage />)
    await waitFor(() => screen.getByRole('button', { name: '参加申込' }))

    fireEvent.click(screen.getByRole('button', { name: '参加申込' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'キャンセルする' })).toBeInTheDocument()
    })
  })

  it('[happy] 申込成功後に「申込が完了しました！」メッセージが表示される', async () => {
    setupRegisterFetch([makeEvent({ isRegistered: false, status: 'open' })])
    render(<EventsPage />)
    await waitFor(() => screen.getByRole('button', { name: '参加申込' }))

    fireEvent.click(screen.getByRole('button', { name: '参加申込' }))

    await waitFor(() => {
      expect(screen.getByText('申込が完了しました！')).toBeInTheDocument()
    })
  })

  it('[happy] 申込後に applicants が +1 されて残り枠が減る', async () => {
    // capacity=10, applicants=7 → 残り3名 → 申込後 残り2名
    setupRegisterFetch([makeEvent({ capacity: 10, applicants: 7, isRegistered: false })])
    render(<EventsPage />)
    await waitFor(() => screen.getByText('3 名'))

    fireEvent.click(screen.getByRole('button', { name: '参加申込' }))

    await waitFor(() => {
      expect(screen.getByText('2 名')).toBeInTheDocument()
    })
  })

  it('[happy] キャンセル後に「申込をキャンセルしました」メッセージが表示される', async () => {
    setupRegisterFetch([makeEvent({ isRegistered: true, status: 'open' })])
    render(<EventsPage />)
    await waitFor(() => screen.getByRole('button', { name: 'キャンセルする' }))

    fireEvent.click(screen.getByRole('button', { name: 'キャンセルする' }))

    await waitFor(() => {
      expect(screen.getByText('申込をキャンセルしました')).toBeInTheDocument()
    })
  })

  // ── ハッピーケース: 満員・中止 ───────────────────────────
  it('[happy] 満員イベントは「申込締切」ボタン（disabled）が表示される', async () => {
    setupFetch([makeEvent({ capacity: 10, applicants: 10, status: 'open', isRegistered: false })])
    render(<EventsPage />)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: '申込締切' })
      expect(btn).toBeInTheDocument()
      expect(btn).toBeDisabled()
    })
  })

  it('[happy] 残席5以下で「残席わずか」警告が表示される', async () => {
    setupFetch([makeEvent({ capacity: 10, applicants: 6, status: 'open' })])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText(/残席わずか/)).toBeInTheDocument()
    })
  })

  it('[happy] cancelled イベントには申込ボタンが表示されない', async () => {
    setupFetch([makeEvent({ status: 'cancelled' })])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '参加申込' })).not.toBeInTheDocument()
      expect(screen.getByText('中止')).toBeInTheDocument()
    })
  })

  // ── ハッピーケース: 空状態 ──────────────────────────────
  it('[happy] イベントが0件のとき「近日開催予定」が表示される', async () => {
    setupFetch([])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText('近日開催予定')).toBeInTheDocument()
    })
  })

  it('[happy] 空状態で通知確認リンクが表示される', async () => {
    setupFetch([])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText('🔔 通知を確認する')).toBeInTheDocument()
    })
  })

  // ── ハッピーケース: 複数イベント ─────────────────────────
  it('[happy] 複数イベントがすべて表示される', async () => {
    setupFetch([
      makeEvent({ id: 'ev-1', title: '交流会 Vol.1' }),
      makeEvent({ id: 'ev-2', title: '交流会 Vol.2' }),
      makeEvent({ id: 'ev-3', title: '交流会 Vol.3' }),
    ])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getByText('交流会 Vol.1')).toBeInTheDocument()
      expect(screen.getByText('交流会 Vol.2')).toBeInTheDocument()
      expect(screen.getByText('交流会 Vol.3')).toBeInTheDocument()
    })
  })

  it('[happy] 申込済みバッジが申込済みイベントにのみ表示される', async () => {
    setupFetch([
      makeEvent({ id: 'ev-1', title: '申込済みイベント', isRegistered: true }),
      makeEvent({ id: 'ev-2', title: '未申込イベント',  isRegistered: false }),
    ])
    render(<EventsPage />)
    await waitFor(() => {
      expect(screen.getAllByText('✓ 申込済み')).toHaveLength(1)
    })
  })
})
