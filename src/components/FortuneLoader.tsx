"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SparkleBurst, Starfield } from "./Cosmos";

const FRAMES = [0, 1, 2, 3, 4, 5].map((i) => `/kippy/fortune/teller-${i}.webp`);
const ZODIAC = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const MESSAGES = {
  reading: ["คิปปี้กำลังเตรียมลูกแก้ว…", "กำลังเปิดจักรราศีของคุณ…", "กำลังดูตำแหน่งดวงจันทร์และนักษัตรปีเกิด…", "กำลังรวบรวมพลังดวงดาว…", "ไพ่ใบสำคัญปรากฏแล้ว!", "กำลังสรุปดวงของคุณ…"],
  tarot: ["คิปปี้กำลังสับไพ่…", "กำลังตั้งจิตให้นิ่ง…", "ไพ่เริ่มหมุนวน…", "กำลังคัดไพ่ที่ตรงกับคุณ…", "ไพ่ใบสำคัญปรากฏแล้ว!", "พร้อมเปิดไพ่แล้ว!"],
};

/** Warm the cache so the first frames show instantly. */
export function preloadFortuneArt() {
  FRAMES.forEach((src) => { const i = new Image(); i.src = src; });
  const h = new Image(); h.src = "/kippy/fortune/hero.webp";
}

type Props = { duration?: number; variant?: "reading" | "tarot"; onDone: () => void };

/**
 * Fortune-teller ceremony: Kippy inside a night sky with an orbiting zodiac ring.
 * 6 frames cross-fade over `duration` ms; each new frame releases a puff of sparkles. Then calls onDone.
 */
export default function FortuneLoader({ duration = 7000, variant = "reading", onDone }: Props) {
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const total = reduce ? 1500 : duration;
  const [frame, setFrame] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const start = Date.now();
    const step = total / FRAMES.length;
    const tick = setInterval(() => {
      const e = Date.now() - start;
      setFrame(Math.min(FRAMES.length - 1, Math.floor(e / step)));
      if (e >= total) { clearInterval(tick); done.current(); }
    }, 100);
    const skip = setTimeout(() => setCanSkip(true), 3500);
    return () => { clearInterval(tick); clearTimeout(skip); };
  }, [total]);

  const last = frame === FRAMES.length - 1;

  return (
    <section className="block loader" role="status" aria-live="polite">
      <div className={`lc-panel${last ? " is-last" : ""}`} style={{ "--p": frame / (FRAMES.length - 1) } as CSSProperties}>
        <div className="lc-bg" aria-hidden><Starfield seed={`loader-${variant}`} density={1.2} /></div>
        <div className="lc-halo" aria-hidden />
        <div className="lc-orbit" aria-hidden>
          {ZODIAC.map((g, i) => (
            <span key={g} className="lc-glyph" style={{ "--a": `${i * 30}deg`, "--lit": i <= Math.round((frame / (FRAMES.length - 1)) * 11) ? 1 : 0.28 } as CSSProperties}><i>{g}</i></span>
          ))}
        </div>
        <div className="teller-stage" aria-hidden>
          {FRAMES.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" width={512} height={512} className="teller-frame" style={{ opacity: i === frame ? 1 : 0 }} />
          ))}
          <SparkleBurst fireKey={frame} mood="mystic" hue={48} power={frame === FRAMES.length - 1 ? 1.4 : 0.6} />
        </div>
      </div>
      <p className="loader-msg" key={frame}>{MESSAGES[variant][frame]}</p>
      <div className="loader-bar" aria-hidden><span style={{ animationDuration: `${total}ms` }} /></div>
      <button className="link-btn" style={{ visibility: canSkip ? "visible" : "hidden", justifySelf: "center" }} onClick={() => done.current()}>ข้าม</button>
    </section>
  );
}
