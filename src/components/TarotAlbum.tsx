"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { thaiDateLong } from "@/lib/dates";
import { collectedCount, emptyBook, saveBook, setFav, type Book } from "@/lib/tarotBook";
import { EXAMPLES, META, TAROT, cardSrc } from "@/lib/tarot";

/** The collection: 22 slots, kept cards in colour, the rest waiting. Tap a card for its meaning and your history with it. */
export default function TarotAlbum({ book, onChange, onDraw }: { book: Book; onChange: (b: Book) => void; onDraw: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const n = collectedCount(book);
  const pct = Math.round((n / 22) * 100);

  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  function toggleFav(card: number) {
    const next = setFav(book, book.fav === card ? null : card);
    onChange(next); saveBook(next);
  }
  function clearAll() {
    if (!confirm("ล้างสมุดไพ่ทั้งหมด? ไพ่ที่เก็บไว้จะหายไป")) return;
    const next = emptyBook(); onChange(next); saveBook(next); setOpen(null);
  }

  const sel = open !== null ? { c: TAROT[open], m: META[open], e: book.cards[open] } : null;

  return (
    <>
      <section className="block">
        <h2>สมุดไพ่ของฉัน</h2>
        <p className="muted">ไพ่ที่คุณเลือกเก็บไว้หลังเปิดไพ่ สะสมให้ครบทั้งสำรับ 22 ใบ</p>
        <div className={`talbum-head${n === 22 ? " is-full" : ""}`}>
          <div className="talbum-count"><b>{n}</b><span>/ 22 ใบ</span></div>
          <div className="bar" aria-label={`เก็บแล้ว ${n} จาก 22 ใบ`}><span style={{ width: `${pct}%` }} /></div>
          <div className="chips">
            <span className="chip">ปล่อยไปแล้ว {book.released} ใบ</span>
            {book.fav !== null && <span className="chip chip-fav">ไพ่คู่ใจ: {TAROT[book.fav].th}</span>}
            {n === 22 && <span className="chip chip-fav">ครบสำรับ</span>}
          </div>
        </div>

        <div className="talbum">
          {TAROT.map((c, i) => {
            const e = book.cards[i], m = META[i];
            return e ? (
              <button key={i} className={`tslot has${book.fav === i ? " is-fav" : ""}`} style={{ "--h": m.hue, "--i": i } as CSSProperties} onClick={() => setOpen(i)} aria-label={`${c.th} เก็บแล้ว ${e.count} ครั้ง`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cardSrc(i)} alt="" width={320} height={400} draggable={false} />
                {e.count > 1 && <span className="tslot-count">×{e.count}</span>}
                {book.fav === i && <span className="tslot-fav" aria-hidden>★</span>}
              </button>
            ) : (
              <span key={i} className="tslot empty" style={{ "--i": i } as CSSProperties} aria-label={`ไพ่ใบที่ ${c.n} ยังไม่ได้เก็บ`}>
                <b>{c.n}</b><i>?</i>
              </span>
            );
          })}
        </div>

        {n === 0 && (
          <div className="empty">
            <p><strong>ยังไม่มีไพ่ในสมุด</strong><span>เปิดไพ่แล้วกด &quot;เก็บไว้&quot; กับใบที่ถูกใจ ไพ่ที่ไม่อยากเก็บ ปล่อยไปได้เลย</span></p>
          </div>
        )}
        <button className="btn" onClick={onDraw}>ไปเปิดไพ่เพิ่ม</button>
        {n > 0 && <button className="btn danger" onClick={clearAll}>ล้างสมุดไพ่</button>}
        <p className="disclaimer">สมุดไพ่เก็บไว้ในเครื่องนี้เท่านั้น ไม่ถูกส่งไปที่ใด การเก็บหรือปล่อยไพ่เป็นเพียงกิจกรรมสร้างกำลังใจ ไม่ได้มีผลต่อดวงจริง</p>
      </section>

      {sel && open !== null && (
        <>
          <div className="backdrop" onClick={() => setOpen(null)} />
          <div className="sheet tsheet" role="dialog" aria-modal="true" aria-label={sel.c.th} style={{ "--h": sel.m.hue } as CSSProperties}>
            <div className="tsheet-top">
              <span className="taura on" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cardSrc(open)} alt="" width={320} height={400} className="tsheet-img" />
            </div>
            <strong className="tsheet-title">{sel.c.th} <span className="ten">{sel.c.en}</span></strong>
            <div className="chips" style={{ justifyContent: "center" }}>{sel.m.kw.map((k) => <span key={k} className="chip chip-kw">{k}</span>)}</div>
            <p style={{ margin: 0 }}>{sel.c.up}</p>
            <div className="ex"><span className="ex-tag">ตัวอย่าง</span><p>{EXAMPLES[open].up}</p></div>
            {sel.e && <p className="muted" style={{ margin: 0 }}>เก็บครั้งแรก {thaiDateLong(sel.e.first)} · ล่าสุด {thaiDateLong(sel.e.last)} · รวม {sel.e.count} ครั้ง{sel.e.rev ? ` (กลับหัว ${sel.e.rev})` : ""}</p>}
            <button className="btn" onClick={() => toggleFav(open)}>{book.fav === open ? "ยกเลิกไพ่คู่ใจ" : "ตั้งเป็นไพ่คู่ใจ"}</button>
            <button className="btn quiet" onClick={() => setOpen(null)}>ปิด</button>
          </div>
        </>
      )}
    </>
  );
}
