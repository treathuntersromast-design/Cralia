-- ============================================================
-- Cralia テスト用アカウント & シードデータ
--
-- 【実行前チェック】
--   SELECT id, email FROM auth.users WHERE email LIKE '%@cralia-test.com';
--   → 0件であることを確認してから実行
--
-- 【実行環境】
--   Supabase ダッシュボード > SQL Editor (service_role 権限)
--
-- 【共通パスワード】
--   CraliaTest2026!
--
-- 【テストアカウント一覧】
--   TC-U01  client01@cralia-test.com   依頼者（個人）
--   TC-U02  creator01@cralia-test.com  クリエイター（個人）
--   TC-U03  both01@cralia-test.com     依頼者 + クリエイター（個人）
--   TC-U04  corporate01@cralia-test.com 依頼者（法人）
--   TC-U05  admin@cralia-test.com      管理者
--
-- 【エスクロー用 UUID 参照】
--   TC-U01: 11111111-0001-0001-0001-000000000001
--   TC-U02: 22222222-0002-0002-0002-000000000002
--   TC-U03: 33333333-0003-0003-0003-000000000003
--   TC-U04: 44444444-0004-0004-0004-000000000004
--   TC-U05: 55555555-0005-0005-0005-000000000005
--
-- 【注意】
--   admin@cralia-test.com を管理者として使うには
--   .env.local に ADMIN_EMAILS=admin@cralia-test.com を追加すること
--
-- 【実行後確認クエリ】（末尾参照）
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1: auth.users にテストユーザーを作成
-- ============================================================

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
VALUES

