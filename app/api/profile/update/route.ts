import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await request.json()
  const { displayName, creatorTypes, bio, skills, priceMin, priceNote, deliveryDays, snsLinks } = body

  // users テーブルの更新
  const userPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (displayName !== undefined) {
    if (!displayName.trim()) return NextResponse.json({ error: '表示名を入力してください' }, { status: 400 })
    if (displayName.trim().length > 30) return NextResponse.json({ error: '表示名は30文字以内にしてください' }, { status: 400 })
    userPatch.display_name = displayName.trim()
  }
  if (snsLinks !== undefined) {
    if (!Array.isArray(snsLinks) || snsLinks.length > 7) return NextResponse.json({ error: 'SNSリンクは7件以内にしてください' }, { status: 400 })
    userPatch.sns_links = snsLinks.filter((s: { id: string }) => s.id?.trim())
  }

  if (Object.keys(userPatch).length > 1) {
    const { error } = await supabase.from('users').update(userPatch).eq('id', user.id)
    if (error) {
      console.error('[profile/update] userError:', error)
      return NextResponse.json({ error: 'ユーザー情報の更新に失敗しました' }, { status: 500 })
    }
  }

  // creator_profiles テーブルの更新
  const profilePatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (displayName !== undefined) profilePatch.display_name = displayName.trim()
  if (creatorTypes !== undefined) profilePatch.creator_type = creatorTypes
  if (bio !== undefined) {
    if (bio.trim().length > 400) return NextResponse.json({ error: '自己紹介は400文字以内にしてください' }, { status: 400 })
    profilePatch.bio = bio.trim() || null
  }
  if (skills !== undefined) {
    if (!Array.isArray(skills) || skills.length > 20) return NextResponse.json({ error: 'スキルは20個以内にしてください' }, { status: 400 })
    if (skills.some((s: unknown) => typeof s !== 'string' || s.length > 50)) return NextResponse.json({ error: 'スキルは1つ50文字以内にしてください' }, { status: 400 })
    profilePatch.skills = skills
  }
  if (priceMin !== undefined) {
    const parsed = priceMin === '' ? null : parseInt(priceMin, 10)
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) return NextResponse.json({ error: '単価は0以上の数値を入力してください' }, { status: 400 })
    profilePatch.price_min = parsed
  }
  if (priceNote !== undefined) {
    if (priceNote.length > 500) return NextResponse.json({ error: '単価補足は500文字以内にしてください' }, { status: 400 })
    profilePatch.price_note = priceNote.trim() || null
  }
  if (deliveryDays !== undefined) {
    if (deliveryDays.length > 30) return NextResponse.json({ error: '納品期間は30文字以内にしてください' }, { status: 400 })
    profilePatch.delivery_days = deliveryDays.trim() || null
  }

  if (Object.keys(profilePatch).length > 1) {
    const { error } = await supabase.from('creator_profiles').update(profilePatch).eq('creator_id', user.id)
    if (error) {
      console.error('[profile/update] profileError:', error)
      return NextResponse.json({ error: 'プロフィールの更新に失敗しました' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
