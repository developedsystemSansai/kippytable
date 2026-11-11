"use client";
import { useEffect, useState } from "react";
import { getGroupHoroscopes, getHoroProfile } from "@/lib/data";
import { compatibility, dailyReading, type Person } from "@/lib/fortune";
import type { GroupHoro, HoroProfile } from "@/lib/types";

/** Daily fortune ranking for members who chose to share their birth date with the group. */
export default function GroupFortune({ groupId, date }: { groupId: string; date: string }) {
  const [members, setMembers] = useState<GroupHoro[] | null>(null);
  const [mine, setMine] = useState<HoroProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    Promise.all([getGroupHoroscopes(groupId), getHoroProfile()])
      .then(([m, p]) => { if (!off) { setMembers(m); setMine(p); } })
      .catch((e) => { if (!off) setError(e instanceof Error ? e.message : "error"); });
    return () => { off = true; };
  }, [groupId]);

  if (error) return null; // optional extra: never block the group page
  if (!members) return null;

  const meP: Person | null = mine ? { birth_date: mine.birth_date, birth_time: mine.birth_time } : null;
  const rows = members
    .map((m) => {
      const p: Person = { birth_date: m.birth_date, birth_time: null };
      return { m, overall: dailyReading(p, date).overall, match: meP ? compatibility(meP, p).score : null };
    })
    .sort((a, b) => b.overall - a.overall);

  return (
    <section className="block">
      <h2>ดวงเพื่อนร่วมกลุ่ม</h2>
      {rows.length === 0 ? (
        <p className="muted">ยังไม่มีใครเปิดให้เห็นวันเกิด เปิดได้ที่แท็บ ดวง</p>
      ) : (
        <div className="rows">
          {rows.map(({ m, overall, match }, i) => (
            <div key={m.id} className="row-item">
              <span className="avatar" aria-hidden>{i + 1}</span>
              <span className="grow">
                <span className="title">{m.name || "ไม่ระบุชื่อ"}</span>
                <span className="muted">{match !== null ? `เข้ากับคุณ ${match}%` : "ตั้งวันเกิดของคุณเพื่อดูความเข้ากัน"}</span>
              </span>
              <strong>{overall}%</strong>
            </div>
          ))}
        </div>
      )}
      <p className="disclaimer">เพื่อความบันเทิงเท่านั้น คำนวณจากวันเกิดที่เพื่อนเลือกแสดงในกลุ่ม</p>
    </section>
  );
}
