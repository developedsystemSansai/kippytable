// Daily reading + compatibility. For entertainment only. Deterministic: same person + same day => same reading.
import {
  LANNA, SIGNS, aspect, branchRelation, dayAnimal, lannaYear, natal, skyAt, weekdayOf, yamOf,
  type Aspect, type Branch, type Element,
} from "./astro";

export type Cat = "love" | "work" | "money" | "health";
export const CATS: { key: Cat; th: string }[] = [
  { key: "love", th: "ความรัก" }, { key: "work", th: "การงาน" }, { key: "money", th: "การเงิน" }, { key: "health", th: "สุขภาพ" },
];

export type Person = { birth_date: string; birth_time: string | null };

export type Reading = {
  date: string;
  overall: number;                 // 0..100
  stars: Record<Cat, number>;      // 1..5
  headline: string;
  lines: Record<Cat, string>;
  luckyColor: { name: string; hex: string };
  luckyNumber: number;
  sunSign: string;
  ascSign: string | null;
  moonSignToday: string;
  phaseName: string;
  western: string;
  lannaYear: string;               // e.g. "ปีสะง้า (มะเมีย)"
  lannaDay: string;                // today's day animal
  northern: string;
  yam: string | null;
  shiftTip: string | null;
  sunEl: Element;                  // element of the natal sun sign
  branch: Branch;                  // relation between birth-year animal and today's day animal
};

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = <T,>(arr: T[], seed: string): T => arr[hashStr(seed) % arr.length];
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

const ASPECT_ADJ: Record<Aspect, number> = { trine: 1.5, sextile: 1, conjunct: 0.5, minor: 0, square: -1, opposite: -1 };
const BRANCH_ADJ: Record<Branch, number> = { harmony: 1, trine: 1, same: 0.5, neutral: 0, harm: -1, clash: -1.5 };

const WEEKDAY_COLOR = [
  { name: "แดง", hex: "#d64545" }, { name: "เหลือง", hex: "#e2b400" }, { name: "ชมพู", hex: "#e06fa0" },
  { name: "เขียว", hex: "#3b9a5a" }, { name: "ส้ม", hex: "#e8872b" }, { name: "ฟ้า", hex: "#3d8fd1" }, { name: "ม่วง", hex: "#7a55c4" },
];

const clashEl = (a: Element, b: Element) => (a === "fire" && b === "water") || (a === "water" && b === "fire") || (a === "earth" && b === "air") || (a === "air" && b === "earth");

const YAM_NAMES = ["ยามกลางวันที่ 1 (06–09 น.)", "ยามกลางวันที่ 2 (09–12 น.)", "ยามกลางวันที่ 3 (12–15 น.)", "ยามกลางวันที่ 4 (15–18 น.)",
  "ยามกลางคืนที่ 1 (18–21 น.)", "ยามกลางคืนที่ 2 (21–24 น.)", "ยามกลางคืนที่ 3 (00–03 น.)", "ยามกลางคืนที่ 4 (03–06 น.)"];

function phaseName(p: number): string {
  if (p < 20 || p >= 340) return "จันทร์ดับ (เริ่มรอบใหม่)";
  if (p < 160) return "ข้างขึ้น";
  if (p < 200) return "จันทร์เพ็ญ";
  return "ข้างแรม";
}

