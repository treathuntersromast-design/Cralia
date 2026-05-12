import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getStripe, PLATFORM_FEE_RATE, CHECKOUT_TTL_SECONDS, TRANSFER_FEE } from '@/lib/stripe'
import { PAYMENT_STATUS } from '@/lib/constants/statuses'
import { VALIDATION } from '@/lib/constants/validation'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: { project_id?: unknown }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'リクエスト形式が不正です' }, { status: 400 }) }

  const { project_id } = body
  if (!project_id || typeof project_id !== 'string') {
    return NextResponse.json({ error: 'project_id が必要です' }, { status: 400 })
  }

  const db = getDb()

  // project 取得・依頼者検証
  const { data: project } = await db
    .from('projects')
    .select('id, title, budget, client_id, creator_id, status')
    .eq('id', project_id)
    .single()

  if (!project) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
  if (project.client_id !== user.id) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const projectAmount = project.budget
  if (!projectAmount || projectAmount <= 0) {
    return NextResponse.json({ error: '依頼の金額が設定されていません' }, { status: 400 })
  }
  if (projectAmount < VALIDATION.MIN_PROJECT_BUDGET) {
    return NextResponse.json(
      { error: `依頼金額は最低${VALIDATION.MIN_PROJECT_BUDGET}円以上に設定してください（振込手数料${TRANSFER_FEE}円のため）` },
      { status: 400 }
    )
  }

  // 二重決済防止: active payment が存在するか確認
  const { data: existingPayments } = await db
    .from('payments')
    .select('id, status, stripe_checkout_session_id, checkout_expires_at')
    .eq('project_id', project_id)
    .in('status', [
      PAYMENT_STATUS.PENDING,
      PAYMENT_STATUS.HELD,
      PAYMENT_STATUS.PAYOUT_PENDING,
      PAYMENT_STATUS.PAYOUT_PAID,
    ])
    .order('created_at', { ascending: false })
    .limit(1)

  const existing = existingPayments?.[0]

  if (existing) {
    // pending かつ Checkout セッションが有効なら URL を再返却
    if (existing.status === PAYMENT_STATUS.PENDING && existing.stripe_checkout_session_id) {
      try {
        const session = await getStripe().checkout.sessions.retrieve(existing.stripe_checkout_session_id)
        if (session.status === 'open' && session.url) {
          return NextResponse.json({ url: session.url })
        }
        // セッションが open でなければ expired に更新して新規作成へ
        await db.from('payments').update({ status: PAYMENT_STATUS.EXPIRED }).eq('id', existing.id)
      } catch {
        // Stripe 取得失敗は無視して新規作成へ
      }
    } else {
      return NextResponse.json(
        { error: 'この依頼はすでに決済処理中または完了済みです' },
        { status: 409 }
      )
    }
  }

  const amount = projectAmount
  const fee    = Math.round(amount * PLATFORM_FEE_RATE)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const expiresAt = Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS

  // payment レコード作成（pending）
  const { data: payment, error: insErr } = await db
    .from('payments')
    .insert({
      project_id,
      amount,
      fee,
      currency: 'jpy',
      status: PAYMENT_STATUS.PENDING,
    })
    .select('id')
    .single()

  if (insErr || !payment) {
    return NextResponse.json({ error: '決済の準備に失敗しました' }, { status: 500 })
  }

  // Stripe Checkout Session 作成
  const stripeClient = getStripe()
  let session: Awaited<ReturnType<typeof stripeClient.checkout.sessions.create>>
  try {
    session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          unit_amount: amount,
          product_data: { name: project.title ?? '検収後支払い' },
        },
        quantity: 1,
      }],
      mode: 'payment',
      expires_at: expiresAt,
      success_url: `${appUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/payments/cancel?project_id=${project_id}`,
      metadata: { payment_id: payment.id, project_id },
    })
  } catch (e) {
    // Checkout Session 作成失敗時は payment を failed に更新
    await db.from('payments').update({ status: PAYMENT_STATUS.FAILED }).eq('id', payment.id)
    console.error('[create-checkout] Stripe session creation failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Stripe セッションの作成に失敗しました' }, { status: 500 })
  }

  // session_id / checkout_expires_at を payment に保存
  await db.from('payments').update({
    stripe_checkout_session_id: session.id,
    checkout_expires_at: new Date(expiresAt * 1000).toISOString(),
  }).eq('id', payment.id)

  return NextResponse.json({ url: session.url })
}
