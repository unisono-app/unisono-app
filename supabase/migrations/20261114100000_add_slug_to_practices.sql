-- 練習詳細ページの URL を日付ベース（例: 2026-11-14、同日が複数なら 2026-11-14-2）にするための slug を追加。
-- 加算的変更のみ: nullable で追加し既存行をバックフィルする。NOT NULL 化は、コードが slug を必ず採番するリリース後に行う。
-- UNIQUE 制約は NULL の重複を許すため、旧コードが slug なしで作成した行があっても衝突しない（アプリ側は slug が NULL なら uuid にフォールバックする）。
alter table practices add column slug text;

with numbered as (
  select
    id,
    practice_date,
    row_number() over (partition by practice_date order by created_at, id) as rn
  from practices
)
update practices p
set slug = to_char(n.practice_date, 'YYYY-MM-DD')
  || case when n.rn > 1 then '-' || n.rn::text else '' end
from numbered n
where p.id = n.id;

alter table practices add constraint practices_slug_key unique (slug);
