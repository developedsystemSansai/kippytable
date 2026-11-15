import { ISO_DATE, todayISO } from "./dates";

export type Tenure = { years: number; months: number; days: number };

const dayNum = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 86400000;
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Whole years/months/days from a start date (YYYY-MM-DD) to today (Thai time). null if invalid or in the future. */
export function tenure(startISO: string, nowISO: string = todayISO()): Tenure | null {
  if (!ISO_DATE.test(startISO) || !ISO_DATE.test(nowISO) || startISO > nowISO) return null;
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ny, nm, nd] = nowISO.split("-").map(Number);
  let months = (ny - sy) * 12 + (nm - sm);
  if (nd < sd) months -= 1;
  // Anchor = start + whole months, clamped to the month's length (31 Jan + 1 month = 28/29 Feb).
  const am = sm - 1 + months;
  const ay = sy + Math.floor(am / 12);
  const amo = (((am % 12) + 12) % 12) + 1;
  const ad = Math.min(sd, daysIn(ay, amo));
  return { years: Math.floor(months / 12), months: months % 12, days: dayNum(ny, nm, nd) - dayNum(ay, amo, ad) };
}

export function tenureText(t: Tenure): string {
  const parts: string[] = [];
  if (t.years) parts.push(`${t.years} ปี`);
  if (t.months) parts.push(`${t.months} เดือน`);
  if (t.days || !parts.length) parts.push(`${t.days} วัน`);
  return parts.join(" ");
}
