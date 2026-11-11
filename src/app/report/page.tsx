"use client";
import { useEffect, useState } from "react";
import { getIncome, getMe, getMyPay, listShifts } from "@/lib/data";
import { THAI_MONTHS, THAI_WEEKDAYS_SHORT, thaiMonthTitle } from "@/lib/dates";
import type { IncomeMonth, Me, PayPosition, Shift } from "@/lib/types";

const baht = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

type Data =
  | { kind: "month"; y: number; m: number; shifts: Shift[] }
  | { kind: "year"; y: number; months: IncomeMonth[] };

export default function ReportPage() {
  const [data, setData] = useState<Data | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [position, setPosition] = useState<PayPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The printed sheet is always light, whatever the app theme is.
    document.documentElement.setAttribute("data-theme", "light");
    const p = new URLSearchParams(location.search);
    (async () => {
      try {
        const [u, pay] = await Promise.all([getMe(), getMyPay().catch(() => null)]);
        setMe(u);
        setPosition(pay?.position ?? null);
        const month = p.get("month");
        const year = Number(p.get("year"));
        if (month && /^\d{4}-\d{2}$/.test(month)) {
          const [y, m] = month.split("-").map(Number);
          setData({ kind: "month", y, m, shifts: await listShifts(month) });
        } else if (year >= 2000 && year <= 2200) {
          setData({ kind: "year", y: year, months: await getIncome(year) });
        } else {
          setError("ไม่พบช่วงเวลาที่ต้องการพิมพ์");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "error");
      }
    })();
  }, []);

  const printedAt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "long", timeStyle: "short" }).format(new Date());

  if (error) return <main className="report"><p>{error}</p><a href="/">กลับ</a></main>;
  if (!data) return <main className="report"><p>กำลังเตรียมรายงาน…</p></main>;

  const rows = data.kind === "month" ? data.shifts : [];
  const work = rows.filter((s) => s.hours > 0);
  const monthTotals = {
    shifts: work.length,
    hours: work.reduce((a, s) => a + s.hours, 0),
    pay: rows.reduce((a, s) => a + s.pay, 0),
  };
  const byType = new Map<string, { n: number; hours: number; pay: number }>();
  for (const s of work) {
    const t = byType.get(s.label) ?? { n: 0, hours: 0, pay: 0 };
    t.n += 1; t.hours += s.hours; t.pay += s.pay;
    byType.set(s.label, t);
  }
  const yearTotals = data.kind === "year"
    ? data.months.reduce((a, r) => ({ shifts: a.shifts + r.shifts, hours: a.hours + r.hours, pay: a.pay + r.pay }), { shifts: 0, hours: 0, pay: 0 })
    : null;
  const byMonth = data.kind === "year" ? new Map(data.months.map((r) => [Number(r.month.slice(5)), r])) : null;

  const title = data.kind === "month" ? `รายงานเวรประจำเดือน ${thaiMonthTitle(data.y, data.m)}` : `รายงานรายได้จากเวร ปี ${data.y + 543}`;

  return (
    <main className="report">
      <style>{`
        .report { max-width: 780px; margin: 0 auto; padding: 24px 20px 60px; color: #111; background: #fff; font-size: 14px; line-height: 1.5; min-height: 100dvh; }
        .report h1 { font-size: 20px; margin: 0 0 4px; }
        .report .meta { color: #444; margin: 0 0 14px; }
        .report table { width: 100%; border-collapse: collapse; margin: 10px 0 18px; }
        .report th, .report td { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; }
        .report th { background: #eee; font-weight: 700; }
        .report td.r, .report th.r { text-align: right; }
        .report tfoot td { font-weight: 700; background: #f5f5f5; }
        .report .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; text-align: center; }
        .report .sign div { border-top: 1px solid #333; padding-top: 6px; }
        .report .actions { display: flex; gap: 8px; margin-bottom: 16px; }
        .report .actions button, .report .actions a { padding: 8px 16px; border: 1px solid #0f7466; background: #0f7466; color: #fff; border-radius: 8px; font: inherit; text-decoration: none; cursor: pointer; }
        .report .actions a { background: #fff; color: #0f7466; }
        .report small { color: #555; }
        @page { size: A4; margin: 14mm; }
        @media print { .report { padding: 0; min-height: 0; } .report .actions { display: none; } body { background: #fff !important; } }
      `}</style>
      <div className="actions">
        <button onClick={() => window.print()}>พิมพ์ / บันทึกเป็น PDF</button>
        <a href="/">กลับไปแอป</a>
      </div>
      <h1>{title}</h1>
      <p className="meta">
        ผู้ปฏิบัติงาน: {me?.name || "—"}{position ? ` · ตำแหน่ง ${position.name}` : ""}<br />
        พิมพ์เมื่อ {printedAt} · จากแอป Kippy
      </p>

      {data.kind === "month" ? (
        <>
          <table>
            <thead><tr><th>วันที่</th><th>วัน</th><th>เวร</th><th className="r">ชั่วโมง</th><th className="r">ค่าเวร (บาท)</th><th>บันทึก</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6}>ไม่มีเวรในเดือนนี้</td></tr>}
              {rows.map((s) => {
                const [y, m, d] = s.date.split("-").map(Number);
                const wd = THAI_WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
                return (
                  <tr key={s.date}>
                    <td>{d} {THAI_MONTHS[m - 1]}</td><td>{wd}.</td><td>{s.label}</td>
                    <td className="r">{s.hours}</td><td className="r">{baht.format(s.pay)}</td><td>{s.note}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td colSpan={3}>รวม {monthTotals.shifts} เวร</td><td className="r">{monthTotals.hours}</td><td className="r">{baht.format(monthTotals.pay)}</td><td /></tr></tfoot>
          </table>
          {byType.size > 0 && (
            <>
              <strong>สรุปแยกประเภทเวร</strong>
              <table>
                <thead><tr><th>เวร</th><th className="r">จำนวน</th><th className="r">ชั่วโมง</th><th className="r">ค่าเวร (บาท)</th></tr></thead>
                <tbody>
                  {[...byType.entries()].map(([k, v]) => <tr key={k}><td>{k}</td><td className="r">{v.n}</td><td className="r">{v.hours}</td><td className="r">{baht.format(v.pay)}</td></tr>)}
                </tbody>
              </table>
            </>
          )}
        </>
      ) : (
        <table>
          <thead><tr><th>เดือน</th><th className="r">จำนวนเวร</th><th className="r">ชั่วโมง</th><th className="r">ค่าเวร (บาท)</th></tr></thead>
          <tbody>
            {THAI_MONTHS.map((mn, i) => {
              const r = byMonth?.get(i + 1);
              return <tr key={mn}><td>{mn}</td><td className="r">{r ? r.shifts : "–"}</td><td className="r">{r ? r.hours : "–"}</td><td className="r">{r ? baht.format(r.pay) : "–"}</td></tr>;
            })}
          </tbody>
          <tfoot><tr><td>รวม</td><td className="r">{yearTotals?.shifts}</td><td className="r">{yearTotals?.hours}</td><td className="r">{baht.format(yearTotals?.pay ?? 0)}</td></tr></tfoot>
        </table>
      )}

      <p><small>ตัวเลขคำนวณจากค่าเวรที่ผู้ใช้กรอกหรือเลือกในแอป ใช้เพื่อตรวจสอบเบื้องต้น ไม่ใช่เอกสารเบิกจ่ายอย่างเป็นทางการ</small></p>
      <div className="sign"><div>ผู้ปฏิบัติงาน</div><div>ผู้ตรวจสอบ / หัวหน้างาน</div></div>
    </main>
  );
}
