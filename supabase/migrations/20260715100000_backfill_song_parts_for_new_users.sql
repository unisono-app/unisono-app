-- ============================================================
-- #8 マイグレーション以後に承認されたユーザーの、既存楽曲への担当パート遡及登録（1回限り）
--   - 現在の全 approved ユーザーを対象に、プロフィール所属パート → 編成パートの対応で登録
--   - 編成にそのパートが含まれる曲のみ（例: Prim が無い Prim1/Prim2 の曲は Prim ユーザー非登録）
--   - 既存登録は保持（ON CONFLICT DO NOTHING）
--   - 「指揮」も part_map に含むため、指揮ユーザーは（全曲に「指揮」があるので）全曲に登録される
-- ============================================================

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
