"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteWorkEntry, listWorkHistory, saveWorkEntry } from "@/lib/data";
import { THAI_MONTHS, todayISO } from "@/lib/dates";
import { tenure, tenureText } from "@/lib/tenure";
import type { WorkEntry } from "@/lib/types";
import KIcon from "./KIcon";

const ERRORS: Record<string, string> = {
  invalid_date: "วันที่ต้องไม่เกินวันนี้",
  too_many_entries: "เพิ่มได้สูงสุด 40 รายการ",
};

const monthYear = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
};

type Draft = { id: string | null; org: string; role: string; start: string; end: string; current: boolean };
const blank: Draft = { id: null, org: "", role: "", start: "", end: "", current: false };

function period(e: WorkEntry): string {
  const t = tenure(e.start_date, e.end_date ?? todayISO());
  return `${monthYear(e.start_date)} – ${e.end_date ? monthYear(e.end_date) : "ปัจจุบัน"}${t ? ` · ${tenureText(t)}` : ""}`;
}

function Sheet({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dlg = useRef<HTMLDivElement>(null);
  const today = todayISO();

  useEffect(() => { dlg.current?.focus(); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const end = d.current ? null : d.end || null;
  const problem = !d.org.trim() ? "ใส่ชื่อหน่วยงานหรือสถานที่ทำงาน"
    : !d.start ? "เลือกวันที่เริ่มงาน"
    : d.start > today ? "วันที่เริ่มงานต้องไม่เกินวันนี้"
    : !d.current && !d.end ? "เลือกวันที่สิ้นสุด หรือติ๊ก \"ยังทำงานอยู่\""
    : end && end < d.start ? "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม"
    : end && end > today ? "วันที่สิ้นสุดต้องไม่เกินวันนี้" : null;

  async function save() {
    if (problem) return;
    setBusy(true); setError(null);
    try {
      await saveWorkEntry(d.id, { org: d.org.trim(), role: d.role.trim(), start_date: d.start, end_date: end });
      onSaved();
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setError(ERRORS[m] ?? "บันทึกไม่สำเร็จ ลองอีกครั้ง");
      setBusy(false);
    }
  }

  async function remove() {
    if (!d.id || !window.confirm("ลบรายการนี้?")) return;
    setBusy(true); setError(null);
    try { await deleteWorkEntry(d.id); onSaved(); } catch { setError("ลบไม่สำเร็จ ลองอีกครั้ง"); setBusy(false); }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div ref={dlg} tabIndex={-1} className="sheet" role="dialog" aria-modal="true" aria-label={d.id ? "แก้ไขประวัติการทำงาน" : "เพิ่มประวัติการทำงาน"}>
        <h2>{d.id ? "แก้ไขประวัติการทำงาน" : "เพิ่มประวัติการทำงาน"}</h2>
        <label className="field">หน่วยงาน / สถานที่ทำงาน
          <input value={d.org} maxLength={120} autoComplete="organization" placeholder="เช่น รพ.สต.บางขะแยง" onChange={(e) => setD({ ...d, org: e.target.value })} />
        </label>
        <label className="field">ตำแหน่ง / หน้าที่ (ถ้ามี)
          <input value={d.role} maxLength={120} placeholder="เช่น พยาบาลวิชาชีพ งานผู้ป่วยนอก" onChange={(e) => setD({ ...d, role: e.target.value })} />
        </label>
        <label className="field">วันที่เริ่มงาน
          <input type="date" value={d.start} min="1950-01-01" max={today} onChange={(e) => setD({ ...d, start: e.target.value })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={d.current} onChange={(e) => setD({ ...d, current: e.target.checked })} />
          <span>ยังทำงานอยู่ที่นี่</span>
        </label>
        {!d.current && (
          <label className="field">วันที่สิ้นสุด
            <input type="date" value={d.end} min={d.start || "1950-01-01"} max={today} onChange={(e) => setD({ ...d, end: e.target.value })} />
          </label>
        )}
        {(error || (problem && (d.org || d.start))) && <p className="error" role="alert">{error ?? problem}</p>}
        <button className="btn" disabled={busy || !!problem} onClick={save}>บันทึก</button>
        <div className="row2">
          <button className="btn quiet" onClick={onClose} disabled={busy}>ปิด</button>
          {d.id && <button className="btn danger" onClick={remove} disabled={busy}>ลบรายการ</button>}
        </div>
      </div>
    </>
  );
}

export default function WorkHistory() {
  const [items, setItems] = useState<WorkEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(() => {
    setLoadError(false);
    listWorkHistory().then(setItems).catch(() => setLoadError(true));
  }, []);
  useEffect(load, [load]);

  const edit = (e: WorkEntry) => setDraft({ id: e.id, org: e.org, role: e.role, start: e.start_date, end: e.end_date ?? "", current: !e.end_date });

  return (
    <section className="block">
      <h2 className="heading-icon"><KIcon name="profile" size={24} />ประวัติการทำงาน</h2>
      {loadError && <p className="error" role="alert">โหลดประวัติไม่สำเร็จ <button className="btn-line" onClick={load}>ลองอีกครั้ง</button></p>}
      {items && items.length === 0 && <p className="muted">ยังไม่มีประวัติ เพิ่มที่ทำงานเดิมหรือหน่วยงานที่เคยย้ายผ่านมาได้</p>}
      {items?.map((e) => (
        <button key={e.id} className="row-item work-item" onClick={() => edit(e)} aria-label={`แก้ไข ${e.org}`}>
          <span className="grow">
            <span className="title">{e.org}</span>
            {e.role && <span className="muted">{e.role}</span>}
            <span className="muted">{period(e)}</span>
          </span>
        </button>
      ))}
      <button className="btn quiet" onClick={() => setDraft(blank)} disabled={!items}>+ เพิ่มประวัติการทำงาน</button>
      {draft && <Sheet draft={draft} onClose={() => setDraft(null)} onSaved={() => { setDraft(null); load(); }} />}
    </section>
  );
}
