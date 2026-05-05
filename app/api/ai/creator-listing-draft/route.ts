import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, sanitizeAiResponse } from '@/lib/aiGuard'
import { logError } from '@/lib/logError'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `あなたはクリエイターマッチングプラットフォーム「Cralia」の仕事募集文作成・添削アシスタントです。
クリエイターが依頼者に向けて「こんな仕事ができます」という募集文を作るお手伝いをします。

## 仕事募集文チェックリスト

### 【必須項目】
1. **スキル・得意分野**: 何が得意で、どんな作品を作れるかが明確か
2. **ジャンル・スタイル**: 「ポップなイラスト」「ゆっくり系BGM」など、具体的なジャンルや作風が伝わるか
3. **価格帯の目安**: 「1点〇〇円〜」など価格感があるか（無償でも明記）
4. **納期目安**: 「最短〇日〜」など大まかな所要日数の目安があるか
5. **制作実績への言及**: ポートフォリオや過去実績への言及があるか（あれば）

### 【任意だが効果的な項目】
6. **用途制限の明示**: R18・商用不可・特定ジャンル不可など制限がある場合は明記
7. **得意な依頼者像**: 「YouTubeのゲーム実況者さん向け」など、想定する依頼者像があると刺さる
8. **制作の進め方**: ヒアリング・ラフ確認・修正回数など、プロセスの説明があると信頼感が上がる
9. **実績・受賞歴**: あれば一言添えると説得力が増す

### 【リスク・違反チェック】
10. **外部サイト・連絡先への誘導**: LINE・Discord・個人メール等、Cralia以外の外部連絡手段への誘導がないか確認。**Google Meet（ビデオ通話）は例外として許可。**
11. **誇大表現**: 「業界No.1」「絶対に満足保証」など根拠のない誇大表現がないか
12. **過度な個人情報**: 本名・住所・電話番号など不要な個人情報が含まれていないか

### 【文章品質】
13. **適切な文章量**: 100文字未満は情報不足。500文字を大幅に超える場合は要点を絞るよう提案する
14. **読みやすい構造**: 箇条書きや段落が整理されているか

## 絶対に守るルール
- 外部連絡先への誘導は原則禁止（Google Meet は例外）
- 1回の返答で質問するのは最大2つまで
- 日本語で回答する
- 作成・添削した仕事募集文は必ず \`\`\`listing と \`\`\` で囲む（フロントエンドで抽出するため）

## 会話の進め方
### 作成モードの場合
1. クリエイターの得意ジャンル・スキルを確認する（初回）
2. 価格帯・納期目安を確認する
3. 仕事募集文の案を提示する → フィードバックをもらって修正

### 添削モードの場合
1. 提出された文章をチェックリストで確認する
2. 問題点・改善点を簡潔にまとめる（重要度順）
3. 修正版を提示する → フィードバックをもらって修正

## 文章のクオリティ基準
- 依頼者が「この人に頼んでみたい」と思えるような、信頼感のある文章
- 長すぎず短すぎない（目安: 150〜400文字程度）
- 箇条書きを活用して読みやすく整理する`

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI機能が設定されていません（APIキー未設定）' }, { status: 503 })
    }

    const { allowed, used, limit } = await checkRateLimit(user.id, 'ai/creator-listing-draft')
    if (!allowed) {
      return NextResponse.json(
        { error: `1日の利用上限（${limit}回）に達しました。明日またお試しください。（本日 ${used}/${limit} 回）` },
        { status: 429 }
      )
    }

    let body: {
      messages?:       unknown
      mode?:           'create' | 'review'
      displayName?:    string
      existingDraft?:  string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
    }

    const { messages, mode, displayName, existingDraft } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    }
    if (messages.length > 40) {
      return NextResponse.json({ error: 'メッセージ履歴が長すぎます' }, { status: 400 })
    }
    for (const m of messages as { role?: unknown; content?: unknown }[]) {
      if (typeof m.content !== 'string' || m.content.length > 3000) {
        return NextResponse.json({ error: 'メッセージが長すぎます（1件3000文字以内）' }, { status: 400 })
      }
    }

    const contextLines: string[] = []
    if (mode)          contextLines.push(`現在のモード: ${mode === 'create' ? '作成モード（ゼロから仕事募集文を作る）' : '添削モード（既存の文章を改善する）'}`)
    if (displayName)   contextLines.push(`クリエイターの名前: ${displayName}`)
    if (existingDraft) contextLines.push(`現在の仕事募集文（添削対象）:\n---\n${existingDraft}\n---`)

    const systemWithContext = contextLines.length > 0
      ? `${SYSTEM_PROMPT}\n\n## 現在のセッション情報\n${contextLines.join('\n')}`
      : SYSTEM_PROMPT

    const apiMessages = (messages as { role: string; content: string }[]).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    if (apiMessages.length === 0) {
      if (mode === 'review' && existingDraft) {
        apiMessages.push({
          role: 'user',
          content: `添削をお願いします。現在の仕事募集文は以下のとおりです。\n\n${existingDraft}`,
        })
      } else {
        apiMessages.push({
          role: 'user',
          content: 'こんにちは。仕事募集文を一緒に作成していただけますか？',
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

    const draftMatch    = text.match(/```listing\n([\s\S]*?)```/)
    const proposedDraft = draftMatch ? draftMatch[1].trim() : null

    return NextResponse.json({ text, proposedDraft, ...(hasExternalUrl ? { warning: '外部リンクが含まれていたため除去しました' } : {}) })

  } catch (e) {
    const message = e instanceof Error ? e.message : '予期しないエラーが発生しました'
    const stack   = e instanceof Error ? e.stack   : undefined
    await logError({ endpoint: 'ai/creator-listing-draft', message, stack })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
