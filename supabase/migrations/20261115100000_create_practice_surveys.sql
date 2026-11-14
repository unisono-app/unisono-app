-- 練習候補日アンケート。すべて新規テーブル・新規関数のみ（既存コードに影響しない加算的変更）。
--
-- ライフサイクル（すべて管理者が手動で進める）:
--   集計中        : closed_at IS NULL  AND ended_at IS NULL  … 回答可。結果は「回答済みの人」のみ閲覧可
--   結果公開中    : closed_at NOT NULL AND ended_at IS NULL  … 回答不可。結果は全員閲覧可
--   公開終了      : ended_at NOT NULL                        … 管理者のみ閲覧可（データは残す）
-- 同時に存在できる（公開終了前の）アンケートは 1 件のみ。
-- 回答の「行がない日」は ○（参加可能）として扱う。△ / × のみ保存する。

-- ------------------------------------------------------------
-- 1. テーブル
-- ------------------------------------------------------------

create table practice_surveys (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  closed_at   timestamptz,
  ended_at    timestamptz,
  created_by  uuid not null references users(id),
  created_at  timestamptz not null default now()
);

-- ended_at IS NULL の行を 1 件までに制限する（式 (true) が常に同値のため 2 件目は一意制約違反）
create unique index practice_surveys_single_active
  on practice_surveys ((true))
  where ended_at is null;

create table practice_survey_dates (
  id              uuid primary key default gen_random_uuid(),
  survey_id       uuid not null references practice_surveys(id) on delete cascade,
  candidate_date  date not null,
  is_priority     boolean not null default false,
  unique (survey_id, candidate_date)
);

create table practice_survey_responses (
  survey_date_id  uuid not null references practice_survey_dates(id) on delete cascade,
  user_id         uuid not null references users(id),
  status          text not null check (status in ('maybe', 'absent')),
  primary key (survey_date_id, user_id)
);

-- 初回ポップアップ表示済み(prompted_at) / 回答済み(answered_at) を記録する。
-- 全日程 ○ で回答した人は responses が 0 行になるため、未回答との区別に answered_at を使う。
create table practice_survey_participations (
  survey_id    uuid not null references practice_surveys(id) on delete cascade,
  user_id      uuid not null references users(id),
  prompted_at  timestamptz,
  answered_at  timestamptz,
  primary key (survey_id, user_id)
);

-- ------------------------------------------------------------
-- 2. ヘルパー関数（SECURITY DEFINER: RLS の再帰を避けるため）
-- ------------------------------------------------------------

-- 集計中か（回答を受け付けているか）
create or replace function survey_is_collecting(p_survey_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from practice_surveys
    where id = p_survey_id
      and closed_at is null
      and ended_at is null
  );
$$;

-- 呼び出しユーザーが集計結果を閲覧できるか（管理者の判定は呼び出し側で行う）
--   公開終了前 かつ（締切済み または 自分が回答済み）
create or replace function survey_results_visible(p_survey_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from practice_surveys s
    where s.id = p_survey_id
      and s.ended_at is null
      and (
        s.closed_at is not null
        or exists (
          select 1 from practice_survey_participations p
          where p.survey_id = s.id
            and p.user_id = auth.uid()
            and p.answered_at is not null
        )
      )
  );
$$;

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------

alter table practice_surveys enable row level security;
alter table practice_survey_dates enable row level security;
alter table practice_survey_responses enable row level security;
alter table practice_survey_participations enable row level security;

-- practice_surveys: 公開終了後は管理者のみ閲覧可。削除ポリシーは作らない（データは残す）。
create policy "admin、またはmember以上は公開終了前のみ閲覧可"
  on practice_surveys for select
  using (is_admin() or (is_approved_member() and ended_at is null));

create policy "adminのみ作成可"
  on practice_surveys for insert
  with check (is_admin() and created_by = auth.uid());

create policy "adminのみ更新可"
  on practice_surveys for update
  using (is_admin())
  with check (is_admin());

-- practice_survey_dates: 閲覧可否は親アンケートの RLS に従う。変更は集計中の管理者のみ。
create policy "親アンケートが閲覧可なら閲覧可"
  on practice_survey_dates for select
  using (exists (select 1 from practice_surveys s where s.id = survey_id));

create policy "adminが集計中のみ作成可"
  on practice_survey_dates for insert
  with check (is_admin() and survey_is_collecting(survey_id));

create policy "adminが集計中のみ更新可"
  on practice_survey_dates for update
  using (is_admin() and survey_is_collecting(survey_id))
  with check (is_admin() and survey_is_collecting(survey_id));

