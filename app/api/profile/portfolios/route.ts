import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_URL_SCHEMES = ['https:', 'http:']

function isSafeUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    return ALLOWED_URL_SCHEMES.includes(url.protocol)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let portfolios: unknown
  try {
    const body = await request.json()
    portfolios = body.portfolios
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }
  if (!Array.isArray(portfolios)) return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  if (portfolios.length > 5) return NextResponse.json({ error: 'ポートフォリオは5件以内にしてください' }, { status: 400 })

  const valid = portfolios.filter((p: { url: string; platform?: string }) => {
    const url = p.url?.trim()
    if (!url || !isSafeUrl(url)) return false
    if (!p.platform || typeof p.platform !== 'string' || p.platform.trim().length === 0) return false
    if (p.platform.trim().length > 50) return false
    return true
  })

  // 重複チェック
  const urls = valid.map((p: { url: string }) => p.url.trim().toLowerCase())
  if (new Set(urls).size !== urls.length) {
    return NextResponse.json({ error: '同じURLが複数登録されています' }, { status: 400 })
  }

  // 既存を削除して再挿入
  await supabase.from('portfolios').delete().eq('creator_id', user.id)

  if (valid.length > 0) {
    const data = valid.map((p: { platform: string; url: string; title: string; thumbnail_url?: string }, i: number) => ({
      creator_id: user.id,
      platform: p.platform,
      url: p.url.trim(),
      title: p.title?.trim().slice(0, 100) || null,
      thumbnail_url: p.thumbnail_url || null,
      display_order: i,
    }))
    const { error } = await supabase.from('portfolios').insert(data)
    if (error) {
      console.error('[portfolios]', error)
      return NextResponse.json({ error: 'ポートフォリオの保存に失敗しました' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
