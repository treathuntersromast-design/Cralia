-- ============================================================
-- Cralia - Auth Trigger
-- 新規ユーザー登録時に public.users へ自動でレコードを作成する
-- 実行順序: ddl/master/ → ddl/public/ の後に実行してください
--
-- ■ 変更履歴
--   roles TEXT[] → activity_style_id SMALLINT（m_activity_style）
--   プロフィール設定前は NULL（未設定）とする
-- ============================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, activity_style_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- activity_style_id はプロフィール設定画面で後から選択するため、登録時は NULL
    NULL,
    -- Google OAuth の場合は full_name、メール登録の場合はメールアドレスを使用
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    -- Google OAuth の場合はアバター URL を自動設定
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーがある場合は削除してから再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

COMMIT;
