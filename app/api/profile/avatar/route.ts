import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })

  // Content-Type に "; charset=utf-8" 等が付いていても正しく判定できるよう正規化
  const mimeType = file.type.split(';')[0].trim()
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: 'JPEG・PNG・WebP・GIF のみ対応しています' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'ファイルサイズは2MB以内にしてください' }, { status: 400 })
  }

  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg')
  const path = `${user.id}/avatar.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // Service Role でアップロード（RLS をバイパス）
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('[avatar] upload error:', uploadError)
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)

  // キャッシュバスター付きURLをDBに保存
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateError) {
    console.error('[avatar] update error:', updateError)
    return NextResponse.json({ error: 'プロフィールの更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ avatarUrl })
}
