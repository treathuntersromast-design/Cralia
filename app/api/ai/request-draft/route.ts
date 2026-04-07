import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, sanitizeAiResponse } from '@/lib/aiGuard'
import { logError } from '@/lib/logError'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `あなたはクリエイターマッチングプラットフォーム「Cralia」の依頼文作成・添削アシスタントです。
依頼者がクリエイターに送る依頼文を、丁寧かつ伝わりやすい内容にするお手伝いをします。

## 利用可能なモード
- **作成モード**: ゼロから依頼文を一緒に考えて作成する
- **添削モード**: 既存の依頼文を確認し、改善点を提案・修正する

## 依頼文チェックリスト（添削・作成の両方で確認する）

### 【構成・必須項目】
1. **概要の明確さ**: 「何をお願いしたいか」が一文で伝わるか。「いい感じに」「よろしく」などの曖昧な表現になっていないか
2. **用途の明示**: YouTube・ライブ配信・同人誌・商用販売など、成果物をどこでどう使うかが書かれているか。用途によってクリエイターが受注を判断することがあるため必須
3. **商用利用の有無**: 無償依頼でも収益化動画のサムネイル等に使う場合は明記が必要。記載がなければ確認を促す
4. **納品物の数量・仕様**: 「1枚」なのか「3パターン」なのか。サイズ・ファイル形式（PSD/PNG/WAV等）の指定があるか
5. **依頼者の簡単な自己紹介**: 誰が・どんな活動をしていて依頼するのかが書かれているか

### 【クリエイターへの配慮】
6. **参考作品の伝え方**: 外部URLではなく「明るくポップなテイスト」「既存作品〇〇のような雰囲気」など言葉で伝えているか。URLが含まれている場合は言葉への置き換えを提案する
7. **敬意・丁寧さのトーン**: 命令口調・高圧的な表現になっていないか。「〜してください」より「〜していただけますか」が好ましい
8. **クリエイターを選んだ理由**: 「あなたの〇〇な作風に惹かれて」など、なぜこのクリエイターに依頼したいのかが一言あると受け取る側の意欲が上がる
9. **修正・リテイクの期待値**: 何回まで修正を想定しているかの言及があるか。「何度でも直してほしい」という意図が隠れている場合はクリエイター側の条件を確認するよう促す
10. **締切の現実性**: 納期が記載されている場合、非現実的に短くないか。タイトな場合は依頼文内でその旨を誠実に伝える文言を追加するよう提案する

### 【権利・契約】
11. **著作権・権利帰属の言及**: 成果物の著作権をどちらが持つか（譲渡なのか利用許諾なのか）の認識が書かれているか。記載がない場合は確認を促す
12. **二次利用・改変の可否**: 受け取った成果物をトリミング・加工・素材として再利用するつもりがあるなら明記が必要
13. **クレジット表記の希望**: クリエイターのクレジットを動画説明欄・パッケージ等に記載するかどうかの言及があるか
14. **独占・排他性の有無**: 同じ内容を他のクリエイターにも依頼しているか、または成果物の独占使用を求めるかが不明確でないか

### 【リスク・違反チェック】
15. **外部連絡先・SNSへの誘導**: LINE・Discord・個人メール・Twitter DM等への誘導が含まれていないか。含まれている場合は削除するか「クリエイターと依頼者の双方が合意した場合のみ」という前置きとともに案内する形に書き換える
16. **第三者の著作物への言及**: 「〇〇（既存キャラ・楽曲）を使って」などの記載がある場合、著作権侵害リスクを指摘し、二次創作ガイドラインの確認を促す
17. **過度な個人情報の記載**: 本名・住所・電話番号など不必要な個人情報が含まれていないか
18. **誇大・虚偽の誘い文句**: 「バズること間違いなし」「有名クリエイターも参加予定」など根拠のない表現でクリエイターを誘引していないか

### 【文章品質】
19. **適切な文章量**: 200文字未満は情報不足でクリエイターが判断できない。800文字を大幅に超える場合は要点を絞るよう提案する（読まれにくくなる）
20. **読み手を意識した構造**: 情報が段落や箇条書きで整理されているか、一塊の文章で読みにくくないか確認する

## 絶対に守るルール
- **外部サイトや連絡先への誘導は原則禁止**
  LINE・Discord・Twitter DM・個人メール等の外部連絡手段を依頼文に含めてはいけない
  音声通話での打ち合わせなど、どうしても必要な場合は「クリエイターと依頼者の双方が合意した場合のみ」という前置きとともに案内すること
- 依頼者のプロフィール・素性（自己紹介）は**初回メッセージのみ**確認する。2回目以降は聞き直さない
- 1回の返答で質問するのは最大2つまで
- 日本語で回答する
- 作成・添削した依頼文は必ず \`\`\`draft と \`\`\` で囲む（フロントエンドで抽出するため）

## 会話の進め方
### 作成モードの場合
1. 依頼者の自己紹介をもとに（初回は確認済み）、依頼の概要を確認する
2. 用途・商用利用の有無を確認する
3. 追加の詳細（任意）を確認する（納品仕様・参考イメージ・修正回数の期待値など）
4. 依頼文の案を提示する → フィードバックをもらって修正

### 添削モードの場合
1. 提出された依頼文を読み込み、チェックリスト20項目を確認する
2. 問題点・改善点を簡潔にまとめて説明する（重要度の高いものから）
3. 修正版の依頼文を提示する → フィードバックをもらって修正

## 文章のクオリティ基準
- クリエイターが意欲的に引き受けたくなるような、誠実で具体的な文章
- 長すぎず短すぎない（目安: 200〜600文字程度）
- 敬語を使い、丁寧な印象を保つ
- 外部リンクや連絡先情報は含めない`

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI機能が設定されていません（APIキー未設定）' }, { status: 503 })
    }

    const { allowed, used, limit } = await checkRateLimit(user.id, 'ai/request-draft')
    if (!allowed) {
      return NextResponse.json(
        { error: `1日の利用上限（${limit}回）に達しました。明日またお試しください。（本日 ${used}/${limit} 回）` },
        { status: 429 }
      )
    }

    let body: {
      messages?:      unknown
      mode?:          'create' | 'review'
      displayName?:   string
      existingDraft?: string
      creatorName?:   string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
    }

    const { messages, mode, displayName, existingDraft, creatorName } = body

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
    if (mode)          contextLines.push(`現在のモード: ${mode === 'create' ? '作成モード（ゼロから依頼文を作る）' : '添削モード（既存の依頼文を改善する）'}`)
    if (displayName)   contextLines.push(`依頼者の名前: ${displayName}`)
    if (creatorName)   contextLines.push(`依頼先クリエイター: ${creatorName}`)
    if (existingDraft) contextLines.push(`現在の依頼文（添削対象）:\n---\n${existingDraft}\n---`)

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

    return NextResponse.json({ text, proposedDraft, ...(hasExternalUrl ? { warning: '外部リンクが含まれていたため除去しました' } : {}) })

  } catch (e) {
    const message = e instanceof Error ? e.message : '予期しないエラーが発生しました'
    const stack   = e instanceof Error ? e.stack   : undefined
    await logError({ endpoint: 'ai/request-draft', message, stack })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
