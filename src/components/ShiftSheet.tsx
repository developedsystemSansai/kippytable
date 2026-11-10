"use client";
import { useState } from "react";
import { track } from "@/lib/liff";
import { deleteShifts, saveShifts } from "@/lib/data";
import { thaiDateLong } from "@/lib/dates";
import { PRESETS, type Shift } from "@/lib/types";
import Stamp from "./Stamp";

type Props = {
  dates: string[];
  existing?: Shift;
  onClose: () => void;
  onChanged: (kind: "saved" | "deleted") => void | Promise<void>;
};

export default function ShiftSheet({ dates, existing, onClose, onChanged }: Props) {
  const [label, setLabel] = useState(existing?.label ?? PRESETS[0].label);
  const [hours, setHours] = useState(String(existing?.hours ?? PRESETS[0].hours));
  const [pay, setPay] = useState(String(existing?.pay ?? 0));
  const [color, setColor] = useState(existing?.color ?? PRESETS[0].color);
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = dates.length === 1 ? thaiDateLong(dates[0]) : `${dates.length} วันที่เลือก`;

  async function run(fn: () => Promise<unknown>, kind: "saved" | "deleted") {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged(kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      await saveShifts(dates, { label: label.trim(), hours: Number(hours), pay: Number(pay || 0), color, note: note.trim() });
      track("save_shift", { days: dates.length });
    }, "saved");

  const remove = () =>
    run(async () => {
      await deleteShifts(dates);
      track("delete_shift", { days: dates.length });
    }, "deleted");

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`ลงเวร ${title}`}>
        <h2>{title}</h2>

        <div className="pick" role="group" aria-label="เลือกประเภทเวร">
          {PRESETS.map((p) => (
            <button key={p.label} aria-pressed={label === p.label && color === p.color}
              onClick={() => { setLabel(p.label); setHours(String(p.hours)); setColor(p.color); }}>
              <Stamp label={p.label} color={p.color} size="md" />
              {p.label}
            </button>
          ))}
        </div>

        <div className="row2">
          <label className="field">ชื่อเวร
            <input value={label} maxLength={20} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="field">ชั่วโมง
            <input type="number" inputMode="decimal" min={0} max={24} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
        </div>
        <div className="row2">
          <label className="field">ค่าเวร (บาท)
            <input type="number" inputMode="decimal" min={0} step={1} value={pay} onChange={(e) => setPay(e.target.value)} />
          </label>
          <label className="field">สีตราประทับ
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
        <label className="field">บันทึก
          <textarea rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        {error && <p className="error" role="alert">บันทึกไม่สำเร็จ ({error})</p>}

        <button className="btn" disabled={busy || !label.trim()} onClick={save}>บันทึก</button>
        <div className="row2">
          <button className="btn quiet" onClick={onClose} disabled={busy}>ปิด</button>
          <button className="btn danger" onClick={remove} disabled={busy || (dates.length === 1 && !existing)}>ลบเวร</button>
        </div>
      </div>
    </>
  );
}
