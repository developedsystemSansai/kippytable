"use client";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { deleteHoroProfile, getHoroProfile, listShifts, saveHoroProfile } from "@/lib/data";
import { addDays, isValidISO, thaiDateLong, todayISO } from "@/lib/dates";
import { CATS, compatibility, dailyReading, type Compat, type Person, type Reading } from "@/lib/fortune";
import { shareText } from "@/lib/share";
import type { HoroProfile } from "@/lib/types";
import KIcon from "./KIcon";
import Mascot from "./Mascot";

const STREAK_KEY = "kippy_fortune_streak";

function Stars({ n }: { n: number }) {
  return <span className="stars" aria-label={`${n} จาก 5 ดาว`}>{"★".repeat(n)}<i>{"★".repeat(5 - n)}</i></span>;
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

  const date = day === "today" ? today : addDays(today, 1);

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
              <Mascot pose="think" size={72} />
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
  const r: Reading = dailyReading(person, date, shiftLabel);
  const shareMsg = `ดวง${day === "today" ? "วันนี้" : "พรุ่งนี้"} ${r.overall}% · ${r.headline}\nสีมงคล ${r.luckyColor.name} · เลขนำโชค ${r.luckyNumber}\nจาก Kippy`;

  return (
    <>
      <section className="block">
        <div className="seg" role="group" aria-label="เลือกวัน">
          <button aria-pressed={day === "today"} onClick={() => setDay("today")}>วันนี้</button>
          <button aria-pressed={day === "tomorrow"} onClick={() => setDay("tomorrow")}>พรุ่งนี้</button>
        </div>
        <p className="muted">{thaiDateLong(date)}{streak > 1 ? ` · เปิดดูต่อเนื่อง ${streak} วัน` : ""}</p>

        <div className="fortune-hero">
          <span className="muted">ดวงรวม</span>
          <span className="big">{r.overall}%</span>
          <div className="bar" aria-hidden><span style={{ width: `${r.overall}%` }} /></div>
          <strong>{r.headline}</strong>
          <div className="chips">
            <span className="chip"><span className="dot" style={{ background: r.luckyColor.hex }} />สีมงคล {r.luckyColor.name}</span>
            <span className="chip">เลขนำโชค {r.luckyNumber}</span>
            <span className="chip">{r.sunSign}</span>
            {r.ascSign && <span className="chip">ลัคนา{r.ascSign.replace("ราศี", "")}</span>}
            <span className="chip">{r.lannaYear}</span>
          </div>
        </div>

        <div>
          {CATS.map((c) => (
            <div key={c.key} className="cat-row">
              <div className="cat-head"><span>{c.th}</span><Stars n={r.stars[c.key]} /></div>
              <p>{r.lines[c.key]}</p>
            </div>
          ))}
        </div>

        {r.shiftTip && <div className="bubble reply"><small>เคล็ดลับตามเวรของคุณ</small><p>{r.shiftTip}</p></div>}

        <button className="btn quiet" style={{ gap: 8 }} onClick={() => { shareText(shareMsg, "คัดลอกดวงแล้ว"); track("share_fortune"); }}>
          <Mascot pose="love" size={28} />แชร์ดวงวันนี้
        </button>
      </section>

      <section className="block">
        <h2>ดูตามหลักโหราศาสตร์</h2>
        <div className="bubble">
          <strong>แบบสากล</strong>
          <small>ราศีเกิด {r.sunSign} · จันทร์จรวันนี้ {r.moonSignToday} ({r.phaseName})</small>
          <p>{r.western}</p>
        </div>
        <div className="bubble">
          <strong>แบบล้านนา (ภาคเหนือ)</strong>
          <small>ปีเกิด {r.lannaYear} · วันนี้เป็น{r.lannaDay}{r.yam ? ` · เกิด${r.yam}` : ""}</small>
          <p>{r.northern}</p>
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
