"use client";
import { supabase, ensureSession } from "./supabase";
import { shiftMonth } from "./dates";
import type {
  AdminMessage, Group, GroupHoro, GroupMemberDay, HoroProfile, IncomeMonth, Me, Message, PayPosition, PayRate, Shift,
} from "./types";

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

export type ShiftFields = Omit<Shift, "date">;

export async function getMe(): Promise<Me> {
  const uid = await ensureSession();
  const sb = supabase();
  const full = await sb.from("profiles").select("id,name,picture,is_admin,position_code").eq("id", uid).single();
  if (!full.error) return full.data as Me;
  // Migration 20261111000000 not applied yet: fall back so the app still opens.
  const basic = await sb.from("profiles").select("id,name,picture").eq("id", uid).single();
  fail(basic.error);
  return { ...(basic.data as { id: string; name: string; picture: string | null }), is_admin: false, position_code: null };
}

export async function listShifts(month: string): Promise<Shift[]> {
  await ensureSession();
  const [y, m] = month.split("-").map(Number);
  const [ny, nm] = shiftMonth(y, m, 1);
  const next = `${ny}-${String(nm).padStart(2, "0")}-01`;
  const { data, error } = await supabase()
    .from("shifts")
    .select("date,label,hours,pay,color,note")
    .gte("date", `${month}-01`)
    .lt("date", next)
    .order("date");
  fail(error);
  return (data ?? []) as Shift[];
}

export async function saveShifts(dates: string[], f: ShiftFields): Promise<void> {
  const uid = await ensureSession();
  const rows = dates.map((date) => ({ user_id: uid, date, ...f }));
  const { error } = await supabase().from("shifts").upsert(rows, { onConflict: "user_id,date" });
  fail(error);
}

export async function deleteShifts(dates: string[]): Promise<void> {
  await ensureSession();
  const { error } = await supabase().from("shifts").delete().in("date", dates);
  fail(error);
}

export async function getIncome(year: number): Promise<IncomeMonth[]> {
  await ensureSession();
  const { data, error } = await supabase().rpc("income_year", { p_year: year });
  fail(error);
  return (data ?? []) as IncomeMonth[];
}

export async function listGroups(): Promise<Group[]> {
  await ensureSession();
  const { data, error } = await supabase().rpc("my_groups");
  fail(error);
  return (data ?? []) as Group[];
}

export async function createGroup(name: string): Promise<void> {
  await ensureSession();
  const { error } = await supabase().rpc("create_group", { p_name: name });
  fail(error);
}

export async function joinGroup(code: string): Promise<void> {
  await ensureSession();
  const { error } = await supabase().rpc("join_group", { p_code: code });
  fail(error);
}

export async function leaveGroup(id: string): Promise<void> {
  await ensureSession();
  const { error } = await supabase().rpc("leave_group", { p_id: id });
  fail(error);
}

export type GroupDetailData = {
  group: { id: string; name: string; invite_code: string; is_owner: boolean };
  members: GroupMemberDay[];
};

export async function getGroupDay(id: string, date: string): Promise<GroupDetailData> {
  const uid = await ensureSession();
  const sb = supabase();
  const [g, d] = await Promise.all([
    sb.from("groups").select("id,name,invite_code,owner_id").eq("id", id).single(),
    sb.rpc("group_day", { p_id: id, p_date: date }),
  ]);
  fail(g.error);
  fail(d.error);
  const row = g.data as { id: string; name: string; invite_code: string; owner_id: string };
  return {
    group: { id: row.id, name: row.name, invite_code: row.invite_code, is_owner: row.owner_id === uid },
    members: (d.data ?? []) as GroupMemberDay[],
  };
}

export async function deleteMyAccount(): Promise<void> {
  await ensureSession();
  const { error } = await supabase().rpc("delete_my_account");
  fail(error);
  await supabase().auth.signOut();
}

