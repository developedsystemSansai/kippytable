"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Share2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { shareText } from "@/lib/share";
import { listShifts } from "@/lib/data";
import {
  THAI_WEEKDAYS_SHORT, addDays, monthCells, shiftMonth, thaiDateLong, thaiMonthTitle, todayISO,
} from "@/lib/dates";
import type { Shift } from "@/lib/types";
import ShiftSheet from "./ShiftSheet";
import { poseForShift } from "@/lib/art";
import Stamp from "./Stamp";
import Mascot from "./Mascot";
import KIcon from "./KIcon";

export default function ScheduleTab() {
  const today = todayISO();
  const [ty, tm] = today.split("-").map(Number);
  const [ym, setYm] = useState<[number, number]>([ty, tm]);
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [summaryDay, setSummaryDay] = useState<"today" | "tomorrow">("today");
  const [multi, setMulti] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; pose: "ok" | "done" } | null>(null);

  const monthKey = `${ym[0]}-${String(ym[1]).padStart(2, "0")}`;

  const load = useCallback(async () => {
    try {
      const rows = await listShifts(monthKey);
      setShifts((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) if (k.startsWith(monthKey)) delete next[k];
        for (const s of rows) next[s.date] = s;
        return next;
      });
      setError(null);
      setLoadedKey(monthKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    }
  }, [monthKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const cells = useMemo(() => monthCells(ym[0], ym[1]), [ym]);
  const monthShifts = Object.values(shifts).filter((s) => s.date.startsWith(monthKey));
  const workShifts = monthShifts.filter((s) => s.hours > 0);
  const totalHours = workShifts.reduce((a, s) => a + s.hours, 0);

  const summaryDate = summaryDay === "today" ? today : addDays(today, 1);
  const summaryShift = shifts[summaryDate];

  function onDay(date: string) {
    if (multi) setPicked((p) => (p.includes(date) ? p.filter((d) => d !== date) : [...p, date]));
    else setEditing([date]);
  }

  async function share() {
    track("share_month");
    const lines = [...monthShifts]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => `${thaiDateLong(s.date)}: ${s.label}${s.hours ? ` (${s.hours} ชม.)` : ""}`);
    const text = `ตารางเวร ${thaiMonthTitle(ym[0], ym[1])}\n${lines.join("\n") || "ยังไม่ได้ลงเวร"}`;
    await shareText(text, "คัดลอกตารางเวรแล้ว");
  }

  return (
    <>
      <section className="today" aria-label="สรุปเวร">
        <div className="seg" role="group" aria-label="เลือกวันสรุปเวร">
          <button type="button" aria-pressed={summaryDay === "today"} onClick={() => setSummaryDay("today")}>วันนี้</button>
          <button type="button" aria-pressed={summaryDay === "tomorrow"} onClick={() => setSummaryDay("tomorrow")}>พรุ่งนี้</button>
        </div>
        <button className="today-row" type="button" onClick={() => setEditing([summaryDate])}
          aria-label={summaryDay === "today" ? "แก้ไขเวรวันนี้" : "แก้ไขเวรพรุ่งนี้"}>
          <Stamp label={summaryShift?.label} color={summaryShift?.color} size="lg" />
          <span className="today-text">
            <strong>
              {summaryShift ? `${summaryShift.label}${summaryShift.hours ? ` · ${summaryShift.hours} ชม.` : ""}` : "ยังไม่ได้ลงเวร"}
            </strong>
            <span>{summaryShift ? summaryShift.note || thaiDateLong(summaryDate) : thaiDateLong(summaryDate)}</span>
          </span>
          <Mascot key={`${summaryDay}-${summaryShift?.label ?? "none"}`} pose={poseForShift(summaryShift?.label)} size={72} />
          <ChevronRight size={18} aria-hidden />
        </button>
      </section>

      <section className="roster" aria-label="ตารางเวร">
        <div className="roster-head">
          <div className="month-switch">
            <button className="icon-btn" aria-label="เดือนก่อนหน้า" onClick={() => setYm(shiftMonth(ym[0], ym[1], -1))}><KIcon name="arrow-left" size={34} /></button>
            <h2>{thaiMonthTitle(ym[0], ym[1])}</h2>
            <button className="icon-btn" aria-label="เดือนถัดไป" onClick={() => setYm(shiftMonth(ym[0], ym[1], 1))}><KIcon name="arrow-right" size={34} /></button>
          </div>
          <button className="icon-btn" aria-label="แชร์ตารางเวร" title="แชร์ตารางเวร" onClick={share}><Share2 size={19} strokeWidth={1.75} /></button>
        </div>

        <div className="roster-sum">
          <span><b>{workShifts.length}</b> เวร</span>
          <span><b>{totalHours}</b> ชม.</span>
          <button className="btn-line" aria-pressed={multi} onClick={() => { setMulti(!multi); setPicked([]); }}>
            <KIcon name="calendar-check" size={20} /> {multi ? "ยกเลิก" : "เลือกหลายวัน"}
          </button>
        </div>

        {multi && (
          <div className="multi-bar">
            <button className="btn-line solid" disabled={picked.length === 0} onClick={() => setEditing([...picked].sort())}>
              ลงเวร {picked.length} วัน
            </button>
          </div>
        )}

        {error && <p className="error" role="alert">โหลดตารางเวรไม่สำเร็จ ({error})</p>}

        <div className="grid" role="grid">
          {THAI_WEEKDAYS_SHORT.map((w) => <span key={w} className="wd">{w}</span>)}
          {cells.map((date, i) => {
            if (!date) return <span key={`v${i}`} className="cell void" />;
            const s = shifts[date];
            return (
              <button key={date}
                aria-label={`${thaiDateLong(date)} ${s ? s.label : "ยังไม่ได้ลงเวร"}`}
                aria-pressed={multi ? picked.includes(date) : false}
                className={`cell ${date < today ? "past" : ""} ${date === today ? "today" : ""}`}
                style={{ ["--i" as string]: Math.min(i, 30) }}
                onClick={() => onDay(date)}>
                <span className="cell-n">{Number(date.slice(8))}</span>
                {s && <Stamp label={s.label} color={s.color} size="sm" />}
              </button>
            );
          })}
        </div>

        {loadedKey === monthKey && !error && monthShifts.length === 0 && (
          <div className="empty">
            <Mascot pose="hello" size={72} />
            <p><strong>เดือนนี้ยังไม่มีเวร</strong><span>แตะวันที่เพื่อลงเวร หรือกด “เลือกหลายวัน” เพื่อลงทีเดียวหลายวัน</span></p>
          </div>
        )}
      </section>

      {editing && (
        <ShiftSheet
          dates={editing}
          existing={editing.length === 1 ? shifts[editing[0]] : undefined}
          onClose={() => setEditing(null)}
          onChanged={async (kind) => {
            setToast(kind === "saved" ? { text: "บันทึกเวรแล้ว", pose: "ok" } : { text: "ลบเวรแล้ว", pose: "done" });
            setEditing(null);
            setPicked([]);
            setMulti(false);
            await load();
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <Mascot pose={toast.pose} size={36} />
          {toast.text}
        </div>
      )}
    </>
  );
}
