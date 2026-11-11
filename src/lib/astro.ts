// Pure astronomy + zodiac helpers (no React). Accuracy: Sun ~0.01 deg, Moon ~0.3 deg, Ascendant depends on birth place/time.
// Entertainment use only.

const RAD = Math.PI / 180;
const norm = (d: number) => ((d % 360) + 360) % 360;

/** Julian Day from a UTC instant. */
export function julianDay(ms: number): number {
  return ms / 86400000 + 2440587.5;
}

/** Julian Day for a Thai local civil date/time (UTC+7). */
export function jdFromThai(iso: string, time?: string | null): number {
  const [y, m, d] = iso.split("-").map(Number);
  const [hh, mm] = (time ?? "12:00").split(":").map(Number);
  return julianDay(Date.UTC(y, m - 1, d, hh - 7, mm || 0));
}

export function sunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const L = 280.460 + 36000.771 * T;
  const g = (357.528 + 35999.050 * T) * RAD;
  return norm(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
}

export function moonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const s = (a: number, b: number) => Math.sin((a + b * T) * RAD);
  return norm(
    218.32 + 481267.881 * T
    + 6.29 * s(135.0, 477198.87)
    - 1.27 * s(259.3, -413335.36)
    + 0.66 * s(235.7, 890534.22)
    + 0.21 * s(269.9, 954397.74)
    - 0.19 * s(357.5, 35999.05)
    - 0.11 * s(186.5, 966404.03),
  );
}

/** Tropical ascendant for a place (deg north / deg east). */
export function ascendant(jd: number, latDeg: number, lonDeg: number): number {
  const T = (jd - 2451545.0) / 36525;
  const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  const ramc = norm(gmst + lonDeg) * RAD;
  const eps = (23.4392911 - 0.0130042 * T) * RAD;
  const phi = latDeg * RAD;
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
  return norm(asc / RAD);
}

export const BANGKOK = { lat: 13.75, lon: 100.5 };

// ---------------------------------------------------------------- Western zodiac
export type Element = "fire" | "earth" | "air" | "water";
export type Sign = { th: string; en: string; el: Element; mode: "cardinal" | "fixed" | "mutable" };
export const SIGNS: Sign[] = [
  { th: "เมษ", en: "Aries", el: "fire", mode: "cardinal" },
  { th: "พฤษภ", en: "Taurus", el: "earth", mode: "fixed" },
  { th: "มิถุน", en: "Gemini", el: "air", mode: "mutable" },
  { th: "กรกฎ", en: "Cancer", el: "water", mode: "cardinal" },
  { th: "สิงห์", en: "Leo", el: "fire", mode: "fixed" },
  { th: "กันย์", en: "Virgo", el: "earth", mode: "mutable" },
  { th: "ตุลย์", en: "Libra", el: "air", mode: "cardinal" },
  { th: "พิจิก", en: "Scorpio", el: "water", mode: "fixed" },
  { th: "ธนู", en: "Sagittarius", el: "fire", mode: "mutable" },
  { th: "มังกร", en: "Capricorn", el: "earth", mode: "cardinal" },
  { th: "กุมภ์", en: "Aquarius", el: "air", mode: "fixed" },
  { th: "มีน", en: "Pisces", el: "water", mode: "mutable" },
];
export const ELEMENT_TH: Record<Element, string> = { fire: "ธาตุไฟ", earth: "ธาตุดิน", air: "ธาตุลม", water: "ธาตุน้ำ" };

export const signOf = (lon: number) => Math.floor(norm(lon) / 30);

export type Natal = {
  sun: number;
  moon: number | null; // only when birth time is known
  asc: number | null;  // only when birth time is known
};

export function natal(birthDate: string, birthTime: string | null): Natal {
  const jd = jdFromThai(birthDate, birthTime);
  return {
    sun: signOf(sunLongitude(jd)),
    moon: birthTime ? signOf(moonLongitude(jd)) : null,
    asc: birthTime ? signOf(ascendant(jd, BANGKOK.lat, BANGKOK.lon)) : null,
  };
}

export type Sky = { moon: number; sun: number; phase: number }; // phase = elongation 0..360
export function skyAt(isoDate: string): Sky {
  const jd = jdFromThai(isoDate, "12:00");
  const m = moonLongitude(jd);
  const s = sunLongitude(jd);
  return { moon: signOf(m), sun: signOf(s), phase: norm(m - s) };
}

/** Relationship between two signs by distance in signs. */
export type Aspect = "conjunct" | "sextile" | "square" | "trine" | "opposite" | "minor";
export function aspect(a: number, b: number): Aspect {
  const d = Math.abs(a - b) % 12;
  const k = Math.min(d, 12 - d);
  return k === 0 ? "conjunct" : k === 2 ? "sextile" : k === 3 ? "square" : k === 4 ? "trine" : k === 6 ? "opposite" : "minor";
}

// ---------------------------------------------------------------- Northern Thai (Lanna) animal-year cycle
export const LANNA = [
  { lanna: "ใจ้", th: "ชวด" }, { lanna: "เป้า", th: "ฉลู" }, { lanna: "ยี", th: "ขาล" }, { lanna: "เหม้า", th: "เถาะ" },
  { lanna: "สี", th: "มะโรง" }, { lanna: "ไส้", th: "มะเส็ง" }, { lanna: "สะง้า", th: "มะเมีย" }, { lanna: "เม็ด", th: "มะแม" },
  { lanna: "สัน", th: "วอก" }, { lanna: "เร้า", th: "ระกา" }, { lanna: "เส็ด", th: "จอ" }, { lanna: "ไค้", th: "กุน" },
];

/** Animal index 0..11 (0 = ใจ้/ชวด). The year turns at Pi Mai Mueang (วันพญาวัน, ~15 April), simplified. */
export function lannaYear(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const yy = m < 4 || (m === 4 && d < 15) ? y - 1 : y;
  return (((yy - 4) % 12) + 12) % 12;
}

/** Day animal in the standard repeating 12-day cycle (0 = ใจ้). Anchored: 2000-01-01 is a "horse" day. */
export function dayAnimal(isoDate: string): number {
  const jd = Math.floor(jdFromThai(isoDate, "12:00") + 0.5);
  return (((jd + 1) % 12) + 12) % 12;
}

export type Branch = "harmony" | "trine" | "same" | "clash" | "harm" | "neutral";
const SIX_HARMONY: Record<number, number> = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
const TRINES = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
const HARMS: Record<number, number> = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 };

export function branchRelation(a: number, b: number): Branch {
  if (a === b) return "same";
  if (SIX_HARMONY[a] === b) return "harmony";
  if (TRINES.some((t) => t.includes(a) && t.includes(b))) return "trine";
  if ((a + 6) % 12 === b) return "clash";
  if (HARMS[a] === b) return "harm";
  return "neutral";
}

/** Birth "yam" (watch) from local time. 0..3 = daytime watches from 06:00, 4..7 = night watches from 18:00. */
export function yamOf(time: string): number {
  const [h] = time.split(":").map(Number);
  const x = (h - 6 + 24) % 24; // hours since 06:00
  return Math.floor(x / 3);
}

export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
