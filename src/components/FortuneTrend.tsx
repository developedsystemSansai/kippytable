"use client";
import { useMemo, useState, type CSSProperties } from "react";
import { THAI_WEEKDAYS_SHORT, addDays, thaiDateLong, todayISO } from "@/lib/dates";
import { CATS, dailyReading, scoreExample, type Cat, type Person, type Reading } from "@/lib/fortune";

type Key = "overall" | Cat;
const RANGES = [{ n: 7, past: 2, label: "7 วัน" }, { n: 14, past: 4, label: "14 วัน" }, { n: 30, past: 10, label: "30 วัน" }];
const DO: Record<Cat, string> = { love: "คุยเรื่องหัวใจ หรือทำให้ความสัมพันธ์อบอุ่นขึ้น", work: "เสนองาน หรือตัดสินใจเรื่องสำคัญ", money: "จัดการเงิน วางแผนออม หรือซื้อของใหญ่", health: "ออกกำลังกาย หรือตรวจสุขภาพที่ค้างไว้" };

const W = 340, H = 190, PL = 30, PR = 12, PT = 16, PB = 30;
const val = (r: Reading, k: Key) => (k === "overall" ? r.overall : r.stars[k] * 20);
const dayInfo = (iso: string) => { const [, m, d] = iso.split("-").map(Number); const wd = new Date(Date.UTC(+iso.slice(0, 4), m - 1, d)).getUTCDay(); return { d, m, wd: THAI_WEEKDAYS_SHORT[wd] }; };
const heat = (v: number) => `hsl(${18 + (v / 100) * 112} 70% ${v >= 50 ? 52 : 58}%)`;

