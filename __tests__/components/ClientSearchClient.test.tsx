import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ClientSearchClient from '@/components/ClientSearchClient'
import type { Client } from '@/app/clients/page'

// next/navigation モック
vi.mock('next/navigation', () => ({
  useRouter:   () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/clients',
}))

// ── テストデータ ─────────────────────────────────────────
const makeClient = (overrides: Partial<Client>): Client => ({
  id:           overrides.id          ?? 'c1',
  display_name: overrides.display_name ?? 'テストユーザー',
  avatar_url:   overrides.avatar_url   ?? null,
  entity_type:  overrides.entity_type  ?? 'individual',
  bio:          overrides.bio          ?? null,
  client_type:  overrides.client_type  ?? [],
  sns_links:    overrides.sns_links    ?? [],
  created_at:   overrides.created_at   ?? '2026-01-01T00:00:00Z',
})

const CLIENTS: Client[] = [
  makeClient({ id: 'c1', display_name: '田中 花子',   entity_type: 'individual' }),
  makeClient({ id: 'c2', display_name: '株式会社ABC', entity_type: 'corporate'  }),
  makeClient({ id: 'c3', display_name: '山田 太郎',   entity_type: 'individual' }),
]

function renderComponent(
  clients = CLIENTS,
  initialEntity = '',
  initialQ = ''
) {
  return render(
    <ClientSearchClient
      clients={clients}
      initialEntity={initialEntity}
      initialQ={initialQ}
    />
  )
}

// ─────────────────────────────────────────────────────────
describe('ClientSearchClient', () => {

  // ── ハッピーケース ────────────────────────────────────
  it('[happy] 全依頼者が初期表示される', () => {
    renderComponent()
    expect(screen.getByText('田中 花子')).toBeInTheDocument()
    expect(screen.getByText('株式会社ABC')).toBeInTheDocument()
    expect(screen.getByText('山田 太郎')).toBeInTheDocument()
  })

  it('[happy] 件数が正しく表示される', () => {
    renderComponent()
    expect(screen.getByText('3 人の依頼者が見つかりました')).toBeInTheDocument()
  })

  it('[happy] 名前検索で一致するユーザーだけ表示される', async () => {
    renderComponent()
    const input = screen.getByPlaceholderText('名前で検索...')
    fireEvent.change(input, { target: { value: '田中' } })

    await waitFor(() => {
      expect(screen.getByText('田中 花子')).toBeInTheDocument()
      expect(screen.queryByText('株式会社ABC')).not.toBeInTheDocument()
      expect(screen.queryByText('山田 太郎')).not.toBeInTheDocument()
    })
  })

  it('[happy] 検索が大文字小文字を区別しない（ローマ字)', async () => {
    const clients = [
      makeClient({ id: 'e1', display_name: 'Alice Creator' }),
      makeClient({ id: 'e2', display_name: 'Bob Client' }),
    ]
    render(<ClientSearchClient clients={clients} initialEntity="" initialQ="" />)
    const input = screen.getByPlaceholderText('名前で検索...')
    fireEvent.change(input, { target: { value: 'alice' } })

    await waitFor(() => {
      expect(screen.getByText('Alice Creator')).toBeInTheDocument()
      expect(screen.queryByText('Bob Client')).not.toBeInTheDocument()
    })
  })

  it('[happy] initialQ が指定されると最初からフィルターされる', () => {
    renderComponent(CLIENTS, '', '山田')
    expect(screen.getByText('山田 太郎')).toBeInTheDocument()
    expect(screen.queryByText('田中 花子')).not.toBeInTheDocument()
  })

  it('[happy] × ボタンで検索をクリアできる', async () => {
    renderComponent()
    const input = screen.getByPlaceholderText('名前で検索...')
    fireEvent.change(input, { target: { value: '田中' } })

    const clearBtn = await screen.findByText('×')
    fireEvent.click(clearBtn)

    await waitFor(() => {
      expect(screen.getByText('田中 花子')).toBeInTheDocument()
      expect(screen.getByText('株式会社ABC')).toBeInTheDocument()
    })
  })

  // ── エッジケース ──────────────────────────────────────
  it('[edge] 依頼者が0件のとき件数が "0 人" と表示される', () => {
    renderComponent([])
    expect(screen.getByText('0 人の依頼者が見つかりました')).toBeInTheDocument()
  })

  it('[edge] 検索に一致しない場合 "条件に一致する依頼者がいませんでした" が表示される', async () => {
    renderComponent()
    const input = screen.getByPlaceholderText('名前で検索...')
    fireEvent.change(input, { target: { value: 'XYZXYZ不一致' } })

    await waitFor(() => {
      expect(screen.getByText('条件に一致する依頼者がいませんでした')).toBeInTheDocument()
    })
  })

  it('[edge] 空白のみの検索は全件表示される', async () => {
    renderComponent()
    const input = screen.getByPlaceholderText('名前で検索...')
    fireEvent.change(input, { target: { value: '   ' } })

    await waitFor(() => {
      expect(screen.getByText('3 人の依頼者が見つかりました')).toBeInTheDocument()
    })
  })

  it('[edge] display_name が null のクライアントでもクラッシュしない', () => {
    const clients = [makeClient({ id: 'n1', display_name: undefined as unknown as string })]
    expect(() => renderComponent(clients)).not.toThrow()
  })

  it('[edge] initialQ に合致するものがなければ件数 0 になる', () => {
    renderComponent(CLIENTS, '', '存在しない名前')
    expect(screen.getByText('0 人の依頼者が見つかりました')).toBeInTheDocument()
  })
})