const TEXT: Record<Cat, { low: string[]; mid: string[]; high: string[] }> = {
  love: {
    low: ["วันนี้อารมณ์ไวกว่าปกติ ถ้าจะคุยเรื่องหัวใจ รอให้ใจเย็นก่อนค่อยพูด", "คำพูดห้วนๆ อาจทำให้เข้าใจผิดได้ ลองส่งข้อความดีๆ ให้คนสำคัญสักข้อความ", "อยู่เงียบๆ กับตัวเองบ้างก็ดี ไม่ต้องรีบตัดสินใจเรื่องความสัมพันธ์"],
    mid: ["ความสัมพันธ์ราบรื่นตามปกติ การทักทายเล็กๆ น้อยๆ ช่วยให้วันนี้อบอุ่นขึ้น", "คนใกล้ตัวอยากได้ยินคำขอบคุณจากคุณ ลองพูดออกไปตรงๆ", "เหมาะกับการใช้เวลาธรรมดาๆ กับคนที่รัก ไม่ต้องหวือหวา"],
    high: ["เสน่ห์ส่งแรง คนรอบข้างใจดีกับคุณเป็นพิเศษ เหมาะกับการเปิดใจ", "มีโอกาสได้ยินข่าวดีหรือคำชมจากคนที่แคร์ ยิ้มรับไว้เลย", "วันดีสำหรับการคุยเคลียร์เรื่องค้างคา บรรยากาศเอื้อมาก"],
  },
  work: {
    low: ["งานอาจติดขัดนิดหน่อย เช็กซ้ำสองรอบก่อนส่งต่อ และจดเรื่องสำคัญไว้", "อย่ารับงานเพิ่มเกินกำลัง ขอความช่วยเหลือเพื่อนร่วมงานได้ ไม่เสียหน้า", "จังหวะยังไม่เข้าข้างเรื่องการตัดสินใจใหญ่ ทำงานประจำให้เรียบร้อยก็พอ"],
    mid: ["งานเดินได้ตามแผน ถ้าจัดลำดับความสำคัญดีๆ จะเสร็จก่อนเวลา", "เพื่อนร่วมงานพร้อมช่วย ลองแบ่งงานกันตั้งแต่ต้นเวร", "วันนี้เหมาะกับการเก็บงานค้าง ทำให้เสร็จทีละอย่าง"],
    high: ["สมาธิดี ตัดสินใจเฉียบ งานที่ยากจะผ่านไปได้ง่ายกว่าที่คิด", "มีโอกาสได้รับความไว้วางใจหรือคำชมจากหัวหน้า ทำเต็มที่ได้เลย", "ไอเดียลื่น เหมาะกับการเสนอสิ่งที่คิดไว้นานแล้ว"],
  },
  money: {
    low: ["ระวังรายจ่ายจุกจิกที่ไม่ได้วางแผน ชะลอการซื้อของชิ้นใหญ่ไว้ก่อน", "เช็กยอดและบิลให้ละเอียด อย่าเพิ่งให้ยืมเงินถ้ายังไม่แน่ใจ", "วันนี้เก็บออมดีกว่าใช้จ่าย ตั้งงบวันนี้ไว้ล่วงหน้า"],
    mid: ["การเงินนิ่งๆ ไม่มีอะไรผิดปกติ จดรายรับรายจ่ายสั้นๆ ก็ช่วยได้มาก", "ถ้ามีค่าเวรเข้าเดือนนี้ ลองกันส่วนหนึ่งเข้าออมก่อนใช้", "ไม่มีโชคก้อนใหญ่ แต่ก็ไม่มีรั่วไหล ถือว่าสบาย"],
    high: ["มีจังหวะได้รายได้เสริมหรือประหยัดได้มากกว่าที่คิด", "เรื่องเงินเข้าทางดี เหมาะกับการวางแผนออมหรือจัดการหนี้", "ค่าเวรหรือเงินพิเศษอาจมาเร็วกว่าที่คิด เก็บไว้ให้ดี"],
  },
  health: {
    low: ["ร่างกายอาจเพลียง่าย ดื่มน้ำให้พอและพักสายตาเป็นระยะ", "อย่าฝืนเกินไป ถ้าเวรหนัก ให้หาเวลานั่งพักสั้นๆ ทุกชั่วโมงสองชั่วโมง", "ระวังเรื่องนอนไม่พอ งีบสั้นๆ ก่อนเข้าเวรช่วยได้"],
    mid: ["สุขภาพโดยรวมโอเค ยืดเส้นยืดสายสักหน่อยระหว่างวัน", "กินอาหารตรงเวลาจะช่วยให้พลังงานคงที่ทั้งเวร", "ดื่มน้ำและเดินเบาๆ ช่วยให้ไม่ล้า"],
    high: ["พลังดีเกินคาด เหมาะกับการออกกำลังกายเบาๆ หลังเลิกเวร", "ร่างกายฟื้นตัวไว นอนหลับได้ลึกกว่าปกติ", "อารมณ์สดใส ช่วยให้รับมือความเครียดได้ดี"],
  },
};

