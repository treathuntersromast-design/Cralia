-- ============================================================
-- CreMatch - Auth Trigger
-- 新規ユーザー登録時に public.users へ自動でレコードを作成する
-- 実行順序: 002_full_schema.sql の後に実行してください
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, roles, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- roles はプロフィール設定画面で後から設定するため、登録時は空配列
    '{}',
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
