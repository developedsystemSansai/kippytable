-- Kippy v2: admin role, preset pay rates (MOPH), contact-admin messages, horoscope profile.
-- Applied to the production project; statements are idempotent where possible.
-- Writes go through SECURITY DEFINER RPCs; every table keeps RLS on.

begin;

------------------------------------------------------------------ admin flag
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false)
$$;

------------------------------------------------------------------ pay rates
create table if not exists public.pay_positions (
  code  text primary key check (code ~ '^[a-z_]{2,20}$'),
  name  text not null check (char_length(name) between 1 and 80),
  sort  int  not null default 0
);

create table if not exists public.pay_rates (
  position_code text not null references public.pay_positions(code) on delete cascade,
  shift         text not null check (char_length(shift) between 1 and 20),
  pay           numeric(10,2) not null default 0 check (pay between 0 and 100000),
  per_hours     numeric(4,1)  not null default 8 check (per_hours > 0 and per_hours <= 24),
  note          text not null default '' check (char_length(note) <= 200),
  updated_at    timestamptz not null default now(),
  primary key (position_code, shift)
);

alter table public.profiles add column if not exists position_code text
  references public.pay_positions(code) on delete set null;

-- Seed (do nothing if the admin already edited a row).
-- Sources: MOPH compensation rules ฉ.5 (2566: OT per 8h shift) and ฉบับที่ 2 พ.ศ.2568 ข้อ 16 (afternoon/night in office-hours roster).
-- Hospital rules can differ -> the admin edits these in the app.
insert into public.pay_positions (code, name, sort) values
  ('doctor',    'แพทย์ / ทันตแพทย์', 1),
  ('pharmacist','เภสัชกร', 2),
  ('rn',        'พยาบาลวิชาชีพ / นักวิชาชีพสาธารณสุข', 3),
  ('tech',      'พยาบาลเทคนิค / เจ้าพนักงาน', 4),
  ('aide',      'ผู้ช่วยพยาบาล / เจ้าหน้าที่พยาบาล-สาธารณสุข', 5),
  ('support',   'พนักงานเปล / ขับรถกู้ชีพ / ลูกจ้างอื่น', 6),
  ('other',     'เจ้าหน้าที่อื่น ๆ (ตามวุฒิ)', 7)
on conflict (code) do nothing;