const HEADLINE = {
  low: ["วันนี้ค่อยๆ ไป ไม่ต้องรีบ", "วันนี้ควรใจเย็นไว้ก่อน", "พักใจและระวังคำพูดสักหน่อย"],
  mid: ["วันธรรมดาที่ทำให้ดีได้", "วันนี้ทุกอย่างอยู่ในจังหวะปกติ", "ค่อยเป็นค่อยไป เดี๋ยวก็ถึง"],
  high: ["วันนี้ดวงเข้าข้าง!", "พลังดี ลุยได้เลย", "วันดีที่ควรทำเรื่องที่ตั้งใจไว้"],
};

const WESTERN_ASPECT: Record<Aspect, string> = {
  trine: "จันทร์จรอยู่ในมุมเกื้อกูลกับราศีเกิดของคุณ ความรู้สึกลื่นไหล ได้รับแรงหนุนจากคนรอบข้าง",
  sextile: "จันทร์จรทำมุมสนับสนุนราศีเกิด มีโอกาสเล็กๆ เข้ามา ถ้าคว้าไว้จะต่อยอดได้",
  conjunct: "จันทร์จรอยู่ราศีเดียวกับราศีเกิด อารมณ์เด่นชัด ใจอยากทำตามความรู้สึกมากกว่าปกติ",
  minor: "จันทร์จรไม่ได้ส่งผลแรงกับราศีเกิดวันนี้ จึงเป็นวันที่เรากำหนดจังหวะเองได้",
  square: "จันทร์จรทำมุมตึงกับราศีเกิด อาจรู้สึกขัดใจหรือหงุดหงิดง่าย ให้พักหายใจก่อนตอบ",
  opposite: "จันทร์จรอยู่ตรงข้ามราศีเกิด ความคิดเห็นอาจขัดกับคนอื่น ลองฟังให้จบก่อน",
};

const NORTHERN_REL: Record<Branch, string> = {
  harmony: "ถูกโฉลกกัน (คู่ผสาน) เหมาะกับการเจรจา ขอความช่วยเหลือ และทำงานเป็นทีม",
  trine: "เป็นพวกเดียวกันตามรอบนักษัตร (สามประสาน) ทำอะไรร่วมกับคนอื่นง่ายขึ้น",
  same: "ตรงกับนักษัตรของตัวเอง เป็นวันที่ใจนิ่ง แต่ยึดความคิดตัวเองค่อนข้างมาก",
  clash: "นักษัตรวันนี้ปะทะกับปีเกิด (ชง) ให้ระวังเรื่องเร่งรีบ ขับรถหรือทำหัตถการให้รอบคอบเป็นพิเศษ",
  harm: "นักษัตรวันนี้เป็นคู่เสียดทาน เรื่องเล็กน้อยอาจกลายเป็นความไม่เข้าใจ พูดจาอ่อนโยนไว้",
  neutral: "นักษัตรวันนี้ไม่ได้เด่นเรื่องดีหรือร้ายกับปีเกิด ใช้วิจารณญาณของตัวเองได้เต็มที่",
};

const SHIFT_TIPS: Record<string, string[]> = {
  เช้า: ["เวรเช้า: เตรียมของไว้ตั้งแต่คืนก่อน แล้วจะเริ่มวันได้ลื่นขึ้น", "เวรเช้า: กินมื้อเช้าให้พอ น้ำตาลไม่ตกกลางเวร"],
  บ่าย: ["เวรบ่าย: งีบสั้นๆ ก่อนเข้าเวร ช่วงเย็นจะเหนื่อยน้อยลง", "เวรบ่าย: จัดลำดับงานตั้งแต่ต้นเวร ช่วงปลายเวรจะไม่ลน"],
  ดึก: ["เวรดึก: เตรียมน้ำ ของว่างเบาๆ และแสงสว่างพอ เลี่ยงคาเฟอีนช่วงท้ายเวร", "เวรดึก: หลังเลิกเวรอย่าขับรถตอนง่วงจัด พักก่อนกลับบ้านถ้าจำเป็น"],
  OT: ["OT: จดเวลาเข้าออกไว้ให้ครบ กันตกหล่นตอนเบิก", "OT: พักให้พอระหว่างเวรปกติกับ OT ร่างกายจะอยู่ได้นาน"],
  หยุด: ["วันหยุด: ให้รางวัลตัวเองสักอย่าง แล้วนอนให้เต็มอิ่ม", "วันหยุด: ใช้เวลากับคนที่รักหรืองานอดิเรก ชาร์จพลังไว้ก่อนเวรถัดไป"],
};

