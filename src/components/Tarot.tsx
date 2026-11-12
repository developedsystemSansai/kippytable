"use client";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { todayISO } from "@/lib/dates";
import type { Person } from "@/lib/fortune";
import { shareText } from "@/lib/share";
import { SPREAD_LABELS, TAROT, dailyDraw, drawSpread, spreadSummary, type Draw } from "@/lib/tarot";
import FortuneLoader from "./FortuneLoader";

type Mode = "daily" | "three";

function Back() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden fill="currentColor"><path d="M15 3a9 9 0 1 0 6 15 7.5 7.5 0 0 1-6-15z" /></svg>
  );
}

function Card({ d, label, flipped, onFlip }: { d: Draw; label?: string; flipped: boolean; onFlip: () => void }) {
  const c = TAROT[d.card];
  return (
    <div className="tcard-wrap">
      {label && <small className="muted">{label}</small>}
      <button className={`tcard${flipped ? " is-flipped" : ""}`} onClick={onFlip}
        aria-label={flipped ? `${c.en}${d.reversed ? " (กลับหัว)" : ""}` : "ไพ่คว่ำ แตะเพื่อเปิด"}>
        <span className="tcard-inner">
          <span className="tface tback"><Back /></span>
          <span className="tface tfront">
            <span className={d.reversed ? "tflip" : ""}>
              <b className="tnum">{c.n}</b>
              <span className="tth">{c.th}</span>
              <span className="ten">{c.en}</span>
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

export default function Tarot({ person }: { person: Person }) {
  const [mode, setMode] = useState<Mode>("daily");
  const [phase, setPhase] = useState<"idle" | "loading" | "dealt">("idle");
  const [cards, setCards] = useState<Draw[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);

  function start() {
    const next = mode === "daily" ? [dailyDraw(person.birth_date, todayISO())] : drawSpread(3);
    setCards(next);
    setFlipped(next.map(() => false));
    setPhase("loading");
    track("tarot_draw", { mode });
  }

  if (phase === "loading") return <FortuneLoader variant="tarot" duration={5000} onDone={() => setPhase("dealt")} />;

  const allOpen = flipped.length > 0 && flipped.every(Boolean);
  const share = () => {
    const lines = cards.map((d, i) => `${mode === "three" ? SPREAD_LABELS[i] + ": " : ""}${TAROT[d.card].en}${d.reversed ? " (กลับหัว)" : ""}`);
    shareText(`ไพ่ทาโร่ของฉันวันนี้\n${lines.join("\n")}\nจาก Kippy`, "คัดลอกผลไพ่แล้ว");
  };

  return (
    <>
      <section className="block">
        <h2>เปิดไพ่ทาโร่กับคิปปี้</h2>
        <p className="muted">ตั้งใจนึกถึงเรื่องที่อยากรู้ แล้วเลือกรูปแบบการเปิดไพ่</p>
        <div className="seg-wrap" role="group" aria-label="รูปแบบการเปิดไพ่">
          <button aria-pressed={mode === "daily"} onClick={() => { setMode("daily"); setPhase("idle"); }}>ไพ่ประจำวัน (1 ใบ)</button>
          <button aria-pressed={mode === "three"} onClick={() => { setMode("three"); setPhase("idle"); }}>ไพ่ 3 ใบ</button>
        </div>
        <p className="hint">{mode === "daily" ? "ได้ไพ่ใบเดิมตลอดทั้งวัน กลับมาดูซ้ำได้" : "ตอนนี้ · สิ่งที่ต้องระวัง · แนวทางที่ควรทำ สับใหม่ได้ทุกครั้ง"}</p>
        <button className="btn" onClick={start}>{phase === "dealt" ? "สับไพ่ใหม่" : "เริ่มเปิดไพ่"}</button>
      </section>

      {phase === "dealt" && (
        <section className="block">
          <p className="muted">แตะไพ่เพื่อเปิดทีละใบ</p>
          <div className={`tspread${cards.length === 1 ? " one" : ""}`}>
            {cards.map((d, i) => (
              <Card key={i} d={d} label={mode === "three" ? SPREAD_LABELS[i] : undefined} flipped={flipped[i]}
                onFlip={() => setFlipped((f) => f.map((v, k) => (k === i ? true : v)))} />
            ))}
          </div>
          {cards.map((d, i) => flipped[i] && (
            <div key={i} className="bubble reply">
              <strong>{mode === "three" ? `${SPREAD_LABELS[i]}: ` : ""}{TAROT[d.card].th} ({TAROT[d.card].en}){d.reversed ? " · กลับหัว" : ""}</strong>
              <p>{d.reversed ? TAROT[d.card].rev : TAROT[d.card].up}</p>
            </div>
          ))}
          {mode === "three" && allOpen && <div className="bubble"><strong>ภาพรวม</strong><p>{spreadSummary(cards)}</p></div>}
          {allOpen && <button className="btn quiet" onClick={share}>แชร์ผลไพ่</button>}
          <p className="disclaimer">เพื่อความบันเทิงและเป็นกำลังใจเท่านั้น ไพ่ไม่ได้ทำนายอนาคตแน่นอน และไม่ใช่คำแนะนำทางการแพทย์ การเงิน หรือกฎหมาย ไพ่ที่ดูน่ากลัว เช่น Death หรือ Tower มักหมายถึงการเปลี่ยนแปลง ไม่ใช่เรื่องร้าย</p>
        </section>
      )}
    </>
  );
}
