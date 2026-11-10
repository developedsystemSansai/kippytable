-- Kippy : schema + Row Level Security + RPC
-- Auth model: LINE user -> Supabase auth user (created by Edge Function `line-auth`).
-- Clients talk to Postgres directly through supabase-js; every table is protected by RLS.

------------------------------------------------------------------ tables
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  line_user_id  text not null unique,
  name          text not null default '' check (char_length(name) <= 100),
  picture       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.shifts (
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  date        date not null,
  label       text not null check (char_length(label) between 1 and 20),
  hours       numeric(4,1) not null default 0 check (hours between 0 and 24),
  pay         numeric(10,2) not null default 0 check (pay between 0 and 1000000),
  color       text not null default '#3b5bdb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  note        text not null default '' check (char_length(note) <= 200),
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 40),
  invite_code  text not null unique,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table public.group_members (
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger shifts_touch before update on public.shifts
  for each row execute function public.touch_updated_at();

------------------------------------------------------------------ helpers
create or replace function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members m where m.group_id = gid and m.user_id = (select auth.uid())
  )
$$;

------------------------------------------------------------------ RLS
alter table public.profiles       enable row level security;
alter table public.shifts         enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy shifts_own on public.shifts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy groups_select_member on public.groups
  for select to authenticated using (public.is_group_member(id));

create policy group_members_select_own on public.group_members
  for select to authenticated using (user_id = (select auth.uid()));

-- Defense in depth: writes to these tables only happen through the RPCs below
-- (or the service role in the Edge Function). anon gets nothing.
revoke all on public.profiles, public.shifts, public.groups, public.group_members from anon;
revoke insert, update, delete on public.profiles, public.groups, public.group_members from authenticated;

------------------------------------------------------------------ RPC
create or replace function public.create_group(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid  uuid := auth.uid();
  v_name text := btrim(p_name);
  v_code text;
  v_id   uuid;
  v_try  int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_name is null or char_length(v_name) not between 1 and 40 then raise exception 'invalid_name'; end if;
  if (select count(*) from public.group_members m where m.user_id = v_uid) >= 20 then
    raise exception 'too_many_groups';
  end if;

  loop
    v_try := v_try + 1;
    v_code := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
               from generate_series(1, 6));
    begin
      insert into public.groups (name, invite_code, owner_id) values (v_name, v_code, v_uid)
      returning groups.id into v_id;
      exit;
    exception when unique_violation then
      if v_try >= 5 then raise exception 'code_generation_failed'; end if;
    end;
  end loop;

  insert into public.group_members (group_id, user_id) values (v_id, v_uid);
  return jsonb_build_object('id', v_id, 'name', v_name, 'invite_code', v_code, 'is_owner', true, 'member_count', 1);
end $$;

create or replace function public.join_group(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_gid   uuid;
  v_gname text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select g.id, g.name into v_gid, v_gname from public.groups g where g.invite_code = upper(btrim(p_code));
  if v_gid is null then raise exception 'group_not_found'; end if;
  insert into public.group_members (group_id, user_id) values (v_gid, v_uid) on conflict do nothing;
  return jsonb_build_object('id', v_gid, 'name', v_gname);
end $$;

create or replace function public.leave_group(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select g.owner_id into v_owner from public.groups g where g.id = p_id;
  if v_owner is null or not public.is_group_member(p_id) then raise exception 'group_not_found'; end if;
  if v_owner = v_uid then
    delete from public.groups where id = p_id;           -- owner removes the group for everyone
  else
    delete from public.group_members where group_id = p_id and user_id = v_uid;
  end if;
end $$;

create or replace function public.my_groups()
returns table (id uuid, name text, invite_code text, is_owner boolean, member_count int)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.invite_code, (g.owner_id = (select auth.uid())),
         (select count(*)::int from public.group_members c where c.group_id = g.id)
  from public.groups g
  join public.group_members gm on gm.group_id = g.id and gm.user_id = (select auth.uid())
  order by g.created_at desc
$$;

-- Each member's shift on a day. Never returns pay.
create or replace function public.group_day(p_id uuid, p_date date)
returns table (id uuid, name text, picture text, label text, color text, hours numeric)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_group_member(p_id) then raise exception 'group_not_found'; end if;
  return query
    select p.id, p.name, p.picture, s.label, s.color, s.hours
    from public.group_members gm
    join public.profiles p on p.id = gm.user_id
    left join public.shifts s on s.user_id = p.id and s.date = p_date
    where gm.group_id = p_id
    order by (s.label is null), p.name;
end $$;

-- SECURITY INVOKER: RLS limits it to the caller's own shifts.
create or replace function public.income_year(p_year int)
returns table (month text, shifts int, hours numeric, pay numeric)
language sql stable set search_path = '' as $$
  select to_char(s.date, 'YYYY-MM'),
         (count(*) filter (where s.hours > 0))::int,
         coalesce(sum(s.hours), 0),
         coalesce(sum(s.pay), 0)
  from public.shifts s
  where s.date >= make_date(p_year, 1, 1) and s.date < make_date(p_year + 1, 1, 1)
  group by 1
  order by 1
$$;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from auth.users where id = auth.uid();          -- cascades to profiles, shifts, memberships, owned groups
end $$;

revoke all on function public.create_group(text), public.join_group(text), public.leave_group(uuid),
  public.my_groups(), public.group_day(uuid, date), public.income_year(int), public.delete_my_account(),
  public.is_group_member(uuid)
  from public, anon;
grant execute on function public.create_group(text), public.join_group(text), public.leave_group(uuid),
  public.my_groups(), public.group_day(uuid, date), public.income_year(int), public.delete_my_account(),
  public.is_group_member(uuid)
  to authenticated;