export function dailyReading(p: Person, date: string, todayShift?: string | null): Reading {
  const n = natal(p.birth_date, p.birth_time);
  const sky = skyAt(date);
  const dayAn = dayAnimal(date);
  const yearAn = lannaYear(p.birth_date);
  const rel = branchRelation(yearAn, dayAn);
  const asp = aspect(n.sun, sky.moon);
  const ascAsp = n.asc != null ? aspect(n.asc, sky.moon) : null;
  const sunEl = SIGNS[n.sun].el;
  const moonEl = SIGNS[sky.moon].el;
  const base = 3;
  const w = ASPECT_ADJ[asp] + (ascAsp ? ASPECT_ADJ[ascAsp] * 0.5 : 0);
  const b = BRANCH_ADJ[rel];
  const phase = sky.phase;
  const waxing = phase >= 20 && phase < 160;
  const full = phase >= 160 && phase < 200;

  const raw: Record<Cat, number> = {
    love: base + w * 0.7 + b * 0.8 + ([1, 3, 6, 11].includes(sky.moon) ? 0.5 : 0) + (full ? 0.5 : 0),
    work: base + w * 0.7 + b * 1.0 + ([0, 4, 5, 9].includes(sky.moon) ? 0.5 : 0) + (waxing ? 0.5 : 0),
    money: base + w * 0.5 + b * 0.5 + ([1, 5, 7, 9].includes(sky.moon) ? 0.5 : 0) + (waxing ? 0.3 : 0),
    health: base + w * 0.4 + b * 0.5 + (sunEl === moonEl ? 0.5 : 0) - (clashEl(sunEl, moonEl) ? 0.5 : 0) - (full ? 0.5 : 0),
  };
  const stars = {} as Record<Cat, number>;
  (Object.keys(raw) as Cat[]).forEach((k) => { stars[k] = clamp(Math.round(raw[k]), 1, 5); });
  const mean = (stars.love + stars.work + stars.money + stars.health) / 4;
  const overall = Math.round((mean / 5) * 100);
  const tier = (s: number) => (s <= 2 ? "low" : s === 3 ? "mid" : "high") as "low" | "mid" | "high";
  const seed = `${p.birth_date}|${date}`;

  const lines = {} as Record<Cat, string>;
  for (const c of CATS) lines[c.key] = pick(TEXT[c.key][tier(stars[c.key])], `${seed}|${c.key}`);

  const label = todayShift?.trim();
  const tips = label ? SHIFT_TIPS[label] ?? (label.toUpperCase().startsWith("OT") ? SHIFT_TIPS.OT : null) : null;
  const y = LANNA[yearAn];
  const d = LANNA[dayAn];

  return {
    date,
    overall,
    stars,
    headline: pick(HEADLINE[tier(Math.round(mean))], `${seed}|h`),
    lines,
    luckyColor: WEEKDAY_COLOR[weekdayOf(date)],
    luckyNumber: (hashStr(`${seed}|n`) % 9) + 1,
    sunSign: `ราศี${SIGNS[n.sun].th}`,
    ascSign: n.asc != null ? `ราศี${SIGNS[n.asc].th}` : null,
    moonSignToday: `ราศี${SIGNS[sky.moon].th}`,
    phaseName: phaseName(phase),
    western: WESTERN_ASPECT[asp],
    lannaYear: `ปี${y.lanna} (${y.th})`,
    lannaDay: `วัน${d.lanna} (${d.th})`,
    northern: NORTHERN_REL[rel],
    yam: p.birth_time ? YAM_NAMES[yamOf(p.birth_time)] : null,
    shiftTip: tips ? pick(tips, `${seed}|t`) : null,
    sunEl,
    branch: rel,
  };
}