// ------------------------------------------------------------------ pay presets
export type PayConfig = { positions: PayPosition[]; rates: PayRate[] };
let payConfigCache: Promise<PayConfig> | null = null;
export function getPayConfig(force = false): Promise<PayConfig> {
  if (!payConfigCache || force) {
    payConfigCache = (async () => {
      await ensureSession();
      const sb = supabase();
      const [p, r] = await Promise.all([
        sb.from("pay_positions").select("code,name,sort").order("sort"),
        sb.from("pay_rates").select("position_code,shift,pay,per_hours,note"),
      ]);
      fail(p.error);
      fail(r.error);
      return { positions: (p.data ?? []) as PayPosition[], rates: (r.data ?? []) as PayRate[] };
    })();
    payConfigCache.catch(() => { payConfigCache = null; });
  }
  return payConfigCache;
}

/** The signed-in user's position and the rate for each shift name. Empty when no position is set. */
export async function getMyPay(): Promise<{ position: PayPosition | null; rates: Record<string, PayRate> }> {
  const [me, cfg] = await Promise.all([getMe(), getPayConfig()]);
  const position = cfg.positions.find((x) => x.code === me.position_code) ?? null;
  const rates: Record<string, PayRate> = {};
  if (position) for (const r of cfg.rates) if (r.position_code === position.code) rates[r.shift] = r;
  return { position, rates };
}

export async function setMyPosition(code: string | null): Promise<void> {
  await ensureSession();
  const { error } = await supabase().rpc("set_my_position", { p_code: code });
  fail(error);
}

export async function adminSaveRate(position: string, shift: string, pay: number, perHours: number, note: string): Promise<void> {
  await ensureSession();
  const { error } = await supabase().rpc("admin_save_rate", { p_position: position, p_shift: shift, p_pay: pay, p_per_hours: perHours, p_note: note });
  fail(error);
  await getPayConfig(true);
}

export async function adminDeleteRate(position: string, shift: string): Promise<void> {
  await ensureSession();
  const { error } = await supabase().rpc("admin_delete_rate", { p_position: position, p_shift: shift });
  fail(error);
  await getPayConfig(true);
}

// ------------------------------------------------------------------ contact admin
export async function sendMessage(body: string): Promise<void> {
  await ensureSession();
  const { error } = await supabase().rpc("send_message", { p_body: body });
  fail(error);
}

export async function listMyMessages(): Promise<Message[]> {
  const uid = await ensureSession();
  const { data, error } = await supabase().from("messages").select("id,body,reply,created_at,replied_at")
    .eq("user_id", uid).order("created_at", { ascending: false }).limit(20);
  fail(error);
  return (data ?? []) as Message[];
}

export async function adminListMessages(): Promise<AdminMessage[]> {
  await ensureSession();
  const { data, error } = await supabase().rpc("admin_list_messages");
  fail(error);
  return (data ?? []) as AdminMessage[];
}

export async function adminReply(id: string, reply: string): Promise<void> {
  await ensureSession();
  const { error } = await supabase().rpc("admin_reply", { p_id: id, p_reply: reply });
  fail(error);
}

export async function adminDeleteMessage(id: string): Promise<void> {
  await ensureSession();
  const { error } = await supabase().rpc("admin_delete_message", { p_id: id });
  fail(error);
}

// ------------------------------------------------------------------ horoscope
export async function getHoroProfile(): Promise<HoroProfile | null> {
  const uid = await ensureSession();
  const { data, error } = await supabase().from("horoscope_profiles").select("birth_date,birth_time,share_with_groups")
    .eq("user_id", uid).maybeSingle();
  fail(error);
  if (!data) return null;
  const row = data as { birth_date: string; birth_time: string | null; share_with_groups: boolean };
  return { ...row, birth_time: row.birth_time ? row.birth_time.slice(0, 5) : null };
}

export async function saveHoroProfile(p: HoroProfile): Promise<void> {
  const uid = await ensureSession();
  const { error } = await supabase().from("horoscope_profiles").upsert(
    { user_id: uid, birth_date: p.birth_date, birth_time: p.birth_time, share_with_groups: p.share_with_groups, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  fail(error);
}

export async function deleteHoroProfile(): Promise<void> {
  const uid = await ensureSession();
  const { error } = await supabase().from("horoscope_profiles").delete().eq("user_id", uid);
  fail(error);
}

export async function getGroupHoroscopes(id: string): Promise<GroupHoro[]> {
  await ensureSession();
  const { data, error } = await supabase().rpc("group_horoscopes", { p_id: id });
  fail(error);
  return (data ?? []) as GroupHoro[];
}
