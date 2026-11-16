-- Workplace (ที่ทำงาน), work history (ประวัติการทำงาน), profile photo upload (ภาพประจำตัว).

-- 1) Current workplace + custom avatar bookkeeping on profiles
alter table public.profiles add column if not exists workplace text check (workplace is null or char_length(workplace) <= 120);
alter table public.profiles add column if not exists picture_custom boolean not null default false;
alter table public.profiles add column if not exists line_picture text;   -- LINE photo kept while a custom one is active

create or replace function public.set_my_workplace(p_text text) returns void
language plpgsql security definer set search_path = '' as $$
declare v text := nullif(btrim(coalesce(p_text, '')), '');
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if v is not null and char_length(v) > 120 then raise exception 'workplace_too_long'; end if;
  update public.profiles set workplace = v, updated_at = now() where id = auth.uid();
end $$;

-- 2) Work history: plain table, own rows only (RLS); dates validated in Thai time, max 40 rows each
create table if not exists public.work_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  org        text not null check (char_length(btrim(org)) between 1 and 120),
  role       text not null default '' check (char_length(role) <= 120),
  start_date date not null check (start_date >= date '1950-01-01'),
  end_date   date,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index if not exists work_history_user_idx on public.work_history (user_id, start_date desc);
alter table public.work_history enable row level security;
drop policy if exists work_history_own on public.work_history;
create policy work_history_own on public.work_history for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.work_history from anon, authenticated;
grant select, insert, update, delete on public.work_history to authenticated;

create or replace function public.work_history_guard() returns trigger
language plpgsql set search_path = '' as $$
declare today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if new.start_date > today or (new.end_date is not null and new.end_date > today) then
    raise exception 'invalid_date';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.work_history w where w.user_id = new.user_id) >= 40 then
    raise exception 'too_many_entries';
  end if;
  new.org := btrim(new.org);
  new.role := btrim(new.role);
  return new;
end $$;
drop trigger if exists work_history_guard on public.work_history;
create trigger work_history_guard before insert or update on public.work_history
  for each row execute function public.work_history_guard();
revoke all on function public.work_history_guard() from public, anon, authenticated;

-- 3) Avatar storage: public-read bucket, 512 KB, images only; users write only inside their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_select_own on storage.objects;
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- The LINE login (Edge Function) rewrites profiles.picture on every login. While a custom photo is
-- active, keep it and remember the LINE photo instead. Only set_my_avatar() may change it.
create or replace function public.profiles_picture_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.picture_custom and new.picture is distinct from old.picture
     and coalesce(current_setting('kippy.avatar_rpc', true), '') <> '1' then
    new.line_picture := new.picture;
    new.picture := old.picture;
    new.picture_custom := true;
  end if;
  return new;
end $$;
drop trigger if exists profiles_picture_guard on public.profiles;
create trigger profiles_picture_guard before update on public.profiles
  for each row execute function public.profiles_picture_guard();
revoke all on function public.profiles_picture_guard() from public, anon, authenticated;

-- p_url = public URL of an object the caller already uploaded to avatars/<uid>/...; null = back to LINE photo
create or replace function public.set_my_avatar(p_url text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_path text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  perform set_config('kippy.avatar_rpc', '1', true);
  if p_url is null then
    update public.profiles set picture = line_picture, picture_custom = false, line_picture = null, updated_at = now()
     where id = uid and picture_custom;
    return;
  end if;
  if p_url !~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/' || uid::text || '/[A-Za-z0-9_-]{6,64}\.(jpg|png|webp)$') then
    raise exception 'invalid_avatar';
  end if;
  v_path := substring(p_url from '/avatars/(.+)$');
  if not exists (select 1 from storage.objects o where o.bucket_id = 'avatars' and o.name = v_path) then
    raise exception 'avatar_not_found';
  end if;
  update public.profiles
     set line_picture = case when picture_custom then line_picture else picture end,
         picture = p_url, picture_custom = true, updated_at = now()
   where id = uid;
end $$;

revoke all on function public.set_my_workplace(text), public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_workplace(text), public.set_my_avatar(text) to authenticated;