// ------------------------------------------------------------------ compatibility
const WEST_BASE: Record<Aspect, number> = { trine: 90, sextile: 82, conjunct: 78, opposite: 62, minor: 55, square: 48 };
const NORTH_BASE: Record<Branch, number> = { harmony: 92, trine: 88, same: 75, neutral: 65, harm: 45, clash: 38 };

const WEST_TEXT: Record<Aspect, string> = {
  trine: "ราศีเกิดอยู่ในมุมเกื้อกูลกัน เข้าใจกันง่าย จังหวะชีวิตไปด้วยกันได้",
  sextile: "ราศีเกิดสนับสนุนกัน ช่วยกันเติมเต็มได้ถ้าตั้งใจ",
  conjunct: "ราศีเดียวกัน เหมือนกันมากจนบางครั้งชนกันเอง แต่เข้าใจกันเร็ว",
  opposite: "ราศีตรงข้ามกัน ต่างแต่ดึงดูดกัน ถ้ายอมรับความต่างจะเสริมกันดี",
  minor: "ราศีไม่ได้ผูกพันกันโดยตรง ความสัมพันธ์ขึ้นกับนิสัยและการปรับตัวมากกว่า",
  square: "ราศีเกิดทำมุมตึง ต่างความคิดบ่อย แต่ท้าทายให้ทั้งคู่เติบโต",
};
const NORTH_TEXT: Record<Branch, string> = {
  harmony: "ปีนักษัตรเป็นคู่ผสาน ถูกโฉลกกัน คุยกันรู้เรื่อง",
  trine: "ปีนักษัตรอยู่ในหมู่สามประสานเดียวกัน ไปทางเดียวกันได้ง่าย",
  same: "ปีนักษัตรเดียวกัน เข้าใจกันดี แต่ต้องระวังความดื้อพอกัน",
  neutral: "ปีนักษัตรไม่เด่นเรื่องถูกหรือขัดกัน ปล่อยให้เป็นไปตามนิสัยของทั้งคู่",
  harm: "ปีนักษัตรเป็นคู่เสียดทาน เรื่องเล็กน้อยอาจเป็นเรื่องใหญ่ ควรพูดตรงๆ ด้วยความนุ่มนวล",
  clash: "ปีนักษัตรปะทะกัน (ชง) อาจเห็นต่างบ่อย ต้องให้เกียรติและเว้นระยะเวลาเย็นลงก่อนคุย",
};

export type Compat = { score: number; westernScore: number; northernScore: number; western: string; northern: string; verdict: string };

export function compatibility(a: Person, b: Person): Compat {
  const na = natal(a.birth_date, null);
  const nb = natal(b.birth_date, null);
  const asp = aspect(na.sun, nb.sun);
  let w = WEST_BASE[asp];
  const ea = SIGNS[na.sun].el, eb = SIGNS[nb.sun].el;
  if (ea === eb) w += 5;
  else if ((ea === "fire" && eb === "air") || (ea === "air" && eb === "fire") || (ea === "earth" && eb === "water") || (ea === "water" && eb === "earth")) w += 5;
  else if (clashEl(ea, eb)) w -= 5;
  w = clamp(w, 20, 99);
  const rel = branchRelation(lannaYear(a.birth_date), lannaYear(b.birth_date));
  const nth = NORTH_BASE[rel];
  const score = Math.round((w + nth) / 2);
  const verdict = score >= 85 ? "เข้ากันดีมาก" : score >= 70 ? "เข้ากันดี" : score >= 55 ? "เข้ากันพอใช้ ปรับเข้าหากันได้" : "ต่างกันค่อนข้างมาก ต้องใช้ความเข้าใจ";
  return { score, westernScore: w, northernScore: nth, western: WEST_TEXT[asp], northern: NORTH_TEXT[rel], verdict };
}

export function overallFor(p: Person, date: string): number {
  return dailyReading(p, date).overall;
}
