// All dates are plain "YYYY-MM-DD" strings (no time zone ambiguity).
export const TZ = "Asia/Bangkok";

export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
export const THAI_WEEKDAYS_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_MONTH = /^\d{4}-\d{2}$/;

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function isValidISO(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Cells for a month grid (Sunday first). Leading nulls pad to the first weekday. */
export function monthCells(y: number, m: number): (string | null)[] {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toISO(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null); // complete the last row so the table closes
  return cells;
}

export function thaiMonthTitle(y: number, m: number): string {
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export function thaiDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${THAI_WEEKDAYS_SHORT[wd]}. ${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export function shiftMonth(y: number, m: number, delta: number): [number, number] {
  const idx = y * 12 + (m - 1) + delta;
  return [Math.floor(idx / 12), (idx % 12) + 1];
}
