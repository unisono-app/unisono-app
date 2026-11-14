-- アンケートの作成・編集を 1 トランザクションで行う RPC（新規関数のみの加算的変更）。
-- SECURITY INVOKER: 呼び出しユーザーの権限（RLS）で実行される。
-- 途中で失敗すると全体がロールバックされるため、「日付なしのアンケートが残る」
-- 「一部の変更だけが反映される」状態にならない。
-- p_dates: [{"candidate_date": "YYYY-MM-DD", "is_priority": true | false}, ...]
--   実在しない日付（2026-02-31 など）は date への変換エラーになりロールバックされる。

-- 作成（= 集計開始）。公開終了前のアンケートがあると部分 UNIQUE インデックス違反（23505）になる。
create or replace function create_practice_survey(p_title text, p_dates jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  if btrim(coalesce(p_title, '')) = '' then
    raise exception 'title is required';
  end if;
  if jsonb_typeof(p_dates) is distinct from 'array' or jsonb_array_length(p_dates) = 0 then
    raise exception 'dates are required';
  end if;

  insert into practice_surveys (title, created_by)
  values (btrim(p_title), auth.uid())
  returning id into v_id;

  insert into practice_survey_dates (survey_id, candidate_date, is_priority)
  select v_id, e.candidate_date, coalesce(e.is_priority, false)
  from jsonb_to_recordset(p_dates) as e(candidate_date date, is_priority boolean);

  return v_id;
end;
$$;

-- 集計中のアンケートの編集（タイトル・候補日）。
-- 渡されなかった候補日は削除され、その日の回答も cascade で消える。
-- 集計中でない場合は例外にする（RLS の 0 行更新は黙って成功するため、事前に明示的に確認する）。
create or replace function update_practice_survey(
  p_survey_id uuid,
  p_title text,
  p_dates jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  if not survey_is_collecting(p_survey_id) then
    raise exception 'survey is not collecting';
  end if;
  if btrim(coalesce(p_title, '')) = '' then
    raise exception 'title is required';
  end if;
  if jsonb_typeof(p_dates) is distinct from 'array' or jsonb_array_length(p_dates) = 0 then
    raise exception 'dates are required';
  end if;

  delete from practice_survey_dates d
  where d.survey_id = p_survey_id
    and d.candidate_date not in (
      select e.candidate_date
      from jsonb_to_recordset(p_dates) as e(candidate_date date, is_priority boolean)
    );

  insert into practice_survey_dates (survey_id, candidate_date, is_priority)
  select p_survey_id, e.candidate_date, coalesce(e.is_priority, false)
  from jsonb_to_recordset(p_dates) as e(candidate_date date, is_priority boolean)
  on conflict (survey_id, candidate_date)
  do update set is_priority = excluded.is_priority;

  update practice_surveys set title = btrim(p_title) where id = p_survey_id;
end;
$$;
