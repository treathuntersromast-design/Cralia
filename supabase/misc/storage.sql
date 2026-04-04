-- ============================================================
-- CreMatch - Storage バケット設定
-- Supabase Dashboard > Storage で手動作成してください
-- ============================================================

-- ※ Supabase の Storage バケットは SQL では作成できません。
--    以下の手順でダッシュボードから作成してください。
--
-- 【avatars バケット】
--   Bucket name : avatars
--   Public      : ON（公開バケット）
--   用途        : ユーザーアバター画像
--
-- 【portfolios バケット】（将来実装予定）
--   Bucket name : portfolios
--   Public      : ON
--   用途        : ポートフォリオ用画像・ファイル
--
-- ============================================================
-- RLS ポリシー（Storage オブジェクト）
-- Supabase Dashboard > Storage > Policies で設定してください
-- ============================================================

-- avatars: 全ユーザーが閲覧可能 / 本人のみアップロード・削除可
-- 以下のポリシーを storage.objects テーブルに適用してください

-- SELECT（公開閲覧）
-- CREATE POLICY "avatars_public_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'avatars');

-- INSERT（本人のみアップロード）
-- CREATE POLICY "avatars_own_upload" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- DELETE（本人のみ削除）
-- CREATE POLICY "avatars_own_delete" ON storage.objects
--   FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
