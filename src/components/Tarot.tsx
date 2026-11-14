"use client";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { track } from "@/lib/analytics";
import { todayISO } from "@/lib/dates";
import type { Person } from "@/lib/fortune";
import { shareText } from "@/lib/share";
import { META, SPREAD_LABELS, TAROT, cardLuck, cardSrc, dailyDraw, drawSpread, exampleOf, luckNote, spreadStory, spreadSummary, type Draw, type Mood } from "@/lib/tarot";
import { MILESTONES, collectedCount, keepCard, loadBook, markDaily, releaseCard, saveBook, type Book, type Decision } from "@/lib/tarotBook";
import TarotAlbum from "./TarotAlbum";
import { SparkleBurst, Starfield } from "./Cosmos";

type Mode = "daily" | "three";
type Phase = "idle" | "shuffle" | "dealt";

const SHUFFLE_MS = 3200;
const SHUFFLE_MSGS = ["คิปปี้กำลังสับไพ่…", "ตั้งจิตให้นิ่ง นึกถึงเรื่องที่อยากรู้", "ไพ่เริ่มหมุนวน…", "กำลังคัดไพ่ที่ตรงกับคุณ", "พร้อมแล้ว แตะไพ่เพื่อเปิด"];
const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Card back: gold frame, crescent moon and a four-point star. Same 100:130 ratio as the card. */
function Back() {
  const star = (x: number, y: number, k: number) => `M${x} ${y - k}L${x + k * 0.27} ${y - k * 0.27}L${x + k} ${y}L${x + k * 0.27} ${y + k * 0.27}L${x} ${y + k}L${x - k * 0.27} ${y + k * 0.27}L${x - k} ${y}L${x - k * 0.27} ${y - k * 0.27}Z`;
  return (
    <svg viewBox="0 0 100 130" className="tback-art" aria-hidden fill="currentColor">
      <rect x="6" y="6" width="88" height="118" rx="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="11" width="78" height="108" rx="6" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".7" />
      {Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * Math.PI * 2; return <line key={i} x1={50 + Math.cos(t) * 29} y1={65 + Math.sin(t) * 29} x2={50 + Math.cos(t) * 41} y2={65 + Math.sin(t) * 41} stroke="currentColor" strokeWidth=".7" opacity={i % 2 ? 0.45 : 0.9} />; })}
      <circle cx="50" cy="65" r="26" fill="none" stroke="currentColor" strokeWidth=".9" />
      <path d="M58 43A24 24 0 1 0 58 87A19 19 0 1 1 58 43Z" />
      <path d={star(60, 65, 7)} />
      <path d={star(22, 22, 5)} /><path d={star(78, 22, 5)} /><path d={star(22, 108, 5)} /><path d={star(78, 108, 5)} />
      <path d={star(50, 19, 3.4)} opacity=".8" /><path d={star(50, 111, 3.4)} opacity=".8" />
    </svg>
  );
}

function Deck({ shuffling, onTap }: { shuffling: boolean; onTap?: () => void }) {
  return (
    <button className={`tdeck${shuffling ? " is-shuffling" : ""}`} onClick={onTap} disabled={!onTap} aria-label="กองไพ่ แตะเพื่อสับไพ่">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="tdeck-card" style={{ "--i": i } as CSSProperties}><Back /></span>
      ))}
    </button>
  );
}

