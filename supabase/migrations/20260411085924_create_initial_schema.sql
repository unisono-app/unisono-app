-- ============================================================
-- UnisOno 初期スキーマ
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enum 定義
-- ------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('provisional_member', 'member', 'admin');
CREATE TYPE approval_status AS ENUM ('pending', 'approved');
CREATE TYPE attendance_status AS ENUM ('attending', 'undecided', 'absent');

-- ------------------------------------------------------------
-- 2. テーブル作成
-- ------------------------------------------------------------

-- users（ユーザー）
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_uid        text UNIQUE NOT NULL,
  display_name    text NOT NULL,
  avatar_url      text,
  nickname        text NOT NULL,
  family_name     text NOT NULL,
  given_name      text NOT NULL,
  old_family_name text,
  part            text NOT NULL,
  class_label     text NOT NULL,
  affiliation     text NOT NULL,
  role            user_role NOT NULL DEFAULT 'provisional_member',
  approval_status approval_status NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- practices（練習）
CREATE TABLE practices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  practice_date  date NOT NULL,
  time_range     text NOT NULL,
  location       text NOT NULL,
  deadline       timestamptz,
  notes          text,
  schedule       jsonb,
  content        jsonb,
  created_by     uuid NOT NULL REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- practice_attendances（出欠）
CREATE TABLE practice_attendances (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id),
  user_id      uuid NOT NULL REFERENCES users(id),
  status       attendance_status NOT NULL,
  note         text,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (practice_id, user_id)
);

-- practice_comments（練習コメント）
CREATE TABLE practice_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id),
  user_id      uuid NOT NULL REFERENCES users(id),
  is_anonymous boolean NOT NULL DEFAULT false,
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- songs（楽曲）
CREATE TABLE songs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  composer      text,
  arranger      text,
  year          int,
  score_url     text,
  arrangements  jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- song_performances（楽曲演奏履歴）
CREATE TABLE song_performances (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id  uuid NOT NULL REFERENCES songs(id),
  year     int NOT NULL,
  event    text NOT NULL
);

-- practice_songs（練習×楽曲 中間テーブル）
CREATE TABLE practice_songs (
  practice_id uuid REFERENCES practices(id),
  song_id     uuid REFERENCES songs(id),
  PRIMARY KEY (practice_id, song_id)
);

-- annual_schedules（年間スケジュール）
CREATE TABLE annual_schedules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year       int UNIQUE NOT NULL,
  pdf_url    text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- annual_schedule_comments（年間スケジュールコメント）
CREATE TABLE annual_schedule_comments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_schedule_id   uuid NOT NULL REFERENCES annual_schedules(id),
  user_id              uuid NOT NULL REFERENCES users(id),
  is_anonymous         boolean NOT NULL DEFAULT false,
  body                 text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. ヘルパー関数: 「承認済み member 以上か」判定
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_approved_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('member', 'admin')
      AND approval_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND approval_status = 'approved'
  );
$$;

-- ------------------------------------------------------------
-- 4. updated_at 自動更新トリガー
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON practices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON practice_attendances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON annual_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- 5. RLS 有効化
-- ------------------------------------------------------------

ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attendances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_performances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_songs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_schedules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_schedule_comments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 6. RLS ポリシー
-- ------------------------------------------------------------

-- === users ===

CREATE POLICY "member以上は全員閲覧可"
  ON users FOR SELECT
  USING (is_approved_member());

CREATE POLICY "認証済みユーザーが自身のレコードを作成"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "自身のプロフィールを更新可"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND approval_status = (SELECT approval_status FROM users WHERE id = auth.uid())
  );

CREATE POLICY "member以上はapproval_statusを変更可"
  ON users FOR UPDATE
  USING (is_approved_member())
  WITH CHECK (
    role = (SELECT role FROM users WHERE id = users.id)
  );

CREATE POLICY "adminはroleを変更可"
  ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (true);

-- === practices ===

CREATE POLICY "member以上は全件閲覧可"
  ON practices FOR SELECT
  USING (is_approved_member());

CREATE POLICY "member以上が作成可"
  ON practices FOR INSERT
  WITH CHECK (is_approved_member());

CREATE POLICY "member以上が更新可"
  ON practices FOR UPDATE
  USING (is_approved_member());

CREATE POLICY "adminのみ削除可"
  ON practices FOR DELETE
  USING (is_admin());

-- === practice_attendances ===

CREATE POLICY "member以上は全件閲覧可"
  ON practice_attendances FOR SELECT
  USING (is_approved_member());

CREATE POLICY "自身の出欠のみ作成可"
  ON practice_attendances FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_approved_member());

CREATE POLICY "自身の出欠のみ更新可"
  ON practice_attendances FOR UPDATE
  USING (auth.uid() = user_id AND is_approved_member());

-- === practice_comments ===

CREATE POLICY "member以上は全件閲覧可"
  ON practice_comments FOR SELECT
  USING (is_approved_member());

CREATE POLICY "member以上が投稿可"
  ON practice_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_approved_member());

CREATE POLICY "投稿者本人またはadminが削除可"
  ON practice_comments FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- === songs ===

CREATE POLICY "member以上は全件閲覧可"
  ON songs FOR SELECT
  USING (is_approved_member());

CREATE POLICY "member以上が作成可"
  ON songs FOR INSERT
  WITH CHECK (is_approved_member());

CREATE POLICY "member以上が更新可"
  ON songs FOR UPDATE
  USING (is_approved_member());

CREATE POLICY "adminのみ削除可"
  ON songs FOR DELETE
  USING (is_admin());

-- === song_performances ===

CREATE POLICY "member以上は全件閲覧可"
  ON song_performances FOR SELECT
  USING (is_approved_member());

CREATE POLICY "member以上が作成可"
  ON song_performances FOR INSERT
  WITH CHECK (is_approved_member());

CREATE POLICY "member以上が更新可"
  ON song_performances FOR UPDATE
  USING (is_approved_member());

CREATE POLICY "member以上が削除可"
  ON song_performances FOR DELETE
  USING (is_approved_member());

-- === practice_songs ===

CREATE POLICY "member以上は全件閲覧可"
  ON practice_songs FOR SELECT
  USING (is_approved_member());

CREATE POLICY "member以上が作成可"
  ON practice_songs FOR INSERT
  WITH CHECK (is_approved_member());

CREATE POLICY "member以上が削除可"
  ON practice_songs FOR DELETE
  USING (is_approved_member());

-- === annual_schedules ===

CREATE POLICY "member以上は全件閲覧可"
  ON annual_schedules FOR SELECT
  USING (is_approved_member());

CREATE POLICY "adminのみ作成可"
  ON annual_schedules FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "adminのみ更新可"
  ON annual_schedules FOR UPDATE
  USING (is_admin());

-- === annual_schedule_comments ===

CREATE POLICY "member以上は全件閲覧可"
  ON annual_schedule_comments FOR SELECT
  USING (is_approved_member());

CREATE POLICY "member以上が投稿可"
  ON annual_schedule_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_approved_member());

CREATE POLICY "投稿者本人またはadminが削除可"
  ON annual_schedule_comments FOR DELETE
  USING (auth.uid() = user_id OR is_admin());