insert into public.pay_rates (position_code, shift, pay, per_hours, note) values
  ('doctor','เช้า',0,8,'เวรเช้าในเวลาราชการ ไม่มีค่าเวรเพิ่ม'),
  ('doctor','บ่าย',0,8,'ไม่พบอัตราในเกณฑ์ที่ตรวจสอบ — แอดมินกรอกตามประกาศของหน่วยงาน'),
  ('doctor','ดึก',0,8,'ไม่พบอัตราในเกณฑ์ที่ตรวจสอบ — แอดมินกรอกตามประกาศของหน่วยงาน'),
  ('doctor','OT',1200,8,'ฉ.5 (2566) แพทย์/ทันตแพทย์ ต่อผลัด 8 ชม.'),
  ('pharmacist','เช้า',0,8,'เวรเช้าในเวลาราชการ ไม่มีค่าเวรเพิ่ม'),
  ('pharmacist','บ่าย',0,8,'ไม่พบอัตราในเกณฑ์ที่ตรวจสอบ — แอดมินกรอกตามประกาศของหน่วยงาน'),
  ('pharmacist','ดึก',0,8,'ไม่พบอัตราในเกณฑ์ที่ตรวจสอบ — แอดมินกรอกตามประกาศของหน่วยงาน'),
  ('pharmacist','OT',780,8,'ฉ.5 (2566) เภสัชกร ต่อผลัด 8 ชม.'),
  ('rn','เช้า',0,8,'เวรเช้าในเวลาราชการ ไม่มีค่าเวรเพิ่ม'),
  ('rn','บ่าย',360,8,'ข้อ 16 (ฉบับที่ 2 พ.ศ.2568) พยาบาลวิชาชีพ/นักวิชาชีพ ต่อผลัด'),
  ('rn','ดึก',360,8,'ข้อ 16 (ฉบับที่ 2 พ.ศ.2568) พยาบาลวิชาชีพ/นักวิชาชีพ ต่อผลัด'),
  ('rn','OT',650,8,'ฉ.5 (2566) พยาบาลวิชาชีพ/นักวิชาการสาธารณสุข ต่อผลัด 8 ชม.'),
  ('tech','เช้า',0,8,'เวรเช้าในเวลาราชการ ไม่มีค่าเวรเพิ่ม'),
  ('tech','บ่าย',270,8,'ข้อ 16 (ฉบับที่ 2 พ.ศ.2568) พยาบาลเทคนิค/เวชกิจฉุกเฉิน ต่อผลัด'),
  ('tech','ดึก',270,8,'ข้อ 16 (ฉบับที่ 2 พ.ศ.2568) พยาบาลเทคนิค/เวชกิจฉุกเฉิน ต่อผลัด'),
  ('tech','OT',520,8,'ฉ.5 (2566) พยาบาลเทคนิค/เจ้าพนักงาน ต่อผลัด 8 ชม.'),
  ('aide','เช้า',0,8,'เวรเช้าในเวลาราชการ ไม่มีค่าเวรเพิ่ม'),
  ('aide','บ่าย',225,8,'ข้อ 16 (ฉบับที่ 2 พ.ศ.2568) ผู้ช่วยพยาบาล ต่อผลัด'),
  ('aide','ดึก',225,8,'ข้อ 16 (ฉบับที่ 2 พ.ศ.2568) ผู้ช่วยพยาบาล ต่อผลัด'),
  ('aide','OT',390,8,'ฉ.5 (2566) เจ้าหน้าที่พยาบาล/สาธารณสุข/เทคนิค ต่อผลัด 8 ชม.'),
  ('support','เช้า',0,8,'เวรเช้าในเวลาราชการ ไม่มีค่าเวรเพิ่ม'),
  ('support','บ่าย',120,8,'ข้อ 16 (ฉบับที่ 2 พ.ศ.2568) พนักงานเปล/ขับรถกู้ชีพ ต่อผลัด'),
  ('support','ดึก',120,8,'ข้อ 16 (ฉบับที่ 2 พ.ศ.2568) พนักงานเปล/ขับรถกู้ชีพ ต่อผลัด'),
  ('support','OT',330,8,'ฉ.5 (2566) ลูกจ้างตำแหน่งอื่น ต่อผลัด 8 ชม.'),
  ('other','เช้า',0,8,'เวรเช้าในเวลาราชการ ไม่มีค่าเวรเพิ่ม'),
  ('other','บ่าย',0,8,'ไม่พบอัตราในเกณฑ์ที่ตรวจสอบ — แอดมินกรอกตามประกาศของหน่วยงาน'),
  ('other','ดึก',0,8,'ไม่พบอัตราในเกณฑ์ที่ตรวจสอบ — แอดมินกรอกตามประกาศของหน่วยงาน'),
  ('other','OT',650,8,'ฉ.5 (2566) เจ้าหน้าที่อื่น ๆ ตามวุฒิ ต่อผลัด 8 ชม.')
on conflict (position_code, shift) do nothing;

------------------------------------------------------------------ messages (contact admin)
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  reply       text check (reply is null or char_length(reply) <= 1000),
  replied_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists messages_user_idx on public.messages (user_id, created_at desc);

------------------------------------------------------------------ horoscope profile
create table if not exists public.horoscope_profiles (
  user_id           uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  birth_date        date not null check (birth_date between date '1900-01-01' and date '2100-01-01'),
  birth_time        time,
  share_with_groups boolean not null default false,
  updated_at        timestamptz not null default now()
);

------------------------------------------------------------------ RLS
alter table public.pay_positions       enable row level security;
alter table public.pay_rates           enable row level security;
alter table public.messages            enable row level security;
alter table public.horoscope_profiles  enable row level security;

