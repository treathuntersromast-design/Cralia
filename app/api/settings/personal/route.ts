import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // entity_type を users テーブルから同時取得
  const [{ data, error }, { data: userData }] = await Promise.all([
    supabase.from('user_personal_info').select('*').eq('user_id', user.id).single(),
    supabase.from('users').select('entity_type').eq('id', user.id).single(),
  ])

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? null, entityType: userData?.entity_type ?? 'individual' })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const realName        = typeof body.realName        === 'string' ? body.realName        : null
  const companyName     = typeof body.companyName     === 'string' ? body.companyName     : null
  const postalCode      = typeof body.postalCode      === 'string' ? body.postalCode      : null
  const prefecture      = typeof body.prefecture      === 'string' ? body.prefecture      : null
  const address         = typeof body.address         === 'string' ? body.address         : null
  const phoneNumber     = typeof body.phoneNumber     === 'string' ? body.phoneNumber     : null
  const corporateNumber = typeof body.corporateNumber === 'string' ? body.corporateNumber : null
  const invoiceNumber   = typeof body.invoiceNumber   === 'string' ? body.invoiceNumber   : null

  if (realName    && realName.trim().length    > 100) return NextResponse.json({ error: '氏名は100文字以内にしてください' }, { status: 400 })
  if (companyName && companyName.trim().length > 100) return NextResponse.json({ error: '会社名は100文字以内にしてください' }, { status: 400 })
  if (address     && address.trim().length     > 200) return NextResponse.json({ error: '住所は200文字以内にしてください' }, { status: 400 })

  // 法人番号: 13桁の数字
  const corpNum = corporateNumber?.replace(/\D/g, '') ?? ''
  if (corporateNumber && corporateNumber.trim() !== '' && !/^[0-9]{13}$/.test(corpNum)) {
    return NextResponse.json({ error: '法人番号は13桁の数字で入力してください' }, { status: 400 })
  }

  // インボイス番号: T + 13桁
  const invNum = invoiceNumber?.trim() ?? ''
  if (invNum !== '' && !/^T[0-9]{13}$/.test(invNum)) {
    return NextResponse.json({ error: 'インボイス登録番号は「T」＋13桁の数字で入力してください（例: T1234567890123）' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_personal_info')
    .upsert({
      user_id:          user.id,
      real_name:        realName?.trim()        ?? null,
      company_name:     companyName?.trim()     ?? null,
      postal_code:      postalCode?.trim()      ?? null,
      prefecture:       prefecture?.trim()      ?? null,
      address:          address?.trim()         ?? null,
      phone_number:     phoneNumber?.trim()     ?? null,
      corporate_number: corpNum !== '' ? corpNum : null,
      invoice_number:   invNum !== '' ? invNum  : null,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    // カラムが未追加の場合のフォールバック（007マイグレーション前）
    if (error.code === '42703') {
      const { error: e2 } = await supabase
        .from('user_personal_info')
        .upsert({
          user_id:      user.id,
          real_name:    realName?.trim()    ?? null,
          company_name: companyName?.trim() ?? null,
          postal_code:  postalCode?.trim()  ?? null,
          prefecture:   prefecture?.trim()  ?? null,
          address:      address?.trim()     ?? null,
          phone_number: phoneNumber?.trim() ?? null,
          updated_at:   new Date().toISOString(),
        }, { onConflict: 'user_id' })
      if (e2) return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
      return NextResponse.json({ success: true, warning: 'corporate_number/invoice_number は未反映です（マイグレーション007を実行してください）' })
    }
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
