-- ============================================================
-- プロフィールのパートを任意入力化 + 楽曲ごとのメンバーパート登録
-- ============================================================

-- 1) users.part を任意入力に変更（未設定を許容）
--    自己更新RLS(harden_users_update_rls)は `is not distinct from` 比較で
--    NULL安全のため、この変更による影響はない。
alter table users alter column part drop not null;

-- 2) song_user_parts（楽曲ごとの各メンバーのパート登録）
--    1曲につき1メンバー1パート（unique で保証）。
--    part 値は songs.arrangements（編成リスト）内から選ぶ運用（アプリ側で検証）。
create table song_user_parts (
  id         uuid primary key default gen_random_uuid(),
  song_id    uuid not null references songs(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  part       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (song_id, user_id)
);

create index song_user_parts_song_id_idx on song_user_parts(song_id);

create trigger set_updated_at before update on song_user_parts
  for each row execute function update_updated_at();

-- RLS: 閲覧は承認メンバー全員、書き込みは自身の行のみ（practice_attendances と同方針）
alter table song_user_parts enable row level security;

create policy "member以上は全件閲覧可"
  on song_user_parts for select
  using (is_approved_member());

create policy "自身のパートのみ作成可"
  on song_user_parts for insert
  with check (auth.uid() = user_id and is_approved_member());

create policy "自身のパートのみ更新可"
  on song_user_parts for update
  using (auth.uid() = user_id and is_approved_member());

create policy "自身のパートのみ削除可"
  on song_user_parts for delete
  using (auth.uid() = user_id and is_approved_member());