drop policy if exists pay_positions_read on public.pay_positions;
create policy pay_positions_read on public.pay_positions for select to authenticated using (true);
drop policy if exists pay_rates_read on public.pay_rates;
create policy pay_rates_read on public.pay_rates for select to authenticated using (true);
drop policy if exists messages_select_own on public.messages;
create policy messages_select_own on public.messages for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists horoscope_own on public.horoscope_profiles;
create policy horoscope_own on public.horoscope_profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.pay_positions, public.pay_rates, public.messages, public.horoscope_profiles from anon;
revoke insert, update, delete on public.pay_positions, public.pay_rates, public.messages from authenticated;

------------------------------------------------------------------ RPC
create or replace function public.set_my_position(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_code is not null and not exists (select 1 from public.pay_positions x where x.code = p_code) then
    raise exception 'invalid_position';
  end if;
  update public.profiles set position_code = p_code, updated_at = now() where id = auth.uid();
end $$;

create or replace function public.admin_save_rate(p_position text, p_shift text, p_pay numeric, p_per_hours numeric, p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.pay_positions x where x.code = p_position) then raise exception 'invalid_position'; end if;
  insert into public.pay_rates (position_code, shift, pay, per_hours, note, updated_at)
  values (p_position, btrim(p_shift), p_pay, p_per_hours, coalesce(btrim(p_note), ''), now())
  on conflict (position_code, shift) do update
    set pay = excluded.pay, per_hours = excluded.per_hours, note = excluded.note, updated_at = now();
end $$;

create or replace function public.admin_delete_rate(p_position text, p_shift text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.pay_rates where position_code = p_position and shift = p_shift;
end $$;

create or replace function public.send_message(p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_body text := btrim(p_body);
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if v_body is null or char_length(v_body) not between 1 and 1000 then raise exception 'invalid_message'; end if;
  if (select count(*) from public.messages m where m.user_id = auth.uid() and m.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_messages';
  end if;
  insert into public.messages (user_id, body) values (auth.uid(), v_body);
end $$;

create or replace function public.admin_list_messages()
returns table (id uuid, user_id uuid, name text, picture text, body text, reply text, created_at timestamptz, replied_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select m.id, m.user_id, p.name, p.picture, m.body, m.reply, m.created_at, m.replied_at
    from public.messages m join public.profiles p on p.id = m.user_id
    order by (m.reply is not null), m.created_at desc
    limit 200;
end $$;

create or replace function public.admin_reply(p_id uuid, p_reply text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.messages set reply = nullif(btrim(p_reply), ''), replied_at = now() where id = p_id;
end $$;

create or replace function public.admin_delete_message(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.messages where id = p_id;
end $$;

-- Members who agreed to share their birth date with their groups. Never returns birth time.
create or replace function public.group_horoscopes(p_id uuid)
returns table (id uuid, name text, picture text, birth_date date)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_group_member(p_id) then raise exception 'group_not_found'; end if;
  return query
    select p.id, p.name, p.picture, h.birth_date
    from public.group_members gm
    join public.profiles p on p.id = gm.user_id
    join public.horoscope_profiles h on h.user_id = p.id and h.share_with_groups
    where gm.group_id = p_id
    order by p.name;
end $$;

revoke all on function public.is_admin(), public.set_my_position(text),
  public.admin_save_rate(text, text, numeric, numeric, text), public.admin_delete_rate(text, text),
  public.send_message(text), public.admin_list_messages(), public.admin_reply(uuid, text),
  public.admin_delete_message(uuid), public.group_horoscopes(uuid)
  from public, anon;
grant execute on function public.is_admin(), public.set_my_position(text),
  public.admin_save_rate(text, text, numeric, numeric, text), public.admin_delete_rate(text, text),
  public.send_message(text), public.admin_list_messages(), public.admin_reply(uuid, text),
  public.admin_delete_message(uuid), public.group_horoscopes(uuid)
  to authenticated;

commit;

------------------------------------------------------------------ ตั้งแอดมิน
-- ไม่เก็บ ID ของแอดมินไว้ใน repo. ตั้งแอดมินด้วยมือใน SQL Editor (แทนค่า <LINE_USER_ID>):
--   update public.profiles set is_admin = true where line_user_id = '<LINE_USER_ID>';
--   select id, name, is_admin from public.profiles where is_admin;   -- ต้องได้ 1 แถว
