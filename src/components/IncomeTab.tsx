"use client";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { track } from "@/lib/analytics";
import { getIncome } from "@/lib/data";
import { THAI_MONTHS, todayISO } from "@/lib/dates";
import type { IncomeMonth } from "@/lib/types";
import KIcon from "./KIcon";
import Mascot from "./Mascot";

const baht = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

export default function IncomeTab() {
  const [year, setYear] = useState(Number(todayISO().slice(0, 4)));
  const [rows, setRows] = useState<IncomeMonth[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    setRows(null);
    getIncome(year)
      .then((d) => { if (!off) { setRows(d); setError(null); } })
      .catch((e) => { if (!off) setError(e instanceof Error ? e.message : "error"); });
    return () => { off = true; };
  }, [year]);

  const byMonth = new Map((rows ?? []).map((r) => [Number(r.month.slice(5)), r]));
  const total = (rows ?? []).reduce((a, r) => a + r.pay, 0);
  const hours = (rows ?? []).reduce((a, r) => a + r.hours, 0);
  const shifts = (rows ?? []).reduce((a, r) => a + r.shifts, 0);

  return (
    <section className="block">
      <div className="year-switch">
        <h2 className="heading-icon"><KIcon name="wallet" size={28} />รายได้ปี {year + 543}</h2>
        <div className="month-switch">
          <button className="icon-btn" aria-label="ปีก่อนหน้า" onClick={() => setYear(year - 1)}><KIcon name="arrow-left" size={34} /></button>
          <button className="icon-btn" aria-label="ปีถัดไป" onClick={() => setYear(year + 1)}><KIcon name="arrow-right" size={34} /></button>
        </div>
      </div>
      {error && <p className="error" role="alert">โหลดไม่สำเร็จ ({error})</p>}
      <table className="ledger">
        <thead>
          <tr><th>เดือน</th><th>เวร / ชม.</th><th>บาท</th></tr>
        </thead>
        <tbody>
          {THAI_MONTHS.map((m, i) => {
            const r = byMonth.get(i + 1);
            return (
              <tr key={m} className={r ? "" : "zero"}>
                <td>{m}</td>
                <td className="num">{r ? `${r.shifts} / ${r.hours}` : rows ? "–" : "…"}</td>
                <td>{r ? baht.format(r.pay) : "–"}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr><td>รวม</td><td className="num">{shifts} / {hours}</td><td>{baht.format(total)}</td></tr>
        </tfoot>
      </table>
      {rows && rows.length === 0 && !error && (
        <div className="empty" style={{ marginTop: 0 }}>
          <Mascot pose="think" size={72} />
          <p><strong>ปีนี้ยังไม่มีค่าเวร</strong><span>ใส่ค่าเวรตอนลงเวร แล้วสรุปรายเดือนจะขึ้นที่นี่</span></p>
        </div>
      )}
      <p className="muted">คำนวณจากค่าเวรที่กรอกไว้ในแต่ละวัน</p>
      <a className="btn quiet" href={`/report?year=${year}`} target="_blank" rel="noopener" style={{ gap: 8 }} onClick={() => track("print_report", { kind: "year" })}>
        <Printer size={18} strokeWidth={1.75} />พิมพ์รายงานรายได้ปี {year + 543}
      </a>
    </section>
  );
}
