-- users の UPDATE 権限を厳格化し、role/approval_status の権限昇格を防止する。
--
-- 【背景】旧構成では users の FOR UPDATE ポリシー3つがすべて PERMISSIVE で、
-- 「adminはroleを変更可」が WITH CHECK (true) を持っていた。PostgreSQL は
-- PERMISSIVE ポリシーの WITH CHECK を OR 結合するため
-- (https://www.postgresql.org/docs/current/ddl-rowsecurity.html)、
-- 一般 member や未承認ユーザーが自分/他人の role を admin へ昇格できてしまった。
--
-- 【対策】role/approval_status の変更条件と、非所有者による他人のプロフィール
-- 改変の禁止を、RESTRICTIVE ポリシー(AND 結合で必ず適用)で強制する。
-- 変更前(コミット済み)の値の参照には RLS を回避する SECURITY DEFINER 関数を使う。

-- ------------------------------------------------------------
-- 1. 既存の権限判定関数に search_path を明示 (SECURITY DEFINER のハードニング)
--    ※ 挙動は従来と同一。search_path 乗っ取り対策として空に固定し完全修飾する。
-- ------------------------------------------------------------
create or replace function public.is_approved_member()
returns boolean
language sql security definer stable set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('member', 'admin')
      and approval_status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql security definer stable set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'admin'
      and approval_status = 'approved'
  );
$$;

-- ------------------------------------------------------------
-- 2. 変更前(コミット済み)の値を RLS を回避して取得するヘルパー
-- ------------------------------------------------------------
create or replace function public.user_role_of(uid uuid)
returns public.user_role
language sql security definer stable set search_path = ''
as $$ select role from public.users where id = uid $$;

create or replace function public.user_approval_of(uid uuid)
returns public.approval_status
language sql security definer stable set search_path = ''
as $$ select approval_status from public.users where id = uid $$;

create or replace function public.user_row_of(uid uuid)
returns public.users
language sql security definer stable set search_path = ''
as $$ select * from public.users where id = uid $$;

-- ------------------------------------------------------------
-- 3. 旧 UPDATE ポリシーを撤去
-- ------------------------------------------------------------
drop policy if exists "自身のプロフィールを更新可"          on public.users;
drop policy if exists "member以上はapproval_statusを変更可" on public.users;
drop policy if exists "adminはroleを変更可"                on public.users;

-- ------------------------------------------------------------
-- 4. 誰がどの行を UPDATE 対象にできるか (PERMISSIVE / OR 結合)
-- ------------------------------------------------------------
create policy "自身のレコードを更新可"
  on public.users for update
  using (auth.uid() = id);

create policy "承認済みメンバーは他ユーザーを更新可"
  on public.users for update
  using (public.is_approved_member());

-- ------------------------------------------------------------
-- 5. 変更内容の絶対条件 (RESTRICTIVE / AND 結合で必ず適用)
--    (a) role の変更は admin のみ。ただし承認時の provisional_member -> member 昇格は許可
--    (b) approval_status の変更は承認済みメンバーのみ
--    (c) 非所有者は他人のプロフィール項目を改変できない (role/approval_status のみ変更可)
-- ------------------------------------------------------------
create policy "role_approvalの変更を制限"
  on public.users
  as restrictive
  for update
  using (true)
  with check (
    -- (a) role の変更条件
    (
      role = public.user_role_of(id)
      or public.is_admin()
      or (
        public.is_approved_member()
        and public.user_role_of(id) = 'provisional_member'
        and role = 'member'
      )
    )
    and
    -- (b) approval_status の変更条件
    (
      approval_status = public.user_approval_of(id)
      or public.is_approved_member()
    )
    and
    -- (c) 非所有者はプロフィール項目を変更できない
    (
      auth.uid() = id
      or (
        select
              r.line_uid        is not distinct from users.line_uid
          and r.display_name    is not distinct from users.display_name
          and r.avatar_url      is not distinct from users.avatar_url
          and r.nickname        is not distinct from users.nickname
          and r.family_name     is not distinct from users.family_name
          and r.given_name      is not distinct from users.given_name
          and r.old_family_name is not distinct from users.old_family_name
          and r.part            is not distinct from users.part
          and r.class_label     is not distinct from users.class_label
          and r.affiliation     is not distinct from users.affiliation
          and r.created_at      is not distinct from users.created_at
        from public.user_row_of(users.id) as r
      )
    )
  );
