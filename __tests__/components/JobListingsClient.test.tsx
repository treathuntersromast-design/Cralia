import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import JobListingsClient from '@/components/JobListingsClient'

vi.mock('next/link')

// ── テストデータ ─────────────────────────────────────────
type Listing = Parameters<typeof JobListingsClient>[0]['listings'][0]

/**
 * null を明示的に渡せるように `??` ではなく `in` チェックを使う。
 * 例: makeListing({ budget_min: null }) → budget_min が null になる
 */
function makeListing(overrides: Partial<Listing>): Listing {
  return {
    id:            overrides.id           ?? 'j1',
    title:         overrides.title        ?? 'テスト案件',
    description:   'description'  in overrides ? (overrides.description  ?? null) : '詳細説明です',
    creator_types: overrides.creator_types ?? ['イラストレーター'],
    order_type:    overrides.order_type    ?? 'paid',
    budget_min:    'budget_min' in overrides ? (overrides.budget_min  ?? null) : 5000,
    budget_max:    'budget_max' in overrides ? (overrides.budget_max  ?? null) : 30000,
    deadline:      'deadline'   in overrides ? (overrides.deadline    ?? null) : null,
    created_at:    overrides.created_at    ?? '2026-01-01T00:00:00Z',
    client_id:     overrides.client_id     ?? 'client-1',
    users: 'users' in overrides ? (overrides.users ?? null) : {
      display_name: '依頼太郎',
      avatar_url:   null,
      entity_type:  'individual',
    },
  }
}

// 依頼者が異なる3件の基本リスト
const LISTINGS: Listing[] = [
  makeListing({ id: 'j1', title: 'イラスト依頼',     client_id: 'c1', creator_types: ['イラストレーター'],               order_type: 'paid', budget_min: 10000, budget_max: 50000 }),
  makeListing({ id: 'j2', title: '動画編集募集',     client_id: 'c2', creator_types: ['動画編集者'],                    order_type: 'free', budget_min: null,  budget_max: null  }),
  makeListing({ id: 'j3', title: 'VTuberモデル制作', client_id: 'c3', creator_types: ['3Dモデラー', 'イラストレーター'], order_type: 'paid', budget_min: 30000, budget_max: null  }),
]

function renderComponent(
  argsOrListings: Partial<Parameters<typeof JobListingsClient>[0]> | Listing[] = {},
  extraProps: Partial<Parameters<typeof JobListingsClient>[0]> = {}
) {
  const args = Array.isArray(argsOrListings)
    ? { listings: argsOrListings, ...extraProps }
    : argsOrListings
  return render(
    <JobListingsClient
      listings={args.listings ?? LISTINGS}
      currentUserId={args.currentUserId ?? 'viewer-99'}
      postedSuccess={args.postedSuccess ?? false}
    />
  )
}

