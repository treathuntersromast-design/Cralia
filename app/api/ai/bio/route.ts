import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, sanitizeAiResponse } from '@/lib/aiGuard'
import { logError } from '@/lib/logError'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `あなたはクリエイターマッチングプラットフォーム「Cralia」の自己紹介文作成アシスタントです。
クリエイターが依頼者に好印象を与える、魅力的な自己紹介文（400文字以内）を作成する手助けをします。

## 絶対に守るルール
- **1回の返答につき、質問は必ず1つだけ**にしてください
- 複数の質問をまとめて聞くことは絶対に禁止です
- ユーザーが回答したら、次の質問を1つだけ聞いてください
- 質問に番号（1. 2. 3.）をつけたり、箇条書きで複数聞くことも禁止です

## 進め方（質問は1つずつ順番に）
まず以下の情報を1問ずつ収集してから、自己紹介文を作成してください。

【複数のクリエイタータイプがある場合】
ユーザー情報に複数のクリエイタータイプが記載されている場合、各タイプについて1つずつ順番に聞いてください。
例）ボカロP・動画師の場合:
  - まず「ボカロPとしての活動」について1問
  - 回答をもらったら「動画師としての活動」について1問
  - すべてのタイプを聞き終えたら次のステップへ

ステップ1: 各クリエイタータイプごとの活動内容（得意ジャンル・作風）を1つずつ確認
ステップ2: 実績・経験（制作実績、活動歴など。なければスキップ可と伝える）
ステップ3: 依頼者への対応スタイル（丁寧さ、相談しやすさ、こだわりなど）
ステップ4: 上記がすべて揃ったら自己紹介文の案を提示する

## 自己紹介文のポイント
- 活動内容・得意ジャンルを明確に
- 実績・経験があれば自然に含める
- 依頼者へのメッセージ（丁寧さ・対応スタイル）
- 400文字以内に収める
- 一人称は「私」または名乗り形式（「〇〇と申します」）

## その他の注意
- 日本語で回答する
- 自己紹介文の案を提示するときは \`\`\`bio から \`\`\` で囲む（フロントエンドで抽出するため）
- 修正の際も同様に囲む
- 修正依頼にも1つずつ確認しながら対応する`

const ALLOWED_ROLES = new Set(['user', 'assistant'])
const MSG_MAX_CHARS = 2000
const TOTAL_MAX_CHARS = 15_000

function sanitizeForPrompt(str: string | null | undefined, maxLen: number): string {
  if (!str) return ''
  return str
    .replace(/[\n\r]/g, ' ')
    .replace(/[`<>|]/g, '')
    .trim()
    .slice(0, maxLen)
}

export async function POST(request: NextRequest) {
  let userId: string | undefined

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    userId = user.id

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI機能が設定されていません（APIキー未設定）' }, { status: 503 })
    }

    const { allowed, used, limit } = await checkRateLimit(user.id, 'ai/bio')
    if (!allowed) {
      return NextResponse.json(
        { error: `1日の利用上限（${limit}回）に達しました。明日またお試しください。（本日 ${used}/${limit} 回）` },
        { status: 429 }
      )
    }

    let body: { messages?: unknown; creatorTypes?: unknown; skills?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
    }

    const { messages, creatorTypes, skills } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    }
    if (messages.length > 40) {
      return NextResponse.json({ error: 'メッセージ履歴が長すぎます' }, { status: 400 })
    }

    let totalChars = 0
    for (const m of messages as { role?: unknown; content?: unknown }[]) {
      if (!ALLOWED_ROLES.has(m.role as string)) {
        return NextResponse.json({ error: 'role は user または assistant のみ指定できます' }, { status: 400 })
      }
      if (typeof m.content !== 'string' || m.content.length > MSG_MAX_CHARS) {
        return NextResponse.json({ error: `メッセージが長すぎます（1件${MSG_MAX_CHARS}文字以内）` }, { status: 400 })
      }
      totalChars += m.content.length
    }
    if (totalChars > TOTAL_MAX_CHARS) {
      return NextResponse.json({ error: '会話の合計文字数が上限を超えています' }, { status: 400 })
    }

    // context文字列をサニタイズしてから system prompt に埋め込む
    const safeTypes  = Array.isArray(creatorTypes)
      ? (creatorTypes as unknown[]).filter(t => typeof t === 'string').map(t => sanitizeForPrompt(t as string, 50))
      : []
    const safeSkills = Array.isArray(skills)
      ? (skills as unknown[]).filter(s => typeof s === 'string').map(s => sanitizeForPrompt(s as string, 50))
      : []

    const contextNote = [
      safeTypes.length  ? `ユーザーのクリエイタータイプ: ${safeTypes.join('、')}` : '',
      safeSkills.length ? `登録済みスキル: ${safeSkills.join('、')}` : '',
    ].filter(Boolean).join('\n')

    const systemWithContext = contextNote
      ? `${SYSTEM_PROMPT}\n\n## ユーザー情報（参考）\n${contextNote}`
      : SYSTEM_PROMPT

    const apiMessages = (messages as { role: string; content: string }[]).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    if (apiMessages.length === 0) {
      apiMessages.push({ role: 'user', content: 'はじめまして。自己紹介文を作るのを手伝ってください。' })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemWithContext,
      messages: apiMessages,
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const { sanitized: text } = sanitizeAiResponse(rawText)

    const bioMatch    = text.match(/```bio\n([\s\S]*?)```/)
    const proposedBio = bioMatch ? bioMatch[1].trim() : null

    return NextResponse.json({ text, proposedBio })

  } catch (e) {
    const message = e instanceof Error ? e.message : '予期しないエラーが発生しました'
    const stack   = e instanceof Error ? e.stack   : undefined
    await logError({ endpoint: 'ai/bio', message, stack, userId })
    return NextResponse.json({ error: 'エラーが発生しました。時間をおいて再試みください。' }, { status: 500 })
  }
}
