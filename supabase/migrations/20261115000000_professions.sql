-- Professions (วิชาชีพ), start date (วันที่เริ่มงาน) and tenure (อายุงาน, computed in the app).
-- A profession maps to an existing pay group (pay_positions) so no new money figures are invented;
-- the user can still change the pay group, and admins can edit rates as before.

create table if not exists public.professions (
  code         text primary key,
  name         text not null,
  grp          text not null,
  pay_position text not null references public.pay_positions(code) on update cascade,
  sort         int  not null
);
alter table public.professions enable row level security;
drop policy if exists professions_read on public.professions;
create policy professions_read on public.professions for select to authenticated using (true);
revoke all on public.professions from anon, authenticated;
grant select on public.professions to authenticated;

alter table public.profiles add column if not exists profession_code text references public.professions(code) on delete set null;
alter table public.profiles add column if not exists start_date date;

insert into public.professions (code, name, grp, pay_position, sort) values
  ('doctor',       'แพทย์',                                   'แพทย์และทันตแพทย์',        'doctor',     10),
  ('dentist',      'ทันตแพทย์',                               'แพทย์และทันตแพทย์',        'doctor',     11),
  ('pharmacist',   'เภสัชกร',                                 'เภสัชกรรม',                'pharmacist', 20),
  ('pharm_tech',   'เจ้าพนักงานเภสัชกรรม',                    'เภสัชกรรม',                'tech',       21),
  ('pharm_aide',   'ผู้ช่วยเภสัชกร',                          'เภสัชกรรม',                'aide',       22),
  ('rn',           'พยาบาลวิชาชีพ',                           'การพยาบาล',                'rn',         30),
  ('tn',           'พยาบาลเทคนิค',                            'การพยาบาล',                'tech',       31),
  ('na',           'ผู้ช่วยพยาบาล',                           'การพยาบาล',                'aide',       32),
  ('pca',          'พนักงานช่วยเหลือคนไข้',                   'การพยาบาล',                'support',    33),
  ('phn',          'นักวิชาการสาธารณสุข',                     'สาธารณสุข',                'rn',         40),
  ('phn_tech',     'เจ้าพนักงานสาธารณสุข',                    'สาธารณสุข',                'tech',       41),
  ('dental_nurse', 'ทันตาภิบาล / นักวิชาการทันตสาธารณสุข',    'ทันตสาธารณสุข',            'rn',         50),
  ('dental_tech',  'เจ้าพนักงานทันตสาธารณสุข',                'ทันตสาธารณสุข',            'tech',       51),
  ('dental_aide',  'ผู้ช่วยทันตแพทย์',                        'ทันตสาธารณสุข',            'aide',       52),
  ('medtech',      'นักเทคนิคการแพทย์',                       'เทคนิคการแพทย์และรังสี',   'other',      60),
  ('medsci',       'นักวิทยาศาสตร์การแพทย์',                  'เทคนิคการแพทย์และรังสี',   'other',      61),
  ('lab_tech',     'เจ้าพนักงานวิทยาศาสตร์การแพทย์',          'เทคนิคการแพทย์และรังสี',   'tech',       62),
  ('radtech',      'นักรังสีการแพทย์',                        'เทคนิคการแพทย์และรังสี',   'other',      63),
  ('rad_tech',     'เจ้าพนักงานรังสีการแพทย์',                'เทคนิคการแพทย์และรังสี',   'tech',       64),
  ('pt',           'นักกายภาพบำบัด',                          'ฟื้นฟูและบำบัด',           'other',      70),
  ('pt_tech',      'เจ้าพนักงานเวชกรรมฟื้นฟู',                'ฟื้นฟูและบำบัด',           'tech',       71),
  ('ot',           'นักกิจกรรมบำบัด',                         'ฟื้นฟูและบำบัด',           'other',      72),
  ('speech',       'นักแก้ไขการพูด',                          'ฟื้นฟูและบำบัด',           'other',      73),
  ('psy',          'นักจิตวิทยา',                             'ฟื้นฟูและบำบัด',           'other',      74),
  ('sw',           'นักสังคมสงเคราะห์',                       'ฟื้นฟูและบำบัด',           'other',      75),
  ('nutri',        'นักโภชนาการ / นักกำหนดอาหาร',             'ฟื้นฟูและบำบัด',           'other',      76),
  ('emt',          'นักฉุกเฉินการแพทย์',                      'การแพทย์ฉุกเฉิน',          'other',      80),
  ('emt_b',        'เจ้าพนักงานฉุกเฉินการแพทย์',              'การแพทย์ฉุกเฉิน',          'tech',       81),
  ('thai_med',     'แพทย์แผนไทย',                             'แพทย์แผนไทย',              'other',      85),
  ('thai_tech',    'เจ้าพนักงานการแพทย์แผนไทย',               'แพทย์แผนไทย',              'tech',       86),
  ('stretcher',    'พนักงานเปล',                              'สนับสนุนบริการ',           'support',    90),
  ('driver',       'พนักงานขับรถยนต์ / รถพยาบาล',             'สนับสนุนบริการ',           'support',    91),
  ('cleaner',      'พนักงานทำความสะอาด',                      'สนับสนุนบริการ',           'support',    92),
  ('cssd',         'พนักงานศูนย์เครื่องมือแพทย์ (จ่ายกลาง)',  'สนับสนุนบริการ',           'support',    93),
  ('record',       'เจ้าหน้าที่เวชระเบียน / เวชสถิติ',        'บริหารและธุรการ',          'other',     100),
  ('admin_staff',  'เจ้าหน้าที่บริหารงานทั่วไป',              'บริหารและธุรการ',          'other',     101),
  ('finance',      'เจ้าหน้าที่การเงิน / บัญชี / พัสดุ',      'บริหารและธุรการ',          'other',     102),
  ('it',           'เจ้าหน้าที่คอมพิวเตอร์ / ไอที',           'บริหารและธุรการ',          'other',     103),
  ('other',        'อื่น ๆ',                                  'อื่น ๆ',                   'other',     999)
on conflict (code) do update set name = excluded.name, grp = excluded.grp,
  pay_position = excluded.pay_position, sort = excluded.sort;

-- Profession + start date (+ optional pay group). When the profession is given and no pay group is
-- passed, the profession's default pay group is used. Dates are validated in Thai time.
create or replace function public.set_my_work(p_profession text, p_start date, p_position text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_pos text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_start is not null and (p_start > (now() at time zone 'Asia/Bangkok')::date or p_start < date '1950-01-01') then
    raise exception 'invalid_start_date';
  end if;
  if p_profession is not null and not exists (select 1 from public.professions x where x.code = p_profession) then
    raise exception 'invalid_profession';
  end if;
  v_pos := coalesce(p_position, (select x.pay_position from public.professions x where x.code = p_profession));
  if v_pos is not null and not exists (select 1 from public.pay_positions x where x.code = v_pos) then
    raise exception 'invalid_position';
  end if;
  update public.profiles
     set profession_code = p_profession,
         start_date = p_start,
         position_code = case when v_pos is null then position_code else v_pos end,
         updated_at = now()
   where id = auth.uid();
end $$;

revoke all on function public.set_my_work(text, date, text) from public, anon;
grant execute on function public.set_my_work(text, date, text) to authenticated;