/** Smooth curve through points (Catmull-Rom converted to cubic Beziers, clamped to the plot area). */
function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const cl = (y: number) => Math.min(H - PB, Math.max(PT, y));
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${cl(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${cl(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Fortune trend: past days and the days ahead on one chart, plus the best days to act. Pure calculation, nothing stored. */
export default function FortuneTrend({ person }: { person: Person }) {
  const today = todayISO();
  const [rng, setRng] = useState(1);
  const [key, setKey] = useState<Key>("overall");
  const { n, past } = RANGES[rng];
  const [sel, setSel] = useState(past);

  const days = useMemo(() => Array.from({ length: n }, (_, i) => { const date = addDays(today, i - past); return { date, r: dailyReading(person, date) }; }), [n, past, today, person]);
  const vals = days.map((x) => val(x.r, key));
  const x = (i: number) => PL + (i * (W - PL - PR)) / (n - 1);
  const y = (v: number) => PT + (1 - v / 100) * (H - PT - PB);
  const pts = vals.map((v, i) => [x(i), y(v)] as [number, number]);
  const pastPath = smooth(pts.slice(0, past + 1)), futPath = smooth(pts.slice(past));
  const allPath = smooth(pts);
  const area = `${allPath}L${x(n - 1)} ${H - PB}L${x(0)} ${H - PB}Z`;

  const fut = days.map((d, i) => ({ ...d, i, v: vals[i] })).filter((d) => d.i >= past);
  const best = fut.reduce((a, b) => (b.v > a.v ? b : a)), low = fut.reduce((a, b) => (b.v < a.v ? b : a));
  const half = Math.floor(fut.length / 2);
  const avg = (a: typeof fut) => a.reduce((s, d) => s + d.v, 0) / Math.max(1, a.length);
  const diff = fut.length >= 4 ? avg(fut.slice(half)) - avg(fut.slice(0, half)) : 0;
  const dir = diff >= 6 ? "up" : diff <= -6 ? "down" : "flat";
  const DIR = { up: ["กำลังขึ้น", "ช่วงข้างหน้ามีแรงหนุนมากขึ้น เก็บเรื่องสำคัญไว้ทำในวันที่ดวงดี"], down: ["กำลังลง", "ผ่อนจังหวะลงทีละนิด วางแผนพักล่วงหน้า และเลี่ยงเรื่องใหญ่ในวันดวงต่ำ"], flat: ["ทรงตัว", "จังหวะสม่ำเสมอ เหมาะกับการวางแผนระยะยาวและทำงานต่อเนื่อง"] }[dir];
  const todayAvg = Math.round(vals.reduce((s, v) => s + v, 0) / n);
  const bestByCat = CATS.map((c) => { const b = fut.reduce((a, d) => (d.r.stars[c.key] > a.r.stars[c.key] ? d : a)); return { c, b }; });

  const cur = days[sel], curV = vals[sel];
  const rel = cur.date === today ? "วันนี้" : cur.date === addDays(today, 1) ? "พรุ่งนี้" : cur.date < today ? "ผ่านมาแล้ว" : "ล่วงหน้า";
  const keyLabel = key === "overall" ? "ดวงรวม" : CATS.find((c) => c.key === key)!.th;

  function pickRange(i: number) { setRng(i); setSel(RANGES[i].past); }
  const step = (d: number) => setSel((s) => Math.min(n - 1, Math.max(0, s + d)));
  const xlabels = days.map((_, i) => i).filter((i) => (n <= 7 ? true : n <= 14 ? i % 2 === (past % 2) : i % 5 === past % 5));

  return (
    <>
      <section className="block">
        <h2>แนวโน้มดวง</h2>
        <p className="muted">ดูดวงย้อนหลังและล่วงหน้าบนกราฟเดียว แตะที่จุดหรือช่องวันเพื่อดูรายละเอียด</p>
        <div className="seg-wrap" role="group" aria-label="ช่วงเวลา">
          {RANGES.map((r, i) => <button key={r.n} aria-pressed={rng === i} onClick={() => pickRange(i)}>{r.label}</button>)}
        </div>
        <div className="chips ttrend-keys" role="group" aria-label="เลือกหมวด">
          {([{ key: "overall", th: "ดวงรวม" }, ...CATS] as { key: Key; th: string }[]).map((c) => (
            <button key={c.key} className="chip" aria-pressed={key === c.key} onClick={() => setKey(c.key)}>{c.th}</button>
          ))}
        </div>

        <div className="ttrend" key={`${n}-${key}`}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`กราฟ${keyLabel} ${n} วัน`}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity=".35" /><stop offset="1" stopColor="var(--brand)" stopOpacity="0" /></linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map((g) => (
              <g key={g}><line x1={PL} x2={W - PR} y1={y(g)} y2={y(g)} className="tt-grid" /><text x={PL - 6} y={y(g) + 3} className="tt-ylab" textAnchor="end">{g}</text></g>
            ))}
            <rect x={PL} y={PT} width={Math.max(0, x(past) - PL)} height={H - PT - PB} className="tt-past" />
            <path d={area} fill="url(#trend-fill)" className="tt-area" />
            <path d={pastPath} pathLength={1} className="tt-line" />
            <path d={futPath} pathLength={1} className="tt-line tt-fut" />
            <line x1={x(past)} x2={x(past)} y1={PT} y2={H - PB} className="tt-today" />
            <text x={x(past)} y={PT - 4} textAnchor="middle" className="tt-todaylab">วันนี้</text>
            {xlabels.map((i) => { const di = dayInfo(days[i].date); return <text key={i} x={x(i)} y={H - 12} textAnchor="middle" className={`tt-xlab${i === sel ? " on" : ""}`}>{n <= 7 ? di.wd : di.d}</text>; })}
            {days.map((d, i) => (
              <g key={d.date} className={`tt-pt${i === sel ? " on" : ""}${i === past ? " today" : ""}`} style={{ "--i": i } as CSSProperties}
                role="button" tabIndex={0} aria-label={`${thaiDateLong(d.date)} ${keyLabel} ${vals[i]}`} onClick={() => setSel(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(i); } }}>
                <circle cx={x(i)} cy={y(vals[i])} r="14" className="tt-hit" />
                <circle cx={x(i)} cy={y(vals[i])} r={i === sel ? 5.5 : n > 14 ? 2.4 : 3.6} className="tt-dot" />
              </g>
            ))}
          </svg>
          <div className="tt-legend"><span><i className="sw" />ที่ผ่านมา</span><span><i className="sw fut" />ล่วงหน้า (คำนวณจากตำแหน่งดาว)</span></div>
        </div>

        <div className="theat" role="group" aria-label="ปฏิทินสี">
          {days.map((d, i) => (
            <button key={d.date} className={`theat-cell${i === sel ? " on" : ""}${i === past ? " today" : ""}`} style={{ background: heat(vals[i]), "--i": i } as CSSProperties} onClick={() => setSel(i)} aria-label={`${thaiDateLong(d.date)} ${vals[i]}%`}>
              <small>{dayInfo(d.date).wd}</small><b>{dayInfo(d.date).d}</b>
            </button>
          ))}
        </div>
        <p className="hint theat-hint"><i className="sw lo" />ดวงต่ำ <span className="theat-grad" /> ดวงสูง<i className="sw hi" /></p>
      </section>

      <section className="block">
        <div className="tday" key={cur.date}>
          <div className="tday-nav">
            <button className="btn quiet" onClick={() => step(-1)} disabled={sel === 0} aria-label="วันก่อนหน้า">‹</button>
            <div><strong>{thaiDateLong(cur.date)}</strong><small className="muted"> · {rel}</small></div>
            <button className="btn quiet" onClick={() => step(1)} disabled={sel === n - 1} aria-label="วันถัดไป">›</button>
          </div>
          <div className="tday-score" style={{ "--c": heat(cur.r.overall) } as CSSProperties}>
            <b>{cur.r.overall}<i>%</i></b>
            <span>{cur.r.headline}</span>
          </div>
          <div className="tday-cats">
            {CATS.map((c) => (
              <div key={c.key} className="tday-cat"><span>{c.th}</span>
                <span className="bar" aria-hidden><span style={{ width: `${cur.r.stars[c.key] * 20}%` }} /></span>
                <b>{cur.r.stars[c.key]}/5</b></div>
            ))}
          </div>
          <div className="chips"><span className="chip"><span className="dot" style={{ background: cur.r.luckyColor.hex }} />สีมงคล {cur.r.luckyColor.name}</span><span className="chip">เลขนำโชค {cur.r.luckyNumber}</span></div>
          <div className="ex"><span className="ex-tag">ตัวอย่างวันแบบนี้</span><p>{scoreExample(cur.r.overall)}</p></div>
        </div>
      </section>

      <section className="block">
        <h2>สรุปแนวโน้ม</h2>
        <div className="tsum-grid">
          <div className={`tsum tsum-${dir}`}><small>ทิศทางข้างหน้า</small><strong>{DIR[0]}</strong><p>{DIR[1]}</p></div>
          <div className="tsum"><small>ดวงรวมสูงสุดข้างหน้า</small><strong>{dayInfo(best.date).wd} {dayInfo(best.date).d}/{dayInfo(best.date).m} · {best.v}%</strong><p>วันที่เหมาะกับเรื่องสำคัญ</p></div>
          <div className="tsum"><small>วันที่ควรเบาๆ</small><strong>{dayInfo(low.date).wd} {dayInfo(low.date).d}/{dayInfo(low.date).m} · {low.v}%</strong><p>ผ่อนจังหวะ พักให้พอ เลี่ยงตัดสินใจใหญ่</p></div>
          <div className="tsum"><small>ค่าเฉลี่ย {n} วัน</small><strong>{todayAvg}%</strong><p>เทียบกับวันนี้ที่ {days[past].r.overall}%</p></div>
        </div>
        <h3 className="tsum-h">วันดีของแต่ละเรื่อง</h3>
        <div className="tbest">
          {bestByCat.map(({ c, b }) => (
            <button key={c.key} className="tbest-row" onClick={() => setSel(b.i)}>
              <span className="tbest-cat">{c.th}</span>
              <span className="tbest-day">{dayInfo(b.date).wd} {dayInfo(b.date).d}/{dayInfo(b.date).m}</span>
              <span className="tbest-do">{DO[c.key]}</span>
            </button>
          ))}
        </div>
        <p className="disclaimer">แนวโน้มคำนวณจากตำแหน่งดาวและนักษัตรตามวันเกิดของคุณ เพื่อความบันเทิงและเป็นกำลังใจเท่านั้น ไม่ใช่การทำนายแน่นอน</p>
      </section>
    </>
  );
}
