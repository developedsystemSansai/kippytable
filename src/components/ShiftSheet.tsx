"use client";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { deleteShifts, getMyPay, saveShifts } from "@/lib/data";
import { thaiDateLong } from "@/lib/dates";
import { PRESETS, type PayPosition, type PayRate, type Shift } from "@/lib/types";
import Stamp from "./Stamp";

type Props = {
  dates: string[];
  existing?: Shift;
  onClose: () => void;
  onChanged: (kind: "saved" | "deleted") => void | Promise<void>;
};

/** Pay from the ministry preset. OT scales by hours (rate is per `per_hours`); other shifts are a flat rate per shift. */
function presetPay(rate: PayRate | undefined, label: string, hours: number): number | null {
  if (!rate) return null;
  if (label.trim().toUpperCase() === "OT") return Math.round(((rate.pay * hours) / rate.per_hours) * 100) / 100;
  return hours > 0 ? rate.pay : 0;
}

export default function ShiftSheet({ dates, existing, onClose, onChanged }: Props) {
  const [label, setLabel] = useState(existing?.label ?? PRESETS[0].label);
  const [hours, setHours] = useState(String(existing?.hours ?? PRESETS[0].hours));
  const [pay, setPay] = useState(String(existing?.pay ?? 0));
  const [color, setColor] = useState(existing?.color ?? PRESETS[0].color);
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<PayPosition | null>(null);
  const [rates, setRates] = useState<Record<string, PayRate> | null>(null);
  // An existing shift keeps its saved pay until the person taps a preset; a new shift follows the preset.
  const [payTouched, setPayTouched] = useState(Boolean(existing));

  const title = dates.length === 1 ? thaiDateLong(dates[0]) : `${dates.length} วันที่เลือก`;

  useEffect(() => {
    let off = false;
    getMyPay().then((r) => { if (!off) { setPosition(r.position); setRates(r.rates); } }).catch(() => { if (!off) setRates({}); });
    return () => { off = true; };
  }, []);

  const rate = rates?.[label.trim()];
  const suggested = presetPay(rate, label, Number(hours) || 0);

  useEffect(() => {
    if (!payTouched && suggested !== null) setPay(String(suggested));
  }, [suggested, payTouched]);

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
              onClick={() => { setLabel(p.label); setHours(String(p.hours)); setColor(p.color); setPayTouched(false); if (p.hours === 0) setPay("0"); }}>
              <Stamp label={p.label} color={p.color} size="md" />
              {p.label}
            </button>
          ))}
        </div>

        <div className="row2">
          <label className="field">ชื่อเวร
            <input value={label} maxLength={20} onChange={(e) => { setLabel(e.target.value); setPayTouched(false); }} />
          </label>
          <label className="field">ชั่วโมง
            <input type="number" inputMode="decimal" min={0} max={24} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
        </div>
        <div className="row2">
          <label className="field">ค่าเวร (บาท)
            <input type="number" inputMode="decimal" min={0} step={1} value={pay} onChange={(e) => { setPay(e.target.value); setPayTouched(true); }} />
          </label>
          <label className="field">สีตราประทับ
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>

        {rates !== null && !position && (
          <p className="hint">ตั้ง “ตำแหน่ง” ที่แท็บ ฉัน แล้วค่าเวรจะขึ้นให้อัตโนมัติตามเกณฑ์ สธ.</p>
        )}
        {position && (
          <p className="hint">
            อัตรา สธ. ({position.name}):{" "}
            {suggested !== null ? <><b>{suggested.toLocaleString("th-TH")} บาท</b>
              {payTouched && String(suggested) !== pay && <> · <button className="link-btn" onClick={() => { setPay(String(suggested)); setPayTouched(false); }}>ใช้ค่านี้</button></>}</>
              : "ไม่มีอัตราสำหรับเวรชื่อนี้ กรอกเองได้"}
            {rate?.note ? <><br />{rate.note}</> : null}
          </p>
        )}

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
