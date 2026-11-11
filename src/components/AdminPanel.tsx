"use client";
import { useCallback, useEffect, useState } from "react";
import {
  adminDeleteMessage, adminDeleteRate, adminListMessages, adminReply, adminSaveRate, getPayConfig,
  type PayConfig,
} from "@/lib/data";
import type { AdminMessage, PayRate } from "@/lib/types";
import KIcon from "./KIcon";

const fmt = (iso: string) => new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

function RateRow({ r, onSaved, onError }: { r: PayRate; onSaved: () => void; onError: (m: string) => void }) {
  const [pay, setPay] = useState(String(r.pay));
  const [per, setPer] = useState(String(r.per_hours));
  const [note, setNote] = useState(r.note);
  const [busy, setBusy] = useState(false);
  const dirty = pay !== String(r.pay) || per !== String(r.per_hours) || note !== r.note;

  async function save() {
    setBusy(true);
    try { await adminSaveRate(r.position_code, r.shift, Number(pay), Number(per), note); onSaved(); }
    catch (e) { onError(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }
  async function del() {
    if (!confirm(`ลบอัตรา “${r.shift}” ของตำแหน่งนี้?`)) return;
    try { await adminDeleteRate(r.position_code, r.shift); onSaved(); }
    catch (e) { onError(e instanceof Error ? e.message : "error"); }
  }

  return (
    <div className="bubble">
      <div className="rate-row">
        <strong>{r.shift}</strong>
        <label className="field">บาท
          <input type="number" inputMode="decimal" min={0} step={1} value={pay} onChange={(e) => setPay(e.target.value)} />
        </label>
        <label className="field">ต่อ ชม.
          <input type="number" inputMode="decimal" min={0.5} max={24} step={0.5} value={per} onChange={(e) => setPer(e.target.value)} />
        </label>
      </div>
      <label className="field">หมายเหตุ
        <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="row2">
        <button className="btn" disabled={busy || !dirty} onClick={save}>บันทึก</button>
        <button className="btn danger" disabled={busy} onClick={del}>ลบ</button>
      </div>
    </div>
  );
}

function Rates() {
  const [cfg, setCfg] = useState<PayConfig | null>(null);
  const [pos, setPos] = useState("");
  const [shift, setShift] = useState("");
  const [pay, setPay] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const c = await getPayConfig(true); setCfg(c); setPos((p) => p || c.positions[0]?.code || ""); }
    catch (e) { setError(e instanceof Error ? e.message : "error"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = (cfg?.rates ?? []).filter((r) => r.position_code === pos).sort((a, b) => a.shift.localeCompare(b.shift, "th"));

  async function add() {
    setError(null);
    try { await adminSaveRate(pos, shift.trim(), Number(pay || 0), 8, ""); setShift(""); setPay(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "error"); }
  }

  return (
    <section className="block">
      <h2 className="heading-icon"><KIcon name="wallet" size={24} />อัตราค่าเวรตามตำแหน่ง</h2>
      <p className="muted">ค่าที่ตั้งไว้จะขึ้นอัตโนมัติเมื่อผู้ใช้เลือกตำแหน่งนั้นและลงเวรชื่อตรงกัน (เวร OT คิดตามชั่วโมงของ “ต่อ ชม.”) อัตราเริ่มต้นมาจากเกณฑ์ สธ. ควรตรวจกับประกาศของหน่วยงานก่อนใช้จริง</p>
      <label className="field">ตำแหน่ง
        <select value={pos} onChange={(e) => setPos(e.target.value)}>
          {cfg?.positions.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
      </label>
      {rows.map((r) => <RateRow key={`${r.position_code}|${r.shift}|${r.pay}|${r.per_hours}|${r.note}`} r={r} onSaved={load} onError={setError} />)}
      <div className="bubble">
        <strong>เพิ่มอัตราใหม่</strong>
        <div className="row2">
          <label className="field">ชื่อเวร<input value={shift} maxLength={20} onChange={(e) => setShift(e.target.value)} /></label>
          <label className="field">บาท<input type="number" inputMode="decimal" min={0} value={pay} onChange={(e) => setPay(e.target.value)} /></label>
        </div>
        <button className="btn quiet" disabled={!shift.trim() || !pos} onClick={add}>เพิ่ม</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}

function Inbox() {
  const [list, setList] = useState<AdminMessage[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setList(await adminListMessages()); } catch (e) { setError(e instanceof Error ? e.message : "error"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function reply(id: string) {
    try { await adminReply(id, drafts[id] ?? ""); setDrafts((d) => ({ ...d, [id]: "" })); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "error"); }
  }
  async function del(id: string) {
    if (!confirm("ลบข้อความนี้?")) return;
    try { await adminDeleteMessage(id); await load(); } catch (e) { setError(e instanceof Error ? e.message : "error"); }
  }

  return (
    <section className="block">
      <h2 className="heading-icon"><KIcon name="bell" size={24} />กล่องข้อความ{list ? ` (${list.filter((m) => !m.reply).length} รอตอบ)` : ""}</h2>
      {list?.length === 0 && <p className="muted">ยังไม่มีข้อความ</p>}
      {list?.map((m) => (
        <div key={m.id} className="bubble">
          <small>{m.name || "ไม่ระบุชื่อ"} · {fmt(m.created_at)}</small>
          <p>{m.body}</p>
          {m.reply && <div className="bubble reply"><small>ตอบแล้ว · {m.replied_at ? fmt(m.replied_at) : ""}</small><p>{m.reply}</p></div>}
          <label className="field">{m.reply ? "แก้ข้อความตอบ" : "ตอบกลับ"}
            <textarea rows={2} maxLength={1000} value={drafts[m.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))} />
          </label>
          <div className="row2">
            <button className="btn" disabled={!(drafts[m.id] ?? "").trim()} onClick={() => reply(m.id)}>ส่งคำตอบ</button>
            <button className="btn danger" onClick={() => del(m.id)}>ลบ</button>
          </div>
        </div>
      ))}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  return (
    <>
      <section className="block">
        <button className="btn-line" style={{ marginLeft: 0, justifySelf: "start" }} onClick={onBack}><KIcon name="arrow-left" size={22} /> กลับ</button>
        <h2>จัดการระบบ (แอดมิน)</h2>
      </section>
      <Inbox />
      <Rates />
    </>
  );
}
