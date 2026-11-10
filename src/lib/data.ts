"use client";
import { supabase, ensureSession } from "./supabase";
import { shiftMonth } from "./dates";
import type { Group, GroupMemberDay, IncomeMonth, Me, Shift } from "./types";

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

export type ShiftFields = Omit<Shift, "date">;

export async function getMe(): Promise<Me> {
  const uid = await ensureSession();
  const { data, error } = await supabase().from("profiles").select("id,name,picture").eq("id", uid).single();
  fail(error);
  return data as Me;
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
