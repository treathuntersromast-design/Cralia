import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, sanitizeAiResponse } from '@/lib/aiGuard'
import { logError } from '@/lib/logError'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `あなたはクリエイターマッチングプラットフォーム「Cralia」の営業メッセージ作成・添削アシスタントです。
クリエイターが依頼者に送る売り込みメッセージを、誠実かつ伝わりやすい内容にするお手伝いをします。

## 営業メッセージチェックリスト

### 【必須項目】
1. **強み・得意分野の明示**: クリエイターの得意なことが一読で伝わるか
2. **連絡の理由**: なぜこの依頼者に連絡したかの動機・理由があるか（「貴社の活動を拝見して」など）
3. **提供できる価値**: 依頼者にとって何がメリットになるか伝わっているか
4. **実績への言及**: ポートフォリオや過去の制作実績に触れているか（あれば）

### 【クオリティチェック】
5. **自然なトーン**: 過度な営業臭・売り込み感が強すぎないか。誠実で丁寧な文体か
6. **誇大表現なし**: 「業界最高レベル」「絶対に満足」など根拠のない誇張表現がないか
7. **一方的でない**: 依頼者の活動への興味・関心が伝わっているか
8. **具体性**: 「何でもできます」ではなく、具体的なスキルや作品への言及があるか

### 【リスク・違反チェック】
9. **外部連絡先への誘導**: LINE・Discord・個人メール等、Cralia以外の外部連絡手段への誘導がないか。**Google Meet（ビデオ通話）は例外として許可。**
10. **過度な個人情報**: 本名・住所・電話番号など不要な個人情報が含まれていないか

### 【文章品質】
11. **適切な文章量**: 100文字未満は情報不足。500文字を大幅に超える場合は要点を絞るよう提案する
12. **読みやすい構造**: 段落が整理されているか

## 絶対に守るルール
- 外部連絡先への誘導は原則禁止（Google Meet は例外）
- 1回の返答で質問するのは最大2つまで
- 日本語で回答する
- 作成・添削した営業メッセージは必ず \`\`\`pitch と \`\`\` で囲む（フロントエンドで抽出するため）

## 会話の進め方
### 作成モードの場合
1. クリエイターの強み・得意分野を確認する（初回）
2. なぜその依頼者に連絡したかの動機を確認する
3. 営業メッセージの案を提示する → フィードバックをもらって修正

### 添削モードの場合
1. 提出されたメッセージをチェックリストで確認する
2. 問題点・改善点を簡潔にまとめる（重要度順）
3. 修正版を提示する → フィードバックをもらって修正

## 文章のクオリティ基準
- 依頼者が「この人に連絡してみたい」と思えるような、誠実で具体的なメッセージ
- 長すぎず短すぎない（目安: 150〜400文字程度）
- 敬語を使い、丁寧な印象を保ちつつ自然体で`

const ALLOWED_ROLES = new Set(['user', 'assistant'])
const MSG_MAX_CHARS = 3000
const TOTAL_MAX_CHARS = 20_000

function sanitizeForPrompt(str: string | null | undefined, maxLen: number): string {
  if (!str) return ''
  return str
    .replace(/[\n\r]/g, ' ')
    .replace(/[`<>|]/g, '')
    .trim()
    .slice(0, maxLen)
}

function sanitizeMultilineForPrompt(str: string | null | undefined, maxLen: number): string {
  if (!str) return ''
  return str
    .replace(/`/g, "'")
    .replace(/[<>|]/g, '')
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

    const { allowed, used, limit } = await checkRateLimit(user.id, 'ai/pitch-draft')
    if (!allowed) {
      return NextResponse.json(
        { error: `1日の利用上限（${limit}回）に達しました。明日またお試しください。（本日 ${used}/${limit} 回）` },
        { status: 429 }
      )
    }

    let body: {
      messages?:      unknown
      mode?:          unknown
      displayName?:   unknown
      clientName?:    unknown
      existingDraft?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
    }

    const { messages, mode, displayName, clientName, existingDraft } = body

    if (mode !== undefined && mode !== 'create' && mode !== 'review') {
      return NextResponse.json({ error: '不正なモード指定です' }, { status: 400 })
    }

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

    const safeDisplayName   = typeof displayName   === 'string' ? sanitizeForPrompt(displayName, 60)   : null
    const safeClientName    = typeof clientName    === 'string' ? sanitizeForPrompt(clientName, 60)    : null
    const safeExistingDraft = typeof existingDraft === 'string' ? sanitizeMultilineForPrompt(existingDraft, 2000) : null

    const contextLines: string[] = []
    if (mode)                contextLines.push(`現在のモード: ${mode === 'create' ? '作成モード（ゼロから営業メッセージを作る）' : '添削モード（既存のメッセージを改善する）'}`)
    if (safeDisplayName)     contextLines.push(`クリエイター（送信者）の名前: ${safeDisplayName}`)
    if (safeClientName)      contextLines.push(`連絡先の依頼者: ${safeClientName}`)
    if (safeExistingDraft)   contextLines.push(`現在の営業メッセージ（添削対象）:\n---\n${safeExistingDraft}\n---`)

    const systemWithContext = contextLines.length > 0
      ? `${SYSTEM_PROMPT}\n\n## 現在のセッション情報\n${contextLines.join('\n')}`
      : SYSTEM_PROMPT

    const apiMessages = (messages as { role: string; content: string }[]).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    if (apiMessages.length === 0) {
      if (mode === 'review' && safeExistingDraft) {
        apiMessages.push({
          role: 'user',
          content: `添削をお願いします。現在の営業メッセージは以下のとおりです。\n\n${safeExistingDraft}`,
        })
      } else {
        apiMessages.push({
          role: 'user',
          content: 'こんにちは。営業メッセージを一緒に作成していただけますか？',
        })
      }
    }

    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemWithContext,
      messages:   apiMessages,
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const { sanitized: text, hasExternalUrl } = sanitizeAiResponse(rawText)

    const draftMatch    = text.match(/```pitch\n([\s\S]*?)```/)
    const proposedDraft = draftMatch ? draftMatch[1].trim() : null

    return NextResponse.json({ text, proposedDraft, ...(hasExternalUrl ? { warning: '外部リンクが含まれていたため除去しました' } : {}) })

  } catch (e) {
    const message = e instanceof Error ? e.message : '予期しないエラーが発生しました'
    const stack   = e instanceof Error ? e.stack   : undefined
    await logError({ endpoint: 'ai/pitch-draft', message, stack, userId })
    return NextResponse.json({ error: 'エラーが発生しました。時間をおいて再試みください。' }, { status: 500 })
  }
}
