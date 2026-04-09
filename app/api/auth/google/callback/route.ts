/**
 * app/api/auth/google/callback/route.ts
 *
 * Step 2: Google から認可コードを受け取り、
 *         access_token / refresh_token に交換して Supabase に保存
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const code = req.nextUrl.searchParams.get('code');
  const creatorId = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error')
  const errorDescription = req.nextUrl.searchParams.get('error_description')

  console.log('callback受信 code:', code ? '取得OK' : 'なし');
  console.log('creator_id:', creatorId);

  // Googleからエラーが返ってきた場合（access_denied, redirect_uri_mismatch等）
  if (oauthError) {
    console.error('Google OAuth error:', oauthError, errorDescription)
    const msg = encodeURIComponent(oauthError === 'access_denied'
      ? 'Googleカレンダーへのアクセスが拒否されました。'
      : `Google認証エラー: ${oauthError}`)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/calendar?cal=error&msg=${msg}`
    )
  }

  if (!code || !creatorId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/calendar?cal=error&msg=${encodeURIComponent('認証コードの取得に失敗しました。')}`
    )
  }

  // トークン交換
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  console.log('トークン取得結果:', tokenRes.ok ? '成功' : '失敗', tokenData.error ?? '');

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', tokenData)
    const msg = encodeURIComponent(`トークン取得に失敗しました: ${tokenData.error ?? 'unknown'}`)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/calendar?cal=error&msg=${msg}`
    )
  }

  const { access_token, refresh_token, expires_in } = tokenData;
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  // Supabaseに保存
  const { error } = await supabase
    .from('creator_tokens')
    .upsert(
      { creator_id: creatorId, access_token, refresh_token: refresh_token ?? null, expires_at: expiresAt },
      { onConflict: 'creator_id' }
    );

  console.log('Supabase保存結果:', error ? '失敗: ' + error.message : '成功');

  if (error) {
    const msg = encodeURIComponent(`DB保存に失敗しました: ${error.message}`)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/calendar?cal=error&msg=${msg}`
    )
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/settings/calendar?cal=connected`
  );
}