// ─────────────────────────────────────────────────────────
describe('JobListingsClient', () => {

  // ── ハッピーケース ────────────────────────────────────
  it('[happy] 全案件が初期表示される', () => {
    renderComponent()
    expect(screen.getByText('イラスト依頼')).toBeInTheDocument()
    expect(screen.getByText('動画編集募集')).toBeInTheDocument()
    expect(screen.getByText('VTuberモデル制作')).toBeInTheDocument()
  })

  it('[happy] 件数が正しく表示される', () => {
    renderComponent()
    expect(screen.getByText('3 件の案件が見つかりました')).toBeInTheDocument()
  })

  it('[happy] クリエイタータイプフィルターで絞り込まれる', () => {
    renderComponent()
    // タイプフィルターのボタンを取得（「すべて」が2つあるため name 指定）
    fireEvent.click(screen.getByRole('button', { name: '動画編集者' }))
    expect(screen.getByText('動画編集募集')).toBeInTheDocument()
    expect(screen.queryByText('イラスト依頼')).not.toBeInTheDocument()
    expect(screen.getByText('1 件の案件が見つかりました')).toBeInTheDocument()
  })

  it('[happy] 複数タイプを持つ案件は含まれるタイプでヒットする', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: 'イラストレーター' }))
    expect(screen.getByText('イラスト依頼')).toBeInTheDocument()
    expect(screen.getByText('VTuberモデル制作')).toBeInTheDocument()
    expect(screen.queryByText('動画編集募集')).not.toBeInTheDocument()
  })

  it('[happy] 報酬フィルター「有償」で有償案件だけ表示される', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: '有償' }))
    expect(screen.getByText('イラスト依頼')).toBeInTheDocument()
    expect(screen.getByText('VTuberモデル制作')).toBeInTheDocument()
    expect(screen.queryByText('動画編集募集')).not.toBeInTheDocument()
  })

  it('[happy] 報酬フィルター「無償」で無償案件だけ表示される', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: '無償' }))
    expect(screen.getByText('動画編集募集')).toBeInTheDocument()
    expect(screen.queryByText('イラスト依頼')).not.toBeInTheDocument()
  })

  it('[happy] タイプ + 報酬の複合フィルターが機能する', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: 'イラストレーター' }))
    fireEvent.click(screen.getByRole('button', { name: '有償' }))
    expect(screen.getByText('イラスト依頼')).toBeInTheDocument()
    expect(screen.getByText('VTuberモデル制作')).toBeInTheDocument()
    expect(screen.queryByText('動画編集募集')).not.toBeInTheDocument()
  })

  it('[happy] カードをクリックすると詳細（説明文）が展開される', () => {
    renderComponent([
      makeListing({ id: 's1', title: '展開テスト案件', description: 'ユニーク説明文XYZ' })
    ])
    expect(screen.queryByText('ユニーク説明文XYZ')).not.toBeInTheDocument()
    const card = screen.getByText('展開テスト案件').closest('[style*="border-radius: 18px"]') as HTMLElement
    fireEvent.click(card)
    expect(screen.getByText('ユニーク説明文XYZ')).toBeInTheDocument()
  })

  it('[happy] 展開したカードを再クリックで閉じる', () => {
    renderComponent([makeListing({ id: 's2', title: '開閉テスト', description: '閉じるべき説明' })])
    const card = screen.getByText('開閉テスト').closest('[style*="border-radius: 18px"]') as HTMLElement
    fireEvent.click(card)
    expect(screen.getByText('閉じるべき説明')).toBeInTheDocument()
    fireEvent.click(card)
    expect(screen.queryByText('閉じるべき説明')).not.toBeInTheDocument()
  })

  it('[happy] 予算（min〜max）が正しくフォーマットされる', () => {
    renderComponent()
    // LISTINGS[0] は ¥10,000〜¥50,000
    expect(screen.getByText((_, el) =>
      el?.tagName === 'SPAN' &&
      (el.textContent ?? '').includes('10') &&
      (el.textContent ?? '').includes('50') &&
      (el.textContent ?? '').includes('〜')
    )).toBeInTheDocument()
  })

  it('[happy] 予算 min のみのとき "〜" と min 値を含むバッジが表示される', () => {
    renderComponent([makeListing({ id: 'bmin', budget_min: 5000, budget_max: null })])
    // 「¥5,000 〜」を SPAN として探す（¥ と 〜 が同一テキストノード内）
    expect(screen.getByText((_, el) =>
      el?.tagName === 'SPAN' &&
      (el.textContent ?? '').includes('〜') &&
      /(5|5,000|5000)/.test(el.textContent ?? '')
    )).toBeInTheDocument()
  })

  it('[happy] 予算 max のみのとき "〜" と max 値を含むバッジが表示される', () => {
    renderComponent([makeListing({ id: 'bmax', budget_min: null, budget_max: 20000 })])
    expect(screen.getByText((_, el) =>
      el?.tagName === 'SPAN' &&
      (el.textContent ?? '').includes('〜') &&
      /(20|20,000|20000)/.test(el.textContent ?? '')
    )).toBeInTheDocument()
  })

  it('[happy] 投稿成功バナーが postedSuccess=true で表示される', () => {
    renderComponent({ postedSuccess: true })
    expect(screen.getByText(/案件を投稿しました/)).toBeInTheDocument()
  })

  it('[happy] 自分の投稿に「自分の投稿」バッジが表示される', () => {
    renderComponent([
      makeListing({ id: 'own1', title: '自分の案件', client_id: 'me' }),
      makeListing({ id: 'oth1', title: '他人の案件', client_id: 'other' }),
    ], { currentUserId: 'me' } as never)
    // 自分の案件だけバッジが付く
    expect(screen.getAllByText('自分の投稿')).toHaveLength(1)
  })

  it('[happy] 他人の投稿には「自分の投稿」バッジが表示されない', () => {
    renderComponent({ currentUserId: 'viewer-99' })
    expect(screen.queryByText('自分の投稿')).not.toBeInTheDocument()
  })

  it('[happy] 展開時、他人の投稿には「依頼者のプロフィールを見る」リンクが表示される', () => {
    renderComponent([makeListing({ id: 'view1', title: '他人の案件', client_id: 'someone' })], { currentUserId: 'viewer-99' } as never)
    const card = screen.getByText('他人の案件').closest('[style*="border-radius: 18px"]') as HTMLElement
    fireEvent.click(card)
    expect(screen.getByText('依頼者のプロフィールを見る →')).toBeInTheDocument()
  })

  it('[happy] 納期が設定されていると納期バッジが表示される', () => {
    renderComponent([makeListing({ id: 'dl1', deadline: '2026-12-31' })])
    expect(screen.getByText((_, el) =>
      el?.tagName === 'SPAN' && (el.textContent ?? '').startsWith('納期')
    )).toBeInTheDocument()
  })

  // ── エッジケース ──────────────────────────────────────
  it('[edge] 案件が0件のとき空状態メッセージが表示される', () => {
    renderComponent({ listings: [] })
    expect(screen.getByText('条件に一致する案件がありませんでした')).toBeInTheDocument()
  })

  it('[edge] フィルター適用後に0件になっても空状態が表示される', () => {
    renderComponent([
      makeListing({ id: 'p1', creator_types: ['デザイナー'], order_type: 'paid' }),
    ])
    // 無償フィルターを押すと有償のデザイナー案件は消える
    fireEvent.click(screen.getByRole('button', { name: '無償' }))
    expect(screen.getByText('条件に一致する案件がありませんでした')).toBeInTheDocument()
  })

  it('[edge] description が null の案件を展開すると「詳細説明なし」と表示される', () => {
    renderComponent([makeListing({ id: 'nodesc', title: '説明なし案件', description: null })])
    const card = screen.getByText('説明なし案件').closest('[style*="border-radius: 18px"]') as HTMLElement
    fireEvent.click(card)
    expect(screen.getByText('詳細説明なし')).toBeInTheDocument()
  })

  it('[edge] 予算が両方 null のとき ¥ が表示されない', () => {
    renderComponent([makeListing({ id: 'nobud', budget_min: null, budget_max: null })])
    // ¥ を含む SPAN が存在しないこと
    const yenSpans = document.querySelectorAll('span')
    const hasYen = Array.from(yenSpans).some((el) => (el.textContent ?? '').includes('¥'))
    expect(hasYen).toBe(false)
  })

  it('[edge] 納期が null のとき「納期」表示がない', () => {
    renderComponent([makeListing({ id: 'nodel', deadline: null })])
    const deadlineSpans = Array.from(document.querySelectorAll('span')).filter(
      (el) => (el.textContent ?? '').startsWith('納期')
    )
    expect(deadlineSpans).toHaveLength(0)
  })

  it('[edge] users が null でもクラッシュしない', () => {
    expect(() =>
      renderComponent([makeListing({ id: 'nousers', users: null })])
    ).not.toThrow()
  })

  it('[edge] タイプフィルターの「すべて」でリセットできる', () => {
    renderComponent()
    // 「すべて」ボタンは 2 つある（タイプ用・報酬用）→ index 0 がタイプ用
    const allBtns = screen.getAllByRole('button', { name: 'すべて' })
    fireEvent.click(screen.getByRole('button', { name: '動画編集者' }))
    expect(screen.queryByText('イラスト依頼')).not.toBeInTheDocument()
    fireEvent.click(allBtns[0]) // タイプフィルターの「すべて」
    expect(screen.getByText('イラスト依頼')).toBeInTheDocument()
  })
})
