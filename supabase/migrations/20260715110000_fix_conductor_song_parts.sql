-- ============================================================
-- プロフィール所属パートが「指揮」のユーザーの、楽曲編成パートを「指揮」に是正（1回限り）
--   背景: #8 のバックフィルは ON CONFLICT DO NOTHING のため、#8 時点で別パート（例: Alto2）
--         で登録された後にプロフィールを「指揮」へ変更したユーザーの登録が更新されなかった。
--   対応: 既存登録を「指揮」に UPDATE し、未登録の曲があれば「指揮」で追加登録する。
--   条件: 編成に「指揮」が含まれる曲のみ（全曲に「指揮」あり）。
-- ============================================================

-- 1) 既存登録を「指揮」に是正（別パートで登録されている行を更新）
update song_user_parts sup
set part = '指揮'
from users u
where sup.user_id = u.id
  and u.approval_status = 'approved'
  and u.part = '指揮'
  and sup.part <> '指揮'
  and exists (
    select 1 from songs s
    where s.id = sup.song_id and s.arrangements ? '指揮'
  );

-- 2) 未登録の曲があれば「指揮」で追加（通常は該当なし・堅牢性のため）
insert into song_user_parts (song_id, user_id, part)
select s.id, u.id, '指揮'
from songs s
join users u on u.approval_status = 'approved' and u.part = '指揮'
where s.arrangements ? '指揮'
on conflict (song_id, user_id) do nothing;
