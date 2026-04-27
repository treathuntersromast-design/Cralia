import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGuestRateLimit, sanitizeAiResponse } from '@/lib/aiGuard'
import { logError } from '@/lib/logError'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// システムプロンプトは /api/ai/request-draft と同一
const SYSTEM_PROMPT = `あなたはクリエイターマッチングプラットフォーム「Cralia」の依頼文作成・添削アシスタントです。
依頼者がクリエイターに送る依頼文を、丁寧かつ伝わりやすい内容にするお手伝いをします。

## 利用可能なモード
- **作成モード**: ゼロから依頼文を一緒に考えて作成する
- **添削モード**: 既存の依頼文を確認し、改善点を提案・修正する

## 依頼文チェックリスト（添削・作成の両方で確認する）

### 【構成・必須項目】
1. **概要の明確さ**: 「何をお願いしたいか」が一文で伝わるか
2. **用途の明示**: YouTube・ライブ配信・同人誌・商用販売など、成果物をどこでどう使うかが書かれているか
3. **商用利用の有無**: 記載がなければ確認を促す
4. **納品物の数量・仕様**: 「1枚」なのか「3パターン」なのか。サイズ・ファイル形式の指定があるか
5. **依頼者の簡単な自己紹介**: 誰が・どんな活動をしているか

### 【クリエイターへの配慮】
6. **敬意・丁寧さのトーン**: 命令口調・高圧的な表現になっていないか
7. **クリエイターを選んだ理由**: なぜこのクリエイターに依頼したいのかの一言
8. **修正・リテイクの期待値**: 何回まで修正を想定しているか

### 【権利・契約】
9. **著作権・権利帰属の言及**: 成果物の著作権をどちらが持つか
10. **二次利用・改変の可否**: 加工・素材として再利用するつもりがあるなら明記

### 【リスク・違反チェック】
11. **外部連絡先への誘導禁止**: LINE・Discord・個人メール等への誘導が含まれていないか
12. **第三者の著作物への言及**: 著作権侵害リスクを指摘

## 絶対に守るルール
- 外部サイトや連絡先への誘導は原則禁止
- 1回の返答で質問するのは最大2つまで
- 日本語で回答する
- 作成・添削した依頼文は必ず \`\`\`draft と \`\`\` で囲む（フロントエンドで抽出するため）

## 文章のクオリティ基準
- クリエイターが意欲的に引き受けたくなるような、誠実で具体的な文章
- 長すぎず短すぎない（目安: 200〜600文字程度）
- 敬語を使い、丁寧な印象を保つ`

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI機能が設定されていません（APIキー未設定）' }, { status: 503 })
    }

    const ip = getClientIp(request)
    const { allowed, used, limit } = checkGuestRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: `ゲストの利用上限（${limit}回/日）に達しました。アカウント登録すると1日${30}回利用できます。（本日 ${used}/${limit} 回）` },
        { status: 429 }
      )
    }

    let body: {
      messages?:      unknown
      mode?:          'create' | 'review'
      existingDraft?: string
      budget?:        string
      deadline?:      string
      orderType?:     string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
    }

    const { messages, mode, existingDraft, budget, deadline, orderType } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    }
    if (messages.length > 20) {
      return NextResponse.json({ error: 'メッセージ履歴が長すぎます' }, { status: 400 })
    }
    for (const m of messages as { role?: unknown; content?: unknown }[]) {
      if (typeof m.content !== 'string' || m.content.length > 3000) {
        return NextResponse.json({ error: 'メッセージが長すぎます（1件3000文字以内）' }, { status: 400 })
      }
    }

    const contextLines: string[] = [
      '利用者: ゲスト（未登録ユーザー）',
    ]
    if (mode)          contextLines.push(`現在のモード: ${mode === 'create' ? '作成モード' : '添削モード'}`)
    if (orderType)     contextLines.push(`報酬: ${orderType === 'paid' ? '有償' : '無償'}`)
    if (budget)        contextLines.push(`予算: ${budget}`)
    if (deadline)      contextLines.push(`希望納期: ${deadline}`)
    if (existingDraft) contextLines.push(`現在の依頼文（添削対象）:\n---\n${existingDraft}\n---`)

    const systemWithContext = `${SYSTEM_PROMPT}\n\n## 現在のセッション情報\n${contextLines.join('\n')}`

    const apiMessages = (messages as { role: string; content: string }[]).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    if (apiMessages.length === 0) {
      if (mode === 'review' && existingDraft) {
        apiMessages.push({
          role: 'user',
          content: `添削をお願いします。現在の依頼文は以下のとおりです。\n\n${existingDraft}`,
        })
      } else {
        apiMessages.push({
          role: 'user',
          content: 'こんにちは。依頼文を一緒に作成していただけますか？',
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

    const draftMatch    = text.match(/```draft\n([\s\S]*?)```/)
    const proposedDraft = draftMatch ? draftMatch[1].trim() : null

    return NextResponse.json({
      text,
      proposedDraft,
      remaining: limit - used,
      ...(hasExternalUrl ? { warning: '外部リンクが含まれていたため除去しました' } : {}),
    })

  } catch (e) {
    const message = e instanceof Error ? e.message : '予期しないエラーが発生しました'
    const stack   = e instanceof Error ? e.stack   : undefined
    await logError({ endpoint: 'ai/request-draft-guest', message, stack })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
