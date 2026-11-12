"use client";
import { useEffect, useRef } from "react";
import { hashStr } from "@/lib/fortune";
import type { Mood } from "@/lib/tarot";

/** Small seeded PRNG so the same seed always paints the same sky / sigil. */
function mulberry(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Twinkling night sky with an occasional shooting star. Pauses when off screen or tab hidden. */
export function Starfield({ seed = "kippy", density = 1, shooting = true }: { seed?: string; density?: number; shooting?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rnd = mulberry(hashStr(seed));
    const still = reduced();
    let w = 0, h = 0, raf = 0, visible = true;
    type S = { x: number; y: number; r: number; p: number; sp: number; hue: number };
    let stars: S[] = [];
    const sh = { on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 };
    let nextShoot = performance.now() + 2200 + rnd() * 3000;

    const build = () => {
      const b = cv.getBoundingClientRect(); w = b.width; h = b.height;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(160, Math.round((w * h) / 2800 * density));
      stars = Array.from({ length: n }, () => {
        const k = rnd();
        return { x: rnd() * w, y: rnd() * h, r: rnd() * 1.25 + 0.3, p: rnd() * 6.28, sp: 0.6 + rnd() * 1.9, hue: k < 0.25 ? 46 : k < 0.55 ? 268 : 210 };
      });
      paint(performance.now());
    };
    const paint = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const s of stars) {
        const tw = still ? 0.75 : 0.5 + 0.5 * Math.sin(now / 1000 * s.sp + s.p);
        ctx.globalAlpha = 0.25 + tw * 0.75;
        ctx.fillStyle = `hsl(${s.hue} 90% 85%)`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.8 + tw * 0.4), 0, 6.283); ctx.fill();
        if (s.r > 1.2) { // a few big stars get a soft cross glint
          ctx.globalAlpha = tw * 0.5; ctx.strokeStyle = `hsl(${s.hue} 90% 90%)`; ctx.lineWidth = 0.6;
          const g = s.r * 3.2 * tw; ctx.beginPath(); ctx.moveTo(s.x - g, s.y); ctx.lineTo(s.x + g, s.y); ctx.moveTo(s.x, s.y - g); ctx.lineTo(s.x, s.y + g); ctx.stroke();
        }
      }
      if (sh.on) {
        sh.x += sh.vx; sh.y += sh.vy; sh.life -= 0.016;
        const g = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 9, sh.y - sh.vy * 9);
        g.addColorStop(0, "rgba(255,244,200,.95)"); g.addColorStop(1, "rgba(255,244,200,0)");
        ctx.globalAlpha = Math.max(0, Math.min(1, sh.life)); ctx.strokeStyle = g; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - sh.vx * 9, sh.y - sh.vy * 9); ctx.stroke();
        if (sh.life <= 0 || sh.x > w + 40 || sh.y > h + 40) sh.on = false;
      } else if (shooting && !still && now > nextShoot) {
        sh.on = true; sh.x = rnd() * w * 0.6; sh.y = rnd() * h * 0.35; sh.vx = 5 + rnd() * 3; sh.vy = 2.2 + rnd() * 1.6; sh.life = 1.2;
        nextShoot = now + 4500 + rnd() * 5000;
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    };
    const loop = (now: number) => { if (visible && !document.hidden) paint(now); raf = requestAnimationFrame(loop); };

    const ro = new ResizeObserver(build); ro.observe(cv); build();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    if (!still) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [seed, density, shooting]);
  return <canvas ref={ref} className="cosmos-canvas" aria-hidden />;
}

/** One-shot particle burst. Change `fireKey` (> 0) to fire. Gold stars for light cards, violet for mystic, embers for shadow. */
export function SparkleBurst({ fireKey, mood = "light", hue = 48, power = 1 }: { fireKey: number; mood?: Mood; hue?: number; power?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!fireKey || reduced()) return;
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const b = cv.getBoundingClientRect();
    cv.width = Math.round(b.width * dpr); cv.height = Math.round(b.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = b.width / 2, cy = b.height / 2;
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; star: boolean; h: number; rot: number };
    const n = Math.round((mood === "shadow" ? 46 : 78) * power);
    const ps: P[] = Array.from({ length: n }, () => {
      const a = Math.random() * 6.283, sp = (mood === "shadow" ? 0.8 : 1.6) + Math.random() * (mood === "shadow" ? 2.2 : 4.2);
      const hh = mood === "shadow" ? 10 + Math.random() * 28 : mood === "mystic" ? 250 + Math.random() * 90 : hue + (Math.random() - 0.5) * 24;
      return { x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (mood === "shadow" ? 1.2 : 0.4), life: 0, max: 50 + Math.random() * 50, r: 1.2 + Math.random() * 2.6, star: mood !== "shadow" && Math.random() < 0.55, h: hh, rot: Math.random() * 3 };
    });
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, b.width, b.height);
      ctx.globalCompositeOperation = "lighter";
      let alive = 0;
      for (const p of ps) {
        p.life++; if (p.life > p.max) continue; alive++;
        p.vx *= 0.975; p.vy = p.vy * 0.975 + (mood === "shadow" ? -0.02 : 0.045);
        p.x += p.vx; p.y += p.vy;
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = k; ctx.fillStyle = `hsl(${p.h} 100% ${mood === "shadow" ? 58 : 72}%)`;
        if (p.star) {
          const s = p.r * (1.6 + k); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.life * 0.05); ctx.beginPath();
          for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.32 : s * 1.5; const a = (i / 8) * 6.283; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.fill(); ctx.restore();
        } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k + 0.4, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      if (alive) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, b.width, b.height);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fireKey, mood, hue, power]);
  return <canvas ref={ref} className="burst-canvas" aria-hidden />;
}