create policy "adminが集計中のみ削除可"
  on practice_survey_dates for delete
  using (is_admin() and survey_is_collecting(survey_id));

-- practice_survey_responses
--   閲覧: 管理者 / 自分の回答 / 集計結果が閲覧可（締切済み、または自分が回答済み）なアンケートの全員分
--   書き込み: 本人のみ・集計中のみ
create policy "結果閲覧可または自分の回答のみ閲覧可"
  on practice_survey_responses for select
  using (
    is_admin()
    or (
      is_approved_member()
      and exists (
        select 1 from practice_survey_dates d
        where d.id = survey_date_id
          and (user_id = auth.uid() or survey_results_visible(d.survey_id))
      )
    )
  );

create policy "自身の回答のみ集計中に作成可"
  on practice_survey_responses for insert
  with check (
    user_id = auth.uid()
    and is_approved_member()
    and exists (
      select 1 from practice_survey_dates d
      where d.id = survey_date_id and survey_is_collecting(d.survey_id)
    )
  );

create policy "自身の回答のみ集計中に更新可"
  on practice_survey_responses for update
  using (
    user_id = auth.uid()
    and is_approved_member()
    and exists (
      select 1 from practice_survey_dates d
      where d.id = survey_date_id and survey_is_collecting(d.survey_id)
    )
  )
  with check (
    user_id = auth.uid()
    and is_approved_member()
    and exists (
      select 1 from practice_survey_dates d
      where d.id = survey_date_id and survey_is_collecting(d.survey_id)
    )
  );

create policy "自身の回答のみ集計中に削除可"
  on practice_survey_responses for delete
  using (
    user_id = auth.uid()
    and is_approved_member()
    and exists (
      select 1 from practice_survey_dates d
      where d.id = survey_date_id and survey_is_collecting(d.survey_id)
    )
  );

-- practice_survey_participations
--   閲覧: 管理者 / 自分の行 / 結果が閲覧可なアンケートの「回答済みの行」（回答済み・未回答人数の算出用）
--   書き込み: 本人のみ。answered_at は集計中のみ設定可。
create policy "自分の行または結果閲覧可の回答済み行のみ閲覧可"
  on practice_survey_participations for select
  using (
    is_admin()
    or (
      is_approved_member()
      and exists (select 1 from practice_surveys s where s.id = survey_id)
      and (
        user_id = auth.uid()
        or (answered_at is not null and survey_results_visible(survey_id))
      )
    )
  );

create policy "自身の行のみ作成可"
  on practice_survey_participations for insert
  with check (
    user_id = auth.uid()
    and is_approved_member()
    and exists (select 1 from practice_surveys s where s.id = survey_id)
    and (answered_at is null or survey_is_collecting(survey_id))
  );

create policy "自身の行のみ更新可"
  on practice_survey_participations for update
  using (user_id = auth.uid() and is_approved_member())
  with check (
    user_id = auth.uid()
    and is_approved_member()
    and (answered_at is null or survey_is_collecting(survey_id))
  );

-- ------------------------------------------------------------
-- 4. 回答の一括保存（原子的）
-- ------------------------------------------------------------
-- 呼び出しユーザーの権限（RLS）で実行される（SECURITY INVOKER）。
-- p_entries: [{"survey_date_id": "<uuid>", "status": "maybe" | "absent"}, ...]
--   ○（参加可能）の日は含めない。空配列なら「全日程 ○」で回答したことになる。
--   指定アンケートに属さない日付 ID は無視される。
create or replace function submit_practice_survey_answer(
  p_survey_id uuid,
  p_entries jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not survey_is_collecting(p_survey_id) then
    raise exception 'survey is not collecting';
  end if;

  delete from practice_survey_responses r
  using practice_survey_dates d
  where r.survey_date_id = d.id
    and d.survey_id = p_survey_id
    and r.user_id = auth.uid();

  insert into practice_survey_responses (survey_date_id, user_id, status)
  select d.id, auth.uid(), e.status
  from jsonb_to_recordset(p_entries) as e(survey_date_id uuid, status text)
  join practice_survey_dates d
    on d.id = e.survey_date_id and d.survey_id = p_survey_id;

  insert into practice_survey_participations (survey_id, user_id, answered_at)
  values (p_survey_id, auth.uid(), now())
  on conflict (survey_id, user_id)
  do update set answered_at = excluded.answered_at;
end;
$$;
