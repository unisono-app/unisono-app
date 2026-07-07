-- ============================================================
-- 既存曲データの一括正規化 + 遡及的なメンバーパート自動登録（公開直後の1回限り）
--   1) 編成 null の曲にデフォルト編成を設定
--   2) song_user_parts の旧パート名をリネーム（Contrabass G./Guitarron→CG, Alto Cembalo→A.Cem.）
--   3) songs.arrangements を正規化（同リネーム + 重複排除、順序は初出順を維持）
--   4) 全曲の編成に「指揮」を追加（未追加のもののみ）
--   5) 念のため: 編成に Prim が無い曲の Prim 登録を除去（整合性の保険。通常は該当なし）
--   6) 遡及自動登録: 承認メンバーをプロフィールパート→編成パートで登録
--      （編成に存在するパートのみ・既存登録は上書きしない = ON CONFLICT DO NOTHING）
--      → 編成に Prim が無い曲（Prim1/Prim2 の曲）では Prim の人は未登録のまま
-- ============================================================

-- 1) 編成 null の曲にデフォルト編成を設定
update songs
set arrangements = '["Alto1","Alto2","Prim","A.Cem.","Bass","CG","指揮"]'::jsonb
where arrangements is null;

-- 2) 既存の登録パート名をリネーム（登録は削除せず引き継ぐ）
update song_user_parts set part = 'CG'     where part in ('Contrabass G.', 'Guitarron');
update song_user_parts set part = 'A.Cem.' where part = 'Alto Cembalo';

-- 3) 編成（arrangements）の正規化 + 重複排除（初出順を維持）
update songs s
set arrangements = t.new_arr
from (
  select
    s2.id,
    (
      select jsonb_agg(elem order by first_ord)
      from (
        select mapped as elem, min(ord) as first_ord
        from (
          select
            case el
              when 'Contrabass G.' then 'CG'
              when 'Guitarron'     then 'CG'
              when 'Alto Cembalo'  then 'A.Cem.'
              else el
            end as mapped,
            ord
          from jsonb_array_elements_text(s2.arrangements)
            with ordinality as a(el, ord)
        ) mapped_elems
        group by mapped
      ) deduped
    ) as new_arr
  from songs s2
  where s2.arrangements is not null
) t
where s.id = t.id;

-- 4) 全曲の編成に「指揮」を追加（未追加のもののみ）
update songs
set arrangements = arrangements || '["指揮"]'::jsonb
where arrangements is not null
  and not (arrangements ? '指揮');

-- 5) 編成に Prim が無い曲の Prim 登録を除去（保険・通常は該当なし）
delete from song_user_parts sup
using songs s
where sup.song_id = s.id
  and sup.part = 'Prim'
  and not (s.arrangements ? 'Prim');

-- 6) 遡及自動登録（正規化後の編成に対して）
with part_map(profile_part, song_part) as (
  values
    ('1st', 'Alto1'),
    ('2nd', 'Alto2'),
    ('Prim', 'Prim'),
    ('A.cem.', 'A.Cem.'),
    ('Bass', 'Bass'),
    ('CG', 'CG'),
    ('指揮', '指揮')
)
insert into song_user_parts (song_id, user_id, part)
select s.id, u.id, m.song_part
from songs s
join users u on u.approval_status = 'approved'
join part_map m on m.profile_part = u.part
where s.arrangements ? m.song_part
on conflict (song_id, user_id) do nothing;
