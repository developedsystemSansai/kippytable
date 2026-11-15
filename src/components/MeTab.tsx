"use client";
import { useEffect, useState } from "react";
import { deleteMyAccount, getPayConfig, getProfessions, setMyPosition, setMyWork } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { tenure, tenureText } from "@/lib/tenure";
import { supabase } from "@/lib/supabase";
import { getThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme";
import type { Me, PayPosition, Profession } from "@/lib/types";
import AdminPanel from "./AdminPanel";
import ContactAdmin from "./ContactAdmin";
import { THEME_LABEL } from "./ThemeToggle";
import Mascot from "./Mascot";
import KIcon from "./KIcon";

const THEME_MODES: ThemeMode[] = ["day", "night", "auto", "system"];

const WORK_ERRORS: Record<string, string> = {
  invalid_start_date: "วันที่เริ่มงานไม่ถูกต้อง (ต้องไม่เกินวันนี้)",
  invalid_profession: "ไม่พบวิชาชีพที่เลือก",
  invalid_position: "ไม่พบตำแหน่งที่เลือก",
};

export default function MeTab({ me }: { me: Me }) {
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"main" | "admin">("main");
  const [positions, setPositions] = useState<PayPosition[]>([]);
  const [position, setPosition] = useState(me.position_code ?? "");
  const [saved, setSaved] = useState(false);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [profession, setProfession] = useState(me.profession_code ?? "");
  const [start, setStart] = useState(me.start_date ?? "");
  const [base, setBase] = useState({ profession: me.profession_code ?? "", start: me.start_date ?? "" });
  const [workBusy, setWorkBusy] = useState(false);
  const [workSaved, setWorkSaved] = useState(false);
  const [workError, setWorkError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("system");

  useEffect(() => {
    setTheme(getThemeMode());
    getPayConfig().then((c) => setPositions(c.positions)).catch(() => {});
    getProfessions().then(setProfessions).catch(() => {});
  }, []);

  async function logout() {
    await supabase().auth.signOut();
    location.reload();
  }

  async function deleteAll() {
    if (!confirm("ลบข้อมูลทั้งหมดของคุณ (เวร กลุ่มที่สร้าง ข้อมูลดวง ข้อความ) แบบถาวร?")) return;
    try {
      await deleteMyAccount();
      await logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    }
  }

  async function changePosition(code: string) {
    setPosition(code);
    setSaved(false);
    setError(null);
    try { await setMyPosition(code || null); setSaved(true); }
    catch (e) { setError(e instanceof Error ? e.message : "error"); }
  }

  const groups = new Map<string, Profession[]>();
  for (const p of professions) groups.set(p.grp, [...(groups.get(p.grp) ?? []), p]);
  const t = start ? tenure(start) : null;
  const dirty = profession !== base.profession || start !== base.start;

  async function saveWork() {
    setWorkBusy(true); setWorkSaved(false); setWorkError(null);
    const changed = profession !== base.profession;
    try {
      await setMyWork(profession || null, start || null, changed ? null : position || null);
      const mapped = professions.find((p) => p.code === profession)?.pay_position;
      if (changed && mapped) setPosition(mapped);
      setBase({ profession, start });
      setWorkSaved(true);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setWorkError(WORK_ERRORS[m] ?? (m || "บันทึกไม่สำเร็จ"));
    } finally { setWorkBusy(false); }
  }

  if (view === "admin" && me.is_admin) return <AdminPanel onBack={() => setView("main")} />;

  return (
    <>
      <section className="block">
        <div className="hello-row">
          <Mascot pose="hello" size={84} />
          <p><strong>สวัสดี{me.name ? ` ${me.name}` : ""}</strong><span className="muted">Kippy พร้อมช่วยดูเวรของคุณ</span></p>
        </div>
        <div className="row-item" style={{ borderBottom: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {me.picture ? <img className="avatar" src={me.picture} alt="" width={36} height={36} referrerPolicy="no-referrer" />
            : <span className="avatar" aria-hidden>{me.name.slice(0, 1) || "?"}</span>}
          <span className="grow"><span className="title">{me.name || "ผู้ใช้"}</span><span className="muted">เข้าสู่ระบบด้วย LINE{me.is_admin ? " · ผู้ดูแลระบบ" : ""}</span></span>
        </div>
        {me.is_admin && <button className="btn" onClick={() => setView("admin")} style={{ gap: 8 }}><KIcon name="gear" size={22} />จัดการระบบ (แอดมิน)</button>}
        <button className="btn quiet" onClick={logout} style={{ gap: 8 }}><KIcon name="door" size={22} />ออกจากระบบ</button>
      </section>

      <section className="block">
        <h2 className="heading-icon"><KIcon name="profile" size={24} />วิชาชีพและอายุงาน</h2>
        <label className="field">วิชาชีพ
          <select value={profession} onChange={(e) => { setProfession(e.target.value); setWorkSaved(false); }}>
            <option value="">ยังไม่เลือก</option>
            {[...groups].map(([g, list]) => (
              <optgroup key={g} label={g}>{list.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</optgroup>
            ))}
          </select>
        </label>
        <label className="field">วันที่เริ่มทำงาน
          <input type="date" value={start} min="1950-01-01" max={todayISO()} onChange={(e) => { setStart(e.target.value); setWorkSaved(false); }} />
        </label>
        {t && <p className="tenure" role="status"><span className="muted">อายุงาน</span><b>{tenureText(t)}</b></p>}
        {start && !t && <p className="error" role="alert">วันที่เริ่มงานต้องไม่เกินวันนี้</p>}
        <button className="btn" onClick={saveWork} disabled={workBusy || !dirty || (!!start && !t)}>บันทึกข้อมูลการทำงาน</button>
        {workSaved && <p className="hint" role="status">บันทึกข้อมูลการทำงานแล้ว{profession ? " กลุ่มค่าเวรถูกตั้งตามวิชาชีพ เปลี่ยนได้ด้านล่าง" : ""}</p>}
        {workError && <p className="error" role="alert">{workError}</p>}
      </section>

      <section className="block">
        <h2 className="heading-icon"><KIcon name="wallet" size={24} />ตำแหน่งและค่าเวร</h2>
        <label className="field">ตำแหน่งของฉัน
          <select value={position} onChange={(e) => changePosition(e.target.value)}>
            <option value="">ยังไม่เลือก (กรอกค่าเวรเอง)</option>
            {positions.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </label>
        <p className="hint">เมื่อเลือกตำแหน่ง ค่าเวรจะขึ้นให้อัตโนมัติตอนลงเวรตามเกณฑ์ค่าตอบแทนของกระทรวงสาธารณสุข และยังแก้ตัวเลขเองได้ทุกครั้ง อัตราจริงอาจต่างกันตามหน่วยงาน</p>
        {saved && <p className="hint" role="status">บันทึกตำแหน่งแล้ว</p>}
      </section>

      <section className="block">
        <h2 className="heading-icon"><KIcon name="cloud-sun" size={24} />การแสดงผล</h2>
        <div className="seg-wrap" role="group" aria-label="โหมดแสดงผล">
          {THEME_MODES.map((m) => (
            <button key={m} aria-pressed={theme === m} onClick={() => { setTheme(m); setThemeMode(m); }}>{THEME_LABEL[m]}</button>
          ))}
        </div>
        <p className="hint">อัตโนมัติจะเปลี่ยนเป็นโหมดกลางคืนตั้งแต่ 18:00 ถึง 05:59 น. (เวลาไทย) ปุ่มดวงอาทิตย์/ดวงจันทร์ด้านบนใช้สลับเร็วได้ทุกหน้า</p>
      </section>

      <ContactAdmin />

      <section className="block">
        <h2 className="heading-icon"><KIcon name="profile" size={24} />ข้อมูลของฉัน</h2>
        <p className="muted">เพื่อนในกลุ่มเห็นเฉพาะชื่อเวรและจำนวนชั่วโมง ไม่เห็นค่าเวรหรือรายได้ของคุณ</p>
        <button className="btn danger" onClick={deleteAll}>ลบข้อมูลทั้งหมดของฉัน</button>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </>
  );
}
