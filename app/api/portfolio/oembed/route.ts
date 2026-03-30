import { NextRequest, NextResponse } from 'next/server'

const FETCH_TIMEOUT_MS = 8000

// 許可するホスト（厳密なドメイン一致）
const ALLOWED_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'youtu.be',
  'nicovideo.jp', 'www.nicovideo.jp',
  'pixiv.net', 'www.pixiv.net',
  'x.com', 'twitter.com', 'www.x.com',
  'instagram.com', 'www.instagram.com',
])

function isAllowedUrl(urlStr: string): boolean {
  try {
    const { hostname, protocol } = new URL(urlStr)
    if (protocol !== 'https:' && protocol !== 'http:') return false
    return ALLOWED_HOSTS.has(hostname)
  } catch {
    return false
  }
}

type OEmbedResult = {
  title: string | null
  thumbnail_url: string | null
}

async function fetchOEmbed(oembedUrl: string): Promise<OEmbedResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(oembedUrl, { next: { revalidate: 3600 }, signal: controller.signal })
    if (!res.ok) throw new Error('oEmbed fetch failed')
    const data = await res.json()
    return {
      title: data.title ?? data.author_name ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
    }
  } finally {
    clearTimeout(timer)
  }
}

// ユーザーページ用: HTML の og:title / og:image を取得
async function fetchOGMeta(pageUrl: string): Promise<OEmbedResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let html: string
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      next: { revalidate: 3600 },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error('Page fetch failed')
    // レスポンスを最大512KBに制限
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > 512 * 1024) throw new Error('Response too large')
    html = new TextDecoder().decode(buffer)
  } finally {
    clearTimeout(timer)
  }

  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/)
  const imageMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/)

  const thumbnail = imageMatch
    ? imageMatch[1].replace(/&amp;/g, '&')
    : null

  return {
    title: titleMatch ? titleMatch[1] : null,
    thumbnail_url: thumbnail,
  }
}

function addPrefix(title: string | null, prefix: string): string | null {
  if (!title) return title
  return `[${prefix}] ${title}`
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })
  if (!isAllowedUrl(url)) return NextResponse.json({ error: 'Unsupported URL' }, { status: 400 })

  try {
    // ── YouTube ──────────────────────────────────────────────
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const isPlaylist = /youtube\.com\/playlist\?/.test(url)
      const isChannel = /youtube\.com\/(channel|user|c)\/|youtube\.com\/@/.test(url)
      const isVideo = /youtu\.be\/|youtube\.com\/watch\?|youtube\.com\/shorts\//.test(url)

      if (isChannel) {
        const result = await fetchOGMeta(url)
        result.title = addPrefix(result.title, 'ユーザー')
        return NextResponse.json(result)
      }

      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      const result = await fetchOEmbed(oembedUrl)
      if (isPlaylist) result.title = addPrefix(result.title, 'プレイリスト')
      else if (isVideo) result.title = addPrefix(result.title, '作品')
      return NextResponse.json(result)
    }

    // ── niconico ─────────────────────────────────────────────
    if (url.includes('nicovideo.jp')) {
      const isMylist = /nicovideo\.jp\/(?:user\/\d+\/)?mylist\//.test(url)
      const isUser = /nicovideo\.jp\/user\/\d+/.test(url) && !isMylist
      const isVideo = /nicovideo\.jp\/watch\//.test(url)

      if (isUser) {
        const result = await fetchOGMeta(url)
        result.title = addPrefix(result.title, 'ユーザー')
        return NextResponse.json(result)
      }

      const oembedUrl = `https://www.nicovideo.jp/oembed?url=${encodeURIComponent(url)}&format=json`
      const result = await fetchOEmbed(oembedUrl)
      if (isMylist) result.title = addPrefix(result.title, 'マイリスト')
      else if (isVideo) result.title = addPrefix(result.title, '作品')
      return NextResponse.json(result)
    }

    // ── pixiv ────────────────────────────────────────────────
    if (url.includes('pixiv.net')) {
      const isUser = /pixiv\.net\/(?:en\/)?users\//.test(url)
      const isWork = /pixiv\.net\/(?:en\/)?artworks\/|pixiv\.net\/novel\//.test(url)

      if (isUser) {
        const result = await fetchOGMeta(url)
        result.title = addPrefix(result.title, 'ユーザー')
        return NextResponse.json(result)
      }

      const oembedUrl = `https://embed.pixiv.net/oembed.php?url=${encodeURIComponent(url)}&format=json`
      const result = await fetchOEmbed(oembedUrl)
      if (isWork) result.title = addPrefix(result.title, '作品')
      return NextResponse.json(result)
    }

    // ── X (Twitter) ──────────────────────────────────────────
    if (url.includes('x.com') || url.includes('twitter.com')) {
      const isTweet = /\/status\//.test(url)

      if (!isTweet) {
        // ユーザーページ: og:title からユーザー名を取得
        const result = await fetchOGMeta(url)
        result.thumbnail_url = null
        result.title = addPrefix(result.title, 'ユーザー')
        return NextResponse.json(result)
      }

      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&format=json`
      const result = await fetchOEmbed(oembedUrl)
      result.thumbnail_url = null
      return NextResponse.json(result)
    }

    // ── Instagram ────────────────────────────────────────────
    if (url.includes('instagram.com')) {
      const isUser = /instagram\.com\/(?!p\/|reel\/|tv\/)[\w.]+\/?$/.test(url)
      const isPost = /instagram\.com\/(p|reel|tv)\//.test(url)

      const result = await fetchOGMeta(url)
      result.thumbnail_url = null // Instagram はサムネ取得不可
      if (isUser) result.title = addPrefix(result.title, 'ユーザー')
      else if (isPost) result.title = addPrefix(result.title, '作品')
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })

  } catch {
    return NextResponse.json({ error: 'Fetch error' }, { status: 500 })
  }
}
