-- Hardening (2026-11-12)
-- 1) Supabase grants TRUNCATE/REFERENCES/TRIGGER to anon+authenticated by default; RLS does not
--    cover TRUNCATE. The app never needs them, so take them away.
-- 2) Create the profile in the same transaction as the auth user, so a failure between
--    "createUser" and "profiles upsert" in the Edge Function can never leave an orphan auth user
--    that can no longer log in.

begin;

revoke truncate, references, trigger on
  public.profiles, public.shifts, public.groups, public.group_members,
  public.pay_positions, public.pay_rates, public.messages, public.horoscope_profiles
  from anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ->> 'line_user_id' is not null then
    insert into public.profiles (id, line_user_id)
    values (new.id, new.raw_user_meta_data ->> 'line_user_id')
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
