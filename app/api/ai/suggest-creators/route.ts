/**
 * POST /api/ai/suggest-creators
 * 依頼者の依頼内容から最適なクリエイタータイプ・スキルを提案する。
 * ai_suggestion_enabled = false のユーザーは利用不可。
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit, sanitizeAiResponse } from '@/lib/aiGuard'
import { logError } from '@/lib/logError'
import { CREATOR_TYPES, SKILL_SUGGESTIONS } from '@/lib/constants/lists'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `あなたはクリエイターマッチングプラットフォーム「Cralia」のクリエイター提案AIです。
依頼者が入力した依頼内容（タイトル・説明文）を読み、最適なクリエイタータイプとスキルタグを提案します。

## 回答形式（必ず守ること）
JSONのみを返してください。説明文や前置きは不要です。

\`\`\`json
{
  "creatorTypes": ["タイプ1", "タイプ2"],
  "skills": ["スキル1", "スキル2", "スキル3"],
  "reason": "提案理由を1〜2文で"
}
\`\`\`

## 利用可能なクリエイタータイプ（この中から選ぶ）
${CREATOR_TYPES.join('、')}

## 利用可能なスキルタグ（この中から選ぶ。最大5つ）
${SKILL_SUGGESTIONS.join('、')}

## ルール
- creatorTypes は最大3つまで
- skills は最大5つまで、リストにあるものだけ選ぶ
- reason は日本語で簡潔に（外部URL禁止）
- 提案できない場合は空配列を返す`

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI機能が設定されていません（APIキー未設定）' }, { status: 503 })
    }

    // ai_suggestion_enabled チェック
    const db = getDb()
    const { data: userRow } = await db
      .from('users')
      .select('ai_suggestion_enabled')
      .eq('id', user.id)
      .single()

    if (userRow?.ai_suggestion_enabled === false) {
      return NextResponse.json({ error: 'AIクリエイター提案が無効になっています' }, { status: 403 })
    }

    const { allowed, used, limit } = await checkRateLimit(user.id, 'ai/suggest-creators')
    if (!allowed) {
      return NextResponse.json(
        { error: `1日の利用上限（${limit}回）に達しました。明日またお試しください。（本日 ${used}/${limit} 回）` },
        { status: 429 }
      )
    }

    let body: { title?: unknown; description?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
    }

    const { title, description } = body

    if (typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'タイトルを入力してください' }, { status: 400 })
    }
    if (typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: '依頼内容を入力してください' }, { status: 400 })
    }
    if (title.trim().length > 200) {
      return NextResponse.json({ error: 'タイトルが長すぎます（200文字以内）' }, { status: 400 })
    }
    if (description.trim().length > 3000) {
      return NextResponse.json({ error: '依頼内容が長すぎます（3000文字以内）' }, { status: 400 })
    }

    const userMessage = `依頼タイトル: ${title.trim()}\n\n依頼内容:\n${description.trim()}`

    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const { sanitized } = sanitizeAiResponse(rawText)

    // ```json ... ``` ブロック or 生 JSON を抽出
    const jsonMatch = sanitized.match(/```json\n?([\s\S]*?)```/) ?? sanitized.match(/(\{[\s\S]*\})/)
    const jsonStr   = jsonMatch ? jsonMatch[1].trim() : sanitized.trim()

    let parsed: { creatorTypes?: string[]; skills?: string[]; reason?: string }
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = {}
    }

    // 許可リスト外を除去
    const allowedTypes  = new Set(CREATOR_TYPES as readonly string[])
    const allowedSkills = new Set(SKILL_SUGGESTIONS as readonly string[])

    const creatorTypes = (parsed.creatorTypes ?? [])
      .filter((t) => typeof t === 'string' && allowedTypes.has(t))
      .slice(0, 3)
    const skills = (parsed.skills ?? [])
      .filter((s) => typeof s === 'string' && allowedSkills.has(s))
      .slice(0, 5)
    const reason = typeof parsed.reason === 'string' ? parsed.reason.slice(0, 200) : null

    return NextResponse.json({ creatorTypes, skills, reason })

  } catch (e) {
    const message = e instanceof Error ? e.message : '予期しないエラーが発生しました'
    const stack   = e instanceof Error ? e.stack   : undefined
    await logError({ endpoint: 'ai/suggest-creators', message, stack })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
