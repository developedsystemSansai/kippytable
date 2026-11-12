"use client";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { track } from "@/lib/analytics";
import { deleteHoroProfile, getHoroProfile, listShifts, saveHoroProfile } from "@/lib/data";
import { addDays, isValidISO, thaiDateLong, todayISO } from "@/lib/dates";
import { CATS, compatibility, dailyReading, scoreExample, type Compat, type Person, type Reading } from "@/lib/fortune";
import { shareText } from "@/lib/share";
import type { HoroProfile } from "@/lib/types";
import { remedies } from "@/lib/remedies";
import { Sigil, SparkleBurst, Starfield } from "./Cosmos";
import FortuneLoader, { preloadFortuneArt } from "./FortuneLoader";
import KIcon from "./KIcon";
import Mascot from "./Mascot";
import Tarot from "./Tarot";

const STREAK_KEY = "kippy_fortune_streak";
const SEEN_KEY = "kippy_fortune_seen";

function Stars({ n }: { n: number }) {
  return (
    <span className="stars" aria-label={`${n} จาก 5 ดาว`}>
      {Array.from({ length: n }, (_, i) => <b key={i} aria-hidden style={{ "--k": i } as CSSProperties}>★</b>)}
      <i aria-hidden>{"★".repeat(5 - n)}</i>
    </span>
  );
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useCountUp(target: number, ms = 1400): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reducedMotion()) { setV(target); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const RING_C = 2 * Math.PI * 52;
const tierOf = (n: number) => (n >= 85 ? "ดวงเฉิดฉาย" : n >= 70 ? "ดวงดี" : n >= 50 ? "ดวงกลางๆ" : "ดวงพักตัว");

/** Night-sky hero: a daily sigil generated from birth date + day, a filling score ring, and a sparkle burst on high scores. */
function FortuneHero({ r, person, date }: { r: Reading; person: Person; date: string }) {
  const shown = useCountUp(r.overall);
  const high = r.overall >= 80;
  return (
    <div className={`fhero${high ? " is-high" : ""}`} style={{ "--hue": r.luckyColor.hex } as CSSProperties}>
      <div className="fhero-bg" aria-hidden><Starfield seed={`hero|${person.birth_date}|${date}`} density={0.9} /></div>
      <div className="fhero-stage">
        <Sigil seed={`${person.birth_date}|${date}`} power={r.overall} size={272} />
        <div className="fhero-ring" role="img" aria-label={`ดวงรวม ${r.overall} เปอร์เซ็นต์`}>
          <svg viewBox="0 0 120 120" aria-hidden>
            <circle cx="60" cy="60" r="52" className="ring-track" />
            <circle cx="60" cy="60" r="52" className="ring-fill" style={{ "--c": RING_C, strokeDasharray: RING_C, strokeDashoffset: RING_C * (1 - r.overall / 100) } as CSSProperties} />
          </svg>
          <span className="fhero-num"><small>ดวงรวม</small><b>{shown}<i>%</i></b></span>
        </div>
        <SparkleBurst fireKey={high ? 1 : 0} mood="light" hue={48} power={1.2} />
      </div>
      <span className="fhero-tier">{tierOf(r.overall)}</span>
      <strong className="fhero-head">{r.headline}</strong>
      <div className="chips chips-night">
        <span className="chip"><span className="dot" style={{ background: r.luckyColor.hex }} />สีมงคล {r.luckyColor.name}</span>
        <span className="chip">เลขนำโชค {r.luckyNumber}</span>
        <span className="chip">{r.sunSign}</span>
        {r.ascSign && <span className="chip">ลัคนา{r.ascSign.replace("ราศี", "")}</span>}
        <span className="chip">{r.lannaYear}</span>
      </div>
    </div>
  );
}

/** Counts consecutive days the reading was opened (stored on this device only). */
function touchStreak(today: string): number {
  try {
    const raw = JSON.parse(localStorage.getItem(STREAK_KEY) ?? "null") as { last: string; count: number } | null;
    let count = 1;
    if (raw) {
      if (raw.last === today) return raw.count;
      count = raw.last === addDays(today, -1) ? raw.count + 1 : 1;
    }
    localStorage.setItem(STREAK_KEY, JSON.stringify({ last: today, count }));
    return count;
  } catch { return 1; }
}

function Setup({ initial, onSaved, onCancel }: { initial: HoroProfile | null; onSaved: (p: HoroProfile) => void; onCancel?: () => void }) {
  const [date, setDate] = useState(initial?.birth_date ?? "");
  const [time, setTime] = useState(initial?.birth_time ?? "");
  const [share, setShare] = useState(initial?.share_with_groups ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = isValidISO(date) && date >= "1900-01-01" && date <= todayISO();

  async function save() {
    setBusy(true); setError(null);
    const p: HoroProfile = { birth_date: date, birth_time: time || null, share_with_groups: share };
    try { await saveHoroProfile(p); track("save_horoscope_profile"); onSaved(p); }
    catch (e) { setError(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  return (
    <section className="block">
      <h2 className="heading-icon"><KIcon name="star" size={26} />ข้อมูลวันเกิดสำหรับดูดวง</h2>
      <p className="muted">ใช้คำนวณราศีและนักษัตรปีเกิด (ตะวันตกและล้านนา) เก็บเป็นส่วนตัวของคุณเท่านั้น ลบได้ทุกเมื่อ</p>
      <label className="field">วันเกิด (ค.ศ.)
        <input type="date" value={date} min="1900-01-01" max={todayISO()} onChange={(e) => setDate(e.target.value)} />
      </label>
      {ok && <p className="hint">{thaiDateLong(date)} · ถ้าเลือกปีผิด ให้ใช้ปี ค.ศ. (พ.ศ. − 543)</p>}
      <label className="field">เวลาเกิด (ไม่บังคับ)
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </label>
      <p className="hint">ถ้าใส่เวลาเกิด จะคำนวณลัคนา ราศีจันทร์ และยามเกิดให้ด้วย (คำนวณโดยประมาณจากพิกัดกรุงเทพฯ)</p>
      <label className="check">
        <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
        <span>แสดงวันเกิดให้เพื่อนในกลุ่มที่ฉันอยู่เห็น เพื่อเทียบดวงในกลุ่ม (ไม่แสดงเวลาเกิด ปิดได้ทุกเมื่อ)</span>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" disabled={!ok || busy} onClick={save}>บันทึก</button>
      {onCancel && <button className="btn quiet" onClick={onCancel}>ยกเลิก</button>}
    </section>
  );
}

function CompareBox({ me }: { me: Person }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [res, setRes] = useState<{ name: string; c: Compat } | null>(null);
  const ok = isValidISO(date) && date >= "1900-01-01" && date <= todayISO();

  return (
    <section className="block">
      <h2 className="heading-icon"><KIcon name="heart" size={24} />เทียบดวงกับคนอื่น</h2>
      <p className="muted">ใส่วันเกิดของแฟน เพื่อน เพื่อนร่วมงาน หรือใครก็ได้ ระบบไม่บันทึกข้อมูลนี้</p>
      <div className="row2">
        <label className="field">ชื่อ (ไม่บังคับ)<input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field">วันเกิด (ค.ศ.)<input type="date" value={date} min="1900-01-01" max={todayISO()} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <button className="btn" disabled={!ok} onClick={() => { setRes({ name: name.trim() || "อีกฝ่าย", c: compatibility(me, { birth_date: date, birth_time: null }) }); track("compare_horoscope"); }}>เทียบดวง</button>
      {res && (
        <div className="bubble">
          <strong>คุณ + {res.name}: {res.c.score}% · {res.c.verdict}</strong>
          <div className="bar" aria-hidden><span style={{ width: `${res.c.score}%` }} /></div>
          <p><b>แบบสากล ({res.c.westernScore}%)</b> {res.c.western}</p>
          <p><b>แบบล้านนา ({res.c.northernScore}%)</b> {res.c.northern}</p>
          <button className="link-btn" onClick={() => shareText(`ดวงคู่ คุณ + ${res.name} เข้ากัน ${res.c.score}% (${res.c.verdict}) จาก Kippy`, "คัดลอกผลดวงคู่แล้ว")}>แชร์ผลนี้</button>
        </div>
      )}
    </section>
  );
}

export default function FortuneTab() {
  const today = todayISO();
  const [profile, setProfile] = useState<HoroProfile | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [shiftLabel, setShiftLabel] = useState<string | null>(null);
  const [streak, setStreak] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"reading" | "tarot">("reading");
  // dates whose reveal animation already played in this browser session
  const [seen, setSeen] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[]; } catch { return []; }
  });

  const date = day === "today" ? today : addDays(today, 1);

  useEffect(() => { preloadFortuneArt(); }, []);

  useEffect(() => {
    getHoroProfile().then(setProfile).catch((e) => { setError(e instanceof Error ? e.message : "error"); setProfile(null); });
    setStreak(touchStreak(today));
  }, [today]);

  useEffect(() => {
    let off = false;
    listShifts(date.slice(0, 7)).then((rows) => { if (!off) setShiftLabel(rows.find((s) => s.date === date)?.label ?? null); }).catch(() => { if (!off) setShiftLabel(null); });
    return () => { off = true; };
  }, [date]);

  const remove = useCallback(async () => {
    if (!confirm("ลบข้อมูลวันเกิดและดวงของคุณ?")) return;
    try { await deleteHoroProfile(); setProfile(null); } catch (e) { setError(e instanceof Error ? e.message : "error"); }
  }, []);

  if (profile === undefined) return <section className="block"><p className="muted">กำลังโหลด…</p></section>;
  if (!profile || editing) {
    return (
      <>
        {!profile && (
          <section className="block">
            <div className="empty" style={{ marginTop: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kippy/fortune/hero.webp" alt="" width={140} height={112} />
              <p><strong>ดูดวงประจำวันของคุณ</strong><span>ใส่วันเกิดครั้งเดียว แล้วดูดวงรายวันและเทียบดวงกับเพื่อนในกลุ่มได้</span></p>
            </div>
            {error && <p className="error" role="alert">{error}</p>}
          </section>
        )}
        <Setup initial={profile} onSaved={(p) => { setProfile(p); setEditing(false); }} onCancel={profile ? () => setEditing(false) : undefined} />
      </>
    );
  }

  const person: Person = { birth_date: profile.birth_date, birth_time: profile.birth_time };

  const viewSwitch = (
    <section className="block" style={{ paddingBottom: 0 }}>
      <div className="seg" role="group" aria-label="เลือกหมวด">
        <button aria-pressed={view === "reading"} onClick={() => setView("reading")}>ดวงรายวัน</button>
        <button aria-pressed={view === "tarot"} onClick={() => setView("tarot")}>ไพ่ทาโร่</button>
      </div>
    </section>
  );
  if (view === "tarot") return <>{viewSwitch}<Tarot person={person} /></>;

  if (!seen.includes(date)) {
    return (
      <FortuneLoader onDone={() => setSeen((s) => {
        const n = [...s, date];
        try { sessionStorage.setItem(SEEN_KEY, JSON.stringify(n)); } catch {}
        return n;
      })} />
    );
  }

  const r: Reading = dailyReading(person, date, shiftLabel);
  const shareMsg = `ดวง${day === "today" ? "วันนี้" : "พรุ่งนี้"} ${r.overall}% · ${r.headline}\nสีมงคล ${r.luckyColor.name} · เลขนำโชค ${r.luckyNumber}\nจาก Kippy`;

  const rem = remedies(r);

  return (
    <>
      {viewSwitch}
      <section className="block">
        <div className="seg" role="group" aria-label="เลือกวัน">
          <button aria-pressed={day === "today"} onClick={() => setDay("today")}>วันนี้</button>
          <button aria-pressed={day === "tomorrow"} onClick={() => setDay("tomorrow")}>พรุ่งนี้</button>
        </div>
        <p className="muted">{thaiDateLong(date)}{streak > 1 ? ` · เปิดดูต่อเนื่อง ${streak} วัน` : ""}</p>

        <FortuneHero key={date} r={r} person={person} date={date} />
        <div className="bubble rise" style={{ "--i": 0 } as CSSProperties}>
          <strong>ดวงรวม {r.overall}% แปลว่าอะไร</strong>
          <small>คิดจากค่าเฉลี่ยดาวทั้ง 4 หมวดด้านล่าง ยิ่งสูงยิ่งเป็นวันที่ลื่นไหล ไม่ใช่การทำนายแบบแน่นอน</small>
          <div className="ex"><span className="ex-tag">ตัวอย่างวันแบบนี้</span><p>{scoreExample(r.overall)}</p></div>
        </div>

        <div>
          {CATS.map((c) => (
            <div key={c.key} className="cat-row rise" style={{ "--i": CATS.indexOf(c) } as CSSProperties}>
              <div className="cat-head"><span>{c.th}</span><Stars n={r.stars[c.key]} /></div>
              <p>{r.lines[c.key]}</p>
              <div className="ex"><span className="ex-tag">ตัวอย่าง</span><p>{rem.topics.find((t) => t.cat === c.key)?.example}</p></div>
            </div>
          ))}
        </div>

        {r.shiftTip && <div className="bubble reply rise" style={{ "--i": 5 } as CSSProperties}><small>เคล็ดลับตามเวรของคุณ</small><p>{r.shiftTip}</p></div>}

        <button className="btn quiet" style={{ gap: 8 }} onClick={() => { shareText(shareMsg, "คัดลอกดวงแล้ว"); track("share_fortune"); }}>
          <Mascot pose="love" size={28} />แชร์ดวงวันนี้
        </button>
      </section>

      <section className="block">
        <h2 className="heading-icon"><KIcon name="star" size={24} />เคล็ดเสริมดวง</h2>
        <div className="rem-colors">
          <div>
            <small className="muted">สีเสริมดวง</small>
            <div className="chips">{rem.good.map((c) => <span key={c.name} className="chip"><span className="dot" style={{ background: c.hex }} />{c.name}</span>)}</div>
          </div>
          <div>
            <small className="muted">สีที่ควรลดการใช้</small>
            <div className="chips"><span className="chip"><span className="dot" style={{ background: rem.avoidColor.hex }} />{rem.avoidColor.name}</span></div>
          </div>
        </div>
        <p className="hint">สีเสริมดวงคือสีประจำวันนี้กับสีตามธาตุของราศีเกิด ส่วนสีที่ควรลดคือสีของธาตุที่ขัดกัน ไม่ได้แปลว่าห้ามใช้ แค่ให้เลือกสีอื่นเป็นหลักในวันนี้</p>
        <div className="bubble"><small>ของพกติดตัววันนี้</small><p>{rem.carry}</p></div>
        <p className="muted">แยกตามเรื่อง (เรียงจากเรื่องที่ควรใส่ใจที่สุด)</p>
        {rem.topics.map((t, i) => (
          <details key={t.cat} className="remedy" open={i === 0}>
            <summary><span>{t.th}</span><Stars n={t.stars} /></summary>
            <p><b>ควรทำ:</b> {t.todo}</p>
            <p><b>ควรเลี่ยง:</b> {t.avoid}</p>
            <p><b>อุปกรณ์พาดวงดี:</b> {t.item}</p>
          </details>
        ))}
        <div className="bubble reply"><small>เคล็ดตามนักษัตรปีเกิด (ล้านนา)</small><p>{rem.northern}</p></div>
        <p className="disclaimer">เคล็ดเป็นแนวทางเสริมกำลังใจและเตือนสติเท่านั้น ไม่รับประกันผล ตัวอย่างในหน้านี้เป็นเพียงภาพประกอบ ไม่ใช่การทำนายที่แน่นอน</p>
      </section>

      <section className="block">
        <h2>ดูตามหลักโหราศาสตร์</h2>
        <div className="bubble">
          <strong>แบบสากล</strong>
          <small>ราศีเกิด {r.sunSign} · จันทร์จรวันนี้ {r.moonSignToday} ({r.phaseName})</small>
          <p>{r.western}</p>
          <div className="ex"><span className="ex-tag">ตัวอย่าง</span><p>{r.westernEx}</p></div>
        </div>
        <div className="bubble">
          <strong>แบบล้านนา (ภาคเหนือ)</strong>
          <small>ปีเกิด {r.lannaYear} · วันนี้เป็น{r.lannaDay}{r.yam ? ` · เกิด${r.yam}` : ""}</small>
          <p>{r.northern}</p>
          <div className="ex"><span className="ex-tag">ตัวอย่าง</span><p>{r.northernEx}</p></div>
        </div>
        <p className="disclaimer">
          เพื่อความบันเทิงและเป็นกำลังใจเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ การเงิน หรือการตัดสินใจสำคัญ ราศีคำนวณจากตำแหน่งดาวจริง
          ส่วนแบบล้านนาเป็นแบบจำลองอย่างง่ายจากนักษัตรปีเกิด (เปลี่ยนปีช่วงวันพญาวัน ~15 เม.ย.) กับรอบนักษัตร 12 วัน อาจต่างจากตำราหรือหมอเมืองแต่ละสำนัก
        </p>
      </section>

      <CompareBox me={person} />

      <section className="block">
        <h2 className="heading-icon"><KIcon name="gear" size={22} />ข้อมูลดวงของฉัน</h2>
        <p className="muted">เกิด {thaiDateLong(profile.birth_date)}{profile.birth_time ? ` เวลา ${profile.birth_time} น.` : ""} · {profile.share_with_groups ? "แสดงให้เพื่อนในกลุ่มเห็น" : "ไม่แสดงให้ใครเห็น"}</p>
        <button className="btn quiet" onClick={() => setEditing(true)}>แก้ไขข้อมูลวันเกิด</button>
        <button className="btn danger" onClick={remove}>ลบข้อมูลดวง</button>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </>
  );
}