/**
 * Daily sigil: a generative mandala seeded by person + date. Same seed, same sigil.
 * Fold count and petal curves come from the hash; the number of lit stars follows `power` (0..100).
 * Drawn once per layer, then spun by CSS (cheap, no per-frame canvas work).
 */
export function Sigil({ seed, power, size = 240 }: { seed: string; power: number; size?: number }) {
  const a = useRef<HTMLCanvasElement>(null);
  const b = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const A = a.current, B = b.current; if (!A || !B) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), S = size * dpr;
    const rnd = mulberry(hashStr(seed));
    const folds = [6, 8, 9, 10, 12][Math.floor(rnd() * 5)];
    const hueA = 40 + Math.floor(rnd() * 20), hueB = 255 + Math.floor(rnd() * 50);
    const prep = (c: HTMLCanvasElement) => { c.width = S; c.height = S; const g = c.getContext("2d")!; g.translate(S / 2, S / 2); g.scale(S, S); g.lineCap = "round"; return g; };

    // layer A: rings, ticks, zodiac-like notches
    const g1 = prep(A);
    g1.strokeStyle = `hsla(${hueA},90%,75%,.85)`; g1.lineWidth = 1.4 / S * dpr;
    g1.beginPath(); g1.arc(0, 0, 0.47, 0, 6.283); g1.stroke();
    g1.lineWidth = 0.8 / S * dpr; g1.strokeStyle = `hsla(${hueA},90%,80%,.5)`;
    g1.beginPath(); g1.arc(0, 0, 0.435, 0, 6.283); g1.stroke();
    for (let i = 0; i < 72; i++) {
      const t = (i / 72) * 6.283, long = i % 6 === 0, r0 = long ? 0.44 : 0.455;
      g1.globalAlpha = long ? 0.9 : 0.45; g1.beginPath(); g1.moveTo(Math.cos(t) * r0, Math.sin(t) * r0); g1.lineTo(Math.cos(t) * 0.47, Math.sin(t) * 0.47); g1.stroke();
    }
    g1.globalAlpha = 1;
    for (let i = 0; i < folds; i++) { // notch diamonds on the inner ring
      const t = (i / folds) * 6.283 - 1.5708, x = Math.cos(t) * 0.435, y = Math.sin(t) * 0.435;
      g1.fillStyle = `hsl(${hueA} 95% 78%)`; g1.beginPath(); g1.moveTo(x, y - 0.016); g1.lineTo(x + 0.011, y); g1.lineTo(x, y + 0.016); g1.lineTo(x - 0.011, y); g1.closePath(); g1.fill();
    }

    // layer B: petal curves + constellation nodes
    const g2 = prep(B);
    g2.globalCompositeOperation = "lighter";
    for (let j = 0; j < 3; j++) {
      const k = folds * (j === 1 ? 1 : 1) + (j === 2 ? folds : 0), amp = 0.09 + j * 0.04, base = 0.14 + j * 0.06, ph = rnd() * 6.283;
      g2.beginPath();
      for (let i = 0; i <= 720; i++) {
        const t = (i / 720) * 6.283, r = base + amp * Math.cos((k / (j === 1 ? 2 : 1)) * t + ph) * (0.7 + 0.3 * Math.sin(t * (j + 1)));
        const x = Math.cos(t) * r, y = Math.sin(t) * r; i ? g2.lineTo(x, y) : g2.moveTo(x, y);
      }
      g2.closePath(); g2.lineWidth = 1.1 / S * dpr; g2.strokeStyle = `hsla(${j === 1 ? hueA : hueB + j * 20},95%,${68 + j * 4}%,.55)`; g2.stroke();
    }
    const lit = 3 + Math.round((power / 100) * 8);
    const pts: [number, number][] = [];
    for (let i = 0; i < lit; i++) {
      const idx = Math.floor(rnd() * folds * 2), t = (idx / (folds * 2)) * 6.283 - 1.5708, r = 0.2 + rnd() * 0.22;
      pts.push([Math.cos(t) * r, Math.sin(t) * r]);
    }
    g2.strokeStyle = `hsla(${hueA},90%,80%,.35)`; g2.lineWidth = 0.8 / S * dpr; g2.beginPath();
    pts.forEach(([x, y], i) => (i ? g2.lineTo(x, y) : g2.moveTo(x, y))); g2.stroke();
    for (const [x, y] of pts) {
      const gr = g2.createRadialGradient(x, y, 0, x, y, 0.045); gr.addColorStop(0, "rgba(255,246,210,1)"); gr.addColorStop(1, "rgba(255,246,210,0)");
      g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, 0.045, 0, 6.283); g2.fill();
    }
    const core = g2.createRadialGradient(0, 0, 0, 0, 0, 0.16); core.addColorStop(0, `hsla(${hueA},100%,85%,${0.25 + power / 250})`); core.addColorStop(1, "rgba(0,0,0,0)");
    g2.fillStyle = core; g2.beginPath(); g2.arc(0, 0, 0.16, 0, 6.283); g2.fill();
  }, [seed, power, size]);
  return (
    <div className="sigil" style={{ width: size, height: size }} aria-hidden>
      <canvas ref={a} className="sigil-a" style={{ width: size, height: size }} />
      <canvas ref={b} className="sigil-b" style={{ width: size, height: size }} />
    </div>
  );
}
