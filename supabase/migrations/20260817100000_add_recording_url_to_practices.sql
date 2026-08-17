-- 練習ごとの録音（Google ドライブ共有リンク）を保持するカラムを追加。
-- 任意入力（nullable）。RLS は practices 既存ポリシー（member 以上が更新可）でカバーされる。
alter table practices add column recording_url text;