function Card({ d, index, label, flipped, onFlip, decision, pre }: { d: Draw; index: number; label?: string; flipped: boolean; onFlip: () => void; decision: Decision; pre: boolean }) {
  const c = TAROT[d.card], m = META[d.card];
  const ref = useRef<HTMLButtonElement>(null);
  const [burst, setBurst] = useState(0);
  const [fx, setFx] = useState<{ mood: Mood; hue: number; power: number } | null>(null);
  const released = decision === "release" && !pre;

  // keeping lights the card gold; releasing lets it drift away as embers
  useEffect(() => {
    if (!decision || pre) return;
    setFx(decision === "keep" ? { mood: "light", hue: 48, power: 1.3 } : { mood: "shadow", hue: 20, power: 1 });
    setBurst((k) => k + 1);
  }, [decision, pre]);

  function flip() {
    if (flipped) return;
    setFx(null); onFlip(); setBurst((k) => k + 1);
    try { navigator.vibrate?.(d.card === 16 || d.card === 13 ? [18, 40, 28] : 18); } catch {}
  }
  // holographic tilt: only after the card is face up
  function move(e: PointerEvent<HTMLButtonElement>) {
    const el = ref.current; if (!el || !flipped || prefersReduced()) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`); el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - y) * 16}deg`); el.style.setProperty("--ry", `${(x - 0.5) * 16}deg`);
    el.dataset.hot = "1";
  }
  function leave() { const el = ref.current; if (!el) return; el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); delete el.dataset.hot; }

  return (
    <div className={`tcard-wrap deal${decision === "keep" ? " kept" : ""}${released ? " released" : ""}`} style={{ "--i": index, "--h": m.hue } as CSSProperties}>
      {label && <small className="tlabel">{label}</small>}
      <div className="tcard-slot">
        <span className={`taura${flipped ? " on" : ""}${d.reversed ? " rev" : ""}`} aria-hidden />
        <button ref={ref} disabled={released} className={`tcard${flipped ? " is-flipped" : ""}${d.reversed ? " is-rev" : ""}`} onClick={flip}
          onPointerMove={move} onPointerLeave={leave} onPointerUp={(e) => { if (e.pointerType !== "mouse") leave(); }}
          aria-label={flipped ? `${c.th} ${c.en}${d.reversed ? " (กลับหัว)" : ""}` : "ไพ่คว่ำ แตะเพื่อเปิด"}>
          <span className="tcard-tilt">
            <span className="tcard-inner">
              <span className="tface tback"><Back /><span className="tback-hint">แตะ</span></span>
              <span className="tface tfront">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cardSrc(d.card)} alt="" width={320} height={400} draggable={false} className={d.reversed ? "tflip" : ""} />
                <span className="tholo" aria-hidden />
                {d.reversed && <span className="trev-badge">กลับหัว</span>}
              </span>
            </span>
          </span>
        </button>
        {decision === "keep" && <span className="tkeep-ribbon">เก็บแล้ว</span>}
        {released && <span className="trelease-note">ปล่อยแล้ว</span>}
        <SparkleBurst fireKey={burst} mood={fx?.mood ?? (d.reversed && m.mood === "light" ? "mystic" : m.mood)} hue={fx?.hue ?? m.hue} power={fx?.power ?? (d.reversed ? 0.7 : 1)} />
      </div>
    </div>
  );
}