-- TC-U01: 依頼者（個人）
(
  '11111111-0001-0001-0001-000000000001'::uuid,
  'authenticated', 'authenticated',
  'client01@cralia-test.com',
  crypt('CraliaTest2026!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "テスト依頼者01"}',
  NOW(), NOW()
),

-- TC-U02: クリエイター（個人）
(
  '22222222-0002-0002-0002-000000000002'::uuid,
  'authenticated', 'authenticated',
  'creator01@cralia-test.com',
  crypt('CraliaTest2026!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "テストクリエイター01"}',
  NOW(), NOW()
),

-- TC-U03: 両方（依頼者 & クリエイター）
(
  '33333333-0003-0003-0003-000000000003'::uuid,
  'authenticated', 'authenticated',
  'both01@cralia-test.com',
  crypt('CraliaTest2026!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "テスト両方01"}',
  NOW(), NOW()
),

-- TC-U04: 企業依頼者
(
  '44444444-0004-0004-0004-000000000004'::uuid,
  'authenticated', 'authenticated',
  'corporate01@cralia-test.com',
  crypt('CraliaTest2026!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "テスト法人01"}',
  NOW(), NOW()
),

-- TC-U05: 管理者
(
  '55555555-0005-0005-0005-000000000005'::uuid,
  'authenticated', 'authenticated',
  'admin@cralia-test.com',
  crypt('CraliaTest2026!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "テスト管理者"}',
  NOW(), NOW()
)

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SECTION 2: public.users を更新（トリガーで作成済みのレコードを補完）
-- ============================================================

UPDATE public.users SET
  activity_style_id = 2,          -- 依頼者
  entity_type       = 'individual',
  display_id        = '10000001',
  client_type       = ARRAY['youtuber'],
  terms_agreed_at   = NOW()
WHERE id = '11111111-0001-0001-0001-000000000001';

UPDATE public.users SET
  activity_style_id = 1,          -- クリエイター
  entity_type       = 'individual',
  display_id        = '10000002',
  terms_agreed_at   = NOW()
WHERE id = '22222222-0002-0002-0002-000000000002';

UPDATE public.users SET
  activity_style_id = 3,          -- 両方
  entity_type       = 'individual',
  display_id        = '10000003',
  client_type       = ARRAY['vtuber'],
  terms_agreed_at   = NOW()
WHERE id = '33333333-0003-0003-0003-000000000003';

UPDATE public.users SET
  activity_style_id = 2,          -- 依頼者
  entity_type       = 'corporate',
  display_id        = '10000004',
  client_type       = ARRAY['corporate'],
  terms_agreed_at   = NOW()
WHERE id = '44444444-0004-0004-0004-000000000004';

UPDATE public.users SET
  activity_style_id = 2,
  entity_type       = 'individual',
  display_id        = '10000005',
  terms_agreed_at   = NOW()
WHERE id = '55555555-0005-0005-0005-000000000005';


-- ============================================================
-- SECTION 3: creator_profiles（クリエイター / 両方アカウント）
-- ============================================================

INSERT INTO public.creator_profiles (
  creator_id, display_name, creator_type, skills, bio,
  price_min, price_note, delivery_days, availability,
  pricing_plans, registered_at
)
VALUES

-- TC-U02: クリエイター
(
  '22222222-0002-0002-0002-000000000002',
  'テストクリエイター01',
  ARRAY['イラストレーター', 'デザイナー'],
  ARRAY['キャラデザ', 'サムネイル制作', 'ロゴ制作'],
  'テスト用アカウントです。イラスト・デザインを担当します。依頼フローのテストに使用してください。',
  5000,
  '5,000円〜。詳細はご相談ください。',
  '7〜14営業日',
  'open',
  '[
    {"name": "ライトプラン", "price": 5000,  "description": "アイコン1点", "delivery_days": 7},
    {"name": "スタンダード", "price": 15000, "description": "キャラデザ1体", "delivery_days": 14}
  ]'::jsonb,
  NOW()
),

-- TC-U03: 両方（クリエイター側プロフィール）
(
  '33333333-0003-0003-0003-000000000003',
  'テスト両方01',
  ARRAY['動画編集者'],
  ARRAY['動画編集', 'MV制作', 'サムネイル制作'],
  'クリエイターと依頼者両方のテスト用アカウントです。',
  8000,
  '8,000円〜',
  '5〜10営業日',
  'one_slot',
  '[
    {"name": "ショート動画", "price": 8000, "description": "60秒以内", "delivery_days": 5}
  ]'::jsonb,
  NOW()
)

ON CONFLICT (creator_id) DO NOTHING;


-- ============================================================
-- SECTION 4: user_personal_info（エスクロー決済のための住所情報）
-- ============================================================

INSERT INTO public.user_personal_info (
  user_id, full_name, postal_code, prefecture, city, address_line,
  phone, created_at, updated_at
)
VALUES

-- TC-U01（依頼者）
(
  '11111111-0001-0001-0001-000000000001',
  'テスト 依頼太郎',
  '1000001', '東京都', '千代田区', '千代田1-1-1',
  '0300000001',
  NOW(), NOW()
),

-- TC-U04（企業依頼者）
(
  '44444444-0004-0004-0004-000000000004',
  'テスト 法人一郎',
  '1000002', '東京都', '港区', '港2-2-2',
  '0300000002',
  NOW(), NOW()
)

ON CONFLICT (user_id) DO NOTHING;


-- ============================================================
-- SECTION 5: job_listings（案件掲示板のテストデータ）
-- ============================================================

INSERT INTO public.job_listings (
  id, client_id, title, description,
  creator_types, order_type, budget_min, budget_max,
  deadline, status, created_at
)
VALUES

-- 有償案件
(
  'aaaaaaaa-0001-0001-0001-000000000001'::uuid,
  '11111111-0001-0001-0001-000000000001',
  '【テスト】MVイラスト制作募集',
  'テスト用案件です。ボカロ曲のMVに使用するイラストを募集します。
キャラクターは当方で用意します。背景・エフェクトの描き起こしをお願いします。
サイズ: 1920x1080px / PNG納品',
  ARRAY['イラストレーター'],
  'paid',
  10000, 30000,
  (NOW() + INTERVAL '30 days')::date,
  'open',
  NOW()
),

-- 無償案件
(
  'aaaaaaaa-0002-0002-0002-000000000002'::uuid,
  '11111111-0001-0001-0001-000000000001',
  '【テスト】配信用ロゴ制作（無償）',
  'テスト用無償案件です。配信活動に使用するチャンネルロゴの制作をお願いします。
クレジット表記あり・ポートフォリオ掲載OK。',
  ARRAY['デザイナー', 'イラストレーター'],
  'free',
  NULL, NULL,
  NULL,
  'open',
  NOW()
)

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SECTION 6: projects（依頼フロー / エスクロー用テストデータ）
-- ============================================================

-- P-001: in_progress（進行中 → エスクロー held 状態を確認）
INSERT INTO public.projects (
  id, client_id, creator_id, title, description,
  budget, deadline, order_type, status,
  portfolio_allowed, created_at, updated_at
)
VALUES (
  'bbbbbbbb-0001-0001-0001-000000000001'::uuid,
  '11111111-0001-0001-0001-000000000001',
  '22222222-0002-0002-0002-000000000002',
  '【テスト】アイコン制作（進行中）',
  'テスト用依頼です。著作権: 利用許諾。ポートフォリオ掲載: 可。',
  10000,
  (NOW() + INTERVAL '14 days')::date,
  'paid',
  'in_progress',
  true,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- P-002: delivered（納品済み → 検収・エスクロー解放待ち）
INSERT INTO public.projects (
  id, client_id, creator_id, title, description,
  budget, deadline, order_type, status,
  portfolio_allowed, created_at, updated_at
)
VALUES (
  'bbbbbbbb-0002-0002-0002-000000000002'::uuid,
  '11111111-0001-0001-0001-000000000001',
  '22222222-0002-0002-0002-000000000002',
  '【テスト】サムネイル制作（納品済み）',
  'テスト用依頼です。著作権: 著作権譲渡。ポートフォリオ掲載: 不可。',
  15000,
  (NOW() + INTERVAL '3 days')::date,
  'paid',
  'delivered',
  false,
  NOW() - INTERVAL '10 days', NOW()
)
ON CONFLICT (id) DO NOTHING;

-- P-003: disputed（紛争中 → 管理者介入テスト用）
INSERT INTO public.projects (
  id, client_id, creator_id, title, description,
  budget, deadline, order_type, status,
  portfolio_allowed, created_at, updated_at
)
VALUES (
  'bbbbbbbb-0003-0003-0003-000000000003'::uuid,
  '44444444-0004-0004-0004-000000000004',
  '22222222-0002-0002-0002-000000000002',
  '【テスト】動画制作（紛争中）',
  'テスト用紛争案件です。管理者介入フローの確認に使用してください。',
  50000,
  NOW()::date,
  'paid',
  'disputed',
  false,
  NOW() - INTERVAL '20 days', NOW()
)
ON CONFLICT (id) DO NOTHING;

-- P-004: completed（完了 → レビュー投稿フローのテスト用）
INSERT INTO public.projects (
  id, client_id, creator_id, title, description,
  budget, deadline, order_type, status,
  portfolio_allowed, created_at, updated_at
)
VALUES (
  'bbbbbbbb-0004-0004-0004-000000000004'::uuid,
  '11111111-0001-0001-0001-000000000001',
  '22222222-0002-0002-0002-000000000002',
  '【テスト】ロゴ制作（完了済み）',
  'テスト用完了依頼です。レビュー投稿・評価フローの確認に使用してください。',
  8000,
  NOW()::date - 5,
  'paid',
  'completed',
  true,
  NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SECTION 7: payments（エスクロー決済テストデータ）
-- ============================================================

-- P-001 に対する held 状態（エスクロー預り中）
INSERT INTO public.payments (
  id, project_id, amount, fee, status, created_at, updated_at
)
VALUES (
  'cccccccc-0001-0001-0001-000000000001'::uuid,
  'bbbbbbbb-0001-0001-0001-000000000001',
  10000, 500,  -- 金額 ¥10,000 / プラットフォーム手数料 ¥500
  'held',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- P-002 に対する held 状態（検収待ち → released にする前の状態）
INSERT INTO public.payments (
  id, project_id, amount, fee, status, created_at, updated_at
)
VALUES (
  'cccccccc-0002-0002-0002-000000000002'::uuid,
  'bbbbbbbb-0002-0002-0002-000000000002',
  15000, 750,
  'held',
  NOW() - INTERVAL '10 days', NOW()
)
ON CONFLICT (id) DO NOTHING;

-- P-003 に対する held 状態（紛争中 → 保留）
INSERT INTO public.payments (
  id, project_id, amount, fee, status, created_at, updated_at
)
VALUES (
  'cccccccc-0003-0003-0003-000000000003'::uuid,
  'bbbbbbbb-0003-0003-0003-000000000003',
  50000, 2500,
  'held',
  NOW() - INTERVAL '20 days', NOW()
)
ON CONFLICT (id) DO NOTHING;

-- P-004 に対する released 状態（完了 → クリエイターへ支払い済み）
INSERT INTO public.payments (
  id, project_id, amount, fee, status, created_at, updated_at
)
VALUES (
  'cccccccc-0004-0004-0004-000000000004'::uuid,
  'bbbbbbbb-0004-0004-0004-000000000004',
  8000, 400,
  'released',
  NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'
)
ON CONFLICT (id) DO NOTHING;


COMMIT;


-- ============================================================
-- 【実行後確認クエリ】
-- ============================================================
/*
-- アカウント確認
SELECT u.id, u.display_id, u.display_name, u.activity_style_id, u.entity_type
FROM public.users u
WHERE u.id IN (
  '11111111-0001-0001-0001-000000000001',
  '22222222-0002-0002-0002-000000000002',
  '33333333-0003-0003-0003-000000000003',
  '44444444-0004-0004-0004-000000000004',
  '55555555-0005-0005-0005-000000000005'
);

-- クリエイタープロフィール確認
SELECT creator_id, display_name, creator_type, availability
FROM public.creator_profiles
WHERE creator_id IN (
  '22222222-0002-0002-0002-000000000002',
  '33333333-0003-0003-0003-000000000003'
);

-- 案件確認
SELECT id, title, status, order_type, budget_min, budget_max
FROM public.job_listings
WHERE client_id = '11111111-0001-0001-0001-000000000001';

-- 依頼 & 支払い確認
SELECT p.id, p.title, p.status, py.amount, py.fee, py.status AS payment_status
FROM public.projects p
LEFT JOIN public.payments py ON py.project_id = p.id
ORDER BY p.created_at DESC;
*/
