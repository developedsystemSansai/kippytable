// "Tarot book": cards the user chose to keep, and how many they let go. Stored on this device only.
import type { Draw } from "./tarot";

const KEY = "kippy_tarot_book_v1";

export type Entry = { card: number; count: number; rev: number; first: string; last: string };
export type Decision = "keep" | "release" | null;
export type Book = {
  cards: Record<number, Entry>;
  released: number;
  fav: number | null;
  daily: { date: string; d: "keep" | "release" } | null;
};

export const emptyBook = (): Book => ({ cards: {}, released: 0, fav: null, daily: null });

export function loadBook(): Book {
  try {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(KEY);
    if (!raw) return emptyBook();
    const b = JSON.parse(raw) as Partial<Book>;
    const cards: Record<number, Entry> = {};
    for (const [k, v] of Object.entries(b.cards ?? {})) {
      const n = Number(k), e = v as Entry;
      if (Number.isInteger(n) && n >= 0 && n < 22 && e && typeof e.count === "number") cards[n] = { card: n, count: e.count, rev: e.rev ?? 0, first: e.first, last: e.last };
    }
    return {
      cards,
      released: Number.isFinite(b.released) ? Number(b.released) : 0,
      fav: typeof b.fav === "number" && cards[b.fav] ? b.fav : null,
      daily: b.daily && typeof b.daily.date === "string" && (b.daily.d === "keep" || b.daily.d === "release") ? b.daily : null,
    };
  } catch { return emptyBook(); }
}

export function saveBook(b: Book) { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch {} }

export const collectedCount = (b: Book) => Object.keys(b.cards).length;

export const MILESTONES: Record<number, string> = {
  1: "ไพ่ใบแรกในสมุดของคุณแล้ว เริ่มสะสมได้เลย",
  5: "เก็บครบ 5 ใบแล้ว เริ่มเป็นนักสะสมไพ่",
  11: "ครึ่งสำรับแล้ว อีกแค่ 11 ใบ",
  22: "ครบทั้งสำรับ Major Arcana 22 ใบ ยอดเยี่ยมมาก",
};

export function keepCard(b: Book, d: Draw, date: string): { book: Book; isNew: boolean; milestone: number | null } {
  const prev = b.cards[d.card];
  const entry: Entry = { card: d.card, count: (prev?.count ?? 0) + 1, rev: (prev?.rev ?? 0) + (d.reversed ? 1 : 0), first: prev?.first ?? date, last: date };
  const book: Book = { ...b, cards: { ...b.cards, [d.card]: entry } };
  const n = collectedCount(book);
  return { book, isNew: !prev, milestone: !prev && MILESTONES[n] ? n : null };
}
export const releaseCard = (b: Book): Book => ({ ...b, released: b.released + 1 });
export const markDaily = (b: Book, date: string, d: "keep" | "release"): Book => ({ ...b, daily: { date, d } });
export const setFav = (b: Book, card: number | null): Book => ({ ...b, fav: card });
