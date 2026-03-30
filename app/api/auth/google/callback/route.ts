/**
 * app/api/auth/google/callback/route.ts
 *
 * Step 2: Google から認可コードを受け取り、
 *         access_token / refresh_token に交換して Supabase に保存
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const creatorId = req.nextUrl.searchParams.get('state');

  console.log('callback受信 code:', code ? '取得OK' : 'なし');
  console.log('creator_id:', creatorId);

  if (!code || !creatorId) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
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
    return NextResponse.json({ error: 'Token exchange failed', detail: tokenData }, { status: 500 });
  }

  const { access_token, refresh_token, expires_in } = tokenData;
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  // Supabaseに保存
  const { error } = await supabase
    .from('creator_tokens')
    .upsert(
      { creator_id: creatorId, access_token, refresh_token, expires_at: expiresAt },
      { onConflict: 'creator_id' }
    );

  console.log('Supabase保存結果:', error ? '失敗: ' + error.message : '成功');

  if (error) {
    return NextResponse.json({ error: 'DB save failed', detail: error }, { status: 500 });
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?cal=connected`
  );
}