type Fate = { decision: Decision; pre: boolean; fresh: boolean; count: number };
function Reading({ d, label, i, fate, onKeep, onRelease, onAlbum }: { d: Draw; label?: string; i: number; fate: Fate; onKeep: () => void; onRelease: () => void; onAlbum: () => void }) {
  const c = TAROT[d.card], m = META[d.card], luck = cardLuck(d);
  return (
    <article className="treading" style={{ "--h": m.hue, "--d": `${i * 60}ms` } as CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cardSrc(d.card)} alt="" width={64} height={80} className={`treading-img${d.reversed ? " tflip" : ""}`} />
      <div className="treading-body">
        {label && <small className="tlabel-chip">{label}</small>}
        <strong>{c.th} <span className="ten">{c.en}</span></strong>
        <div className="chips">
          {d.reversed && <span className="chip chip-rev">กลับหัว</span>}
          {m.kw.map((k) => <span key={k} className="chip chip-kw">{k}</span>)}
        </div>
        <p>{d.reversed ? c.rev : c.up}</p>
        <div className="ex"><span className="ex-tag">ตัวอย่าง</span><p>{exampleOf(d)}</p></div>
        <div className="tkeep">
          <span className="tluck" aria-label={`พลังไพ่ ${luck} จาก 5`}>พลังไพ่ <b>{"★".repeat(luck)}</b><i>{"★".repeat(5 - luck)}</i></span>
          {fate.decision === null ? (
            <>
              <p className="tkeep-hint">{luckNote(luck)}{fate.count > 0 ? ` (คุณมีใบนี้แล้ว ×${fate.count})` : ""}</p>
              <div className="tkeep-row">
                <button className="btn" onClick={onKeep}>เก็บไว้ในสมุดไพ่</button>
                <button className="btn quiet" onClick={onRelease}>ปล่อยไป</button>
              </div>
            </>
          ) : fate.decision === "keep" ? (
            <p className="tkeep-done is-keep">
              {fate.pre ? "วันนี้คุณเก็บไพ่ใบนี้ไว้แล้ว" : fate.fresh ? "ไพ่ใหม่! เก็บเข้าสมุดแล้ว" : `เก็บเพิ่มแล้ว (มีใบนี้ ×${fate.count})`}{" "}
              <button className="link-btn" onClick={onAlbum}>ดูสมุดไพ่</button>
            </p>
          ) : (
            <p className="tkeep-done">{fate.pre ? "วันนี้คุณปล่อยไพ่ใบนี้ไปแล้ว" : "ปล่อยไพ่แล้ว ขอบคุณที่เตือนใจ ปล่อยวางได้เลย"}</p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Tarot({ person }: { person: Person }) {
  const [mode, setMode] = useState<Mode>("daily");
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<Draw[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [msg, setMsg] = useState(0);
  const [cutBurst, setCutBurst] = useState(0);
  const [sub, setSub] = useState<"draw" | "album">("draw");
  const [book, setBook] = useState<Book>(() => loadBook());
  const [decided, setDecided] = useState<Decision[]>([]);
  const [fresh, setFresh] = useState<boolean[]>([]);
  const [pre, setPre] = useState(false);
  const [celebrate, setCelebrate] = useState<number | null>(null);

  function start() {
    const next = mode === "daily" ? [dailyDraw(person.birth_date, todayISO())] : drawSpread(3);
    const today = todayISO();
    const already = mode === "daily" && book.daily?.date === today ? book.daily.d : null;
    setCards(next); setFlipped(next.map(() => false)); setMsg(0); setPhase("shuffle");
    setDecided(next.map(() => already)); setFresh(next.map(() => false)); setPre(!!already); setCelebrate(null);
    track("tarot_draw", { mode });
  }

  useEffect(() => {
    if (phase !== "shuffle") return;
    const total = prefersReduced() ? 700 : SHUFFLE_MS;
    const m = setInterval(() => setMsg((x) => Math.min(SHUFFLE_MSGS.length - 1, x + 1)), total / SHUFFLE_MSGS.length);
    const t = setTimeout(() => { setPhase("dealt"); setCutBurst((k) => k + 1); }, total);
    return () => { clearInterval(m); clearTimeout(t); };
  }, [phase]);

  const allOpen = flipped.length > 0 && flipped.every(Boolean);
  const share = () => {
    const lines = cards.map((d, i) => `${mode === "three" ? SPREAD_LABELS[i] + ": " : ""}${TAROT[d.card].en}${d.reversed ? " (กลับหัว)" : ""}`);
    shareText(`ไพ่ทาโร่ของฉันวันนี้\n${lines.join("\n")}\nจาก Kippy`, "คัดลอกผลไพ่แล้ว");
  };
  const openCount = flipped.filter(Boolean).length;

  function decide(i: number, dec: "keep" | "release") {
    if (decided[i]) return;
    const d = cards[i], date = todayISO();
    let b = book, isNew = false;
    if (dec === "keep") {
      const r = keepCard(b, d, date); b = r.book; isNew = r.isNew;
      if (r.milestone) setCelebrate(r.milestone);
    } else b = releaseCard(b);
    if (mode === "daily") b = markDaily(b, date, dec);
    setBook(b); saveBook(b);
    setDecided((a) => a.map((v, k) => (k === i ? dec : v)));
    setFresh((a) => a.map((v, k) => (k === i ? isNew : v)));
    try { navigator.vibrate?.(dec === "keep" ? [14, 30, 14] : 24); } catch {}
    track(dec === "keep" ? "tarot_keep" : "tarot_release", { card: d.card, reversed: d.reversed ? 1 : 0 });
  }
  const tabs = (
    <div className="seg-wrap" role="group" aria-label="ส่วนของไพ่ทาโร่">
      <button aria-pressed={sub === "draw"} onClick={() => setSub("draw")}>เปิดไพ่</button>
      <button aria-pressed={sub === "album"} onClick={() => setSub("album")}>สมุดไพ่ ({collectedCount(book)}/22)</button>
    </div>
  );

  if (sub === "album") return <>{tabs}<TarotAlbum book={book} onChange={setBook} onDraw={() => setSub("draw")} /></>;

  return (
    <>
      {tabs}
      <section className="block">
        <h2>เปิดไพ่ทาโร่กับคิปปี้</h2>
        <p className="muted">ตั้งใจนึกถึงเรื่องที่อยากรู้ แล้วเลือกรูปแบบการเปิดไพ่</p>
        <div className="seg-wrap" role="group" aria-label="รูปแบบการเปิดไพ่">
          <button aria-pressed={mode === "daily"} disabled={phase === "shuffle"} onClick={() => { setMode("daily"); setPhase("idle"); }}>ไพ่ประจำวัน (1 ใบ)</button>
          <button aria-pressed={mode === "three"} disabled={phase === "shuffle"} onClick={() => { setMode("three"); setPhase("idle"); }}>ไพ่ 3 ใบ</button>
        </div>
        <p className="hint">{mode === "daily" ? "ได้ไพ่ใบเดิมตลอดทั้งวัน กลับมาดูซ้ำได้" : "ตอนนี้ · สิ่งที่ต้องระวัง · แนวทางที่ควรทำ สับใหม่ได้ทุกครั้ง"}</p>

        <div className={`tstage${allOpen ? " is-complete" : ""}${phase === "dealt" ? " is-dealt" : ""}`}>
          <div className="tstage-bg" aria-hidden><Starfield seed="tarot-table" density={1.1} /></div>
          <div className="tstage-glow" aria-hidden />
          <div className="tstage-body" aria-live="polite">
            {phase === "idle" && (
              <div className="tstage-idle">
                <Deck shuffling={false} onTap={start} />
                <p className="tstage-cap">แตะกองไพ่ หรือกดปุ่มด้านล่างเพื่อเริ่ม</p>
              </div>
            )}
            {phase === "shuffle" && (
              <div className="tstage-idle">
                <Deck shuffling />
                <p className="tstage-cap tstage-msg" key={msg}>{SHUFFLE_MSGS[msg]}</p>
                <div className="tstage-bar" aria-hidden><span style={{ animationDuration: `${prefersReduced() ? 700 : SHUFFLE_MS}ms` }} /></div>
                <button className="tstage-skip" onClick={() => { setPhase("dealt"); setCutBurst((k) => k + 1); }}>ข้าม</button>
              </div>
            )}
            {phase === "dealt" && (
              <>
                <div className={`tspread${cards.length === 1 ? " one" : ""}`}>
                  {cards.map((d, i) => (
                    <Card key={`${d.card}-${i}`} d={d} index={i} label={mode === "three" ? SPREAD_LABELS[i] : undefined} flipped={flipped[i]} decision={decided[i] ?? null} pre={pre}
                      onFlip={() => setFlipped((f) => f.map((v, k) => (k === i ? true : v)))} />
                  ))}
                </div>
                <p className="tstage-cap">{allOpen ? "เปิดครบแล้ว อ่านคำทำนายด้านล่างได้เลย" : cards.length > 1 ? `แตะไพ่เพื่อเปิดทีละใบ (${openCount}/${cards.length})` : "แตะไพ่เพื่อเปิด"}</p>
              </>
            )}
            <SparkleBurst fireKey={cutBurst} mood="mystic" power={0.8} />
          </div>
        </div>

        <button className="btn" disabled={phase === "shuffle"} onClick={start}>{phase === "dealt" ? "สับไพ่ใหม่" : "เริ่มเปิดไพ่"}</button>
      </section>

      {phase === "dealt" && (
        <section className="block">
          {celebrate !== null && (
            <div className={`tcelebrate${celebrate === 22 ? " full" : ""}`} role="status">
              <SparkleBurst fireKey={1} mood="light" hue={48} power={celebrate === 22 ? 2.4 : 1.4} />
              <strong>{celebrate === 22 ? "ครบสำรับแล้ว!" : `เก็บแล้ว ${celebrate} ใบ`}</strong>
              <span>{MILESTONES[celebrate]}</span>
            </div>
          )}
          {openCount > 0 && (
            <div className="treadings" aria-live="polite">
              {cards.map((d, i) => flipped[i] && (
                <Reading key={`${d.card}-${i}`} d={d} i={i} label={mode === "three" ? SPREAD_LABELS[i] : undefined}
                  fate={{ decision: decided[i] ?? null, pre, fresh: !!fresh[i], count: book.cards[d.card]?.count ?? 0 }}
                  onKeep={() => decide(i, "keep")} onRelease={() => decide(i, "release")} onAlbum={() => setSub("album")} />
              ))}
            </div>
          )}
          {mode === "three" && allOpen && (
            <div className="tsummary">
              <svg viewBox="0 0 120 24" aria-hidden className="tsummary-line">
                <path d="M12 12L60 12L108 12" pathLength="1" />
                {[12, 60, 108].map((x) => <circle key={x} cx={x} cy="12" r="3.6" />)}
              </svg>
              <strong>ภาพรวม</strong>
              <p>{spreadSummary(cards)}</p>
              <div className="ex ex-story">
                <span className="ex-tag">ภาพตัวอย่างทั้ง 3 ใบ</span>
                <ol>{spreadStory(cards).map((t) => <li key={t}>{t}</li>)}</ol>
                <small>ลองนึกว่าสามเรื่องนี้เป็นเรื่องเดียวกันที่ไล่ต่อกัน ตั้งแต่ตอนนี้ ไปจนถึงสิ่งที่ควรทำ</small>
              </div>
            </div>
          )}
          {allOpen && <button className="btn quiet" onClick={share}>แชร์ผลไพ่</button>}
          <p className="disclaimer">เพื่อความบันเทิงและเป็นกำลังใจเท่านั้น ไพ่ไม่ได้ทำนายอนาคตแน่นอน และไม่ใช่คำแนะนำทางการแพทย์ การเงิน หรือกฎหมาย ไพ่ที่ดูน่ากลัว เช่น Death หรือ Tower มักหมายถึงการเปลี่ยนแปลง ไม่ใช่เรื่องร้าย</p>
        </section>
      )}
    </>
  );
}
