-- ヘルスチェック / Supabase 休止防止用の軽量 ping 関数。
-- 'ok' を返すのみでテーブルには触れないため RLS は不要。
-- API(anon)から呼び出せるよう execute 権限を付与する。
create or replace function public.ping()
returns text
language sql
stable
set search_path = ''
as $$ select 'ok'::text $$;

grant execute on function public.ping() to anon, authenticated;
