"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ensureLiff, track } from "@/lib/liff";
import { createGroup, getGroupDay, joinGroup, leaveGroup, listGroups, type GroupDetailData } from "@/lib/data";
import { addDays, thaiDateLong, todayISO } from "@/lib/dates";
import type { Group } from "@/lib/types";
import Stamp from "./Stamp";
import Mascot from "./Mascot";
import KIcon from "./KIcon";

function Avatar({ name, picture }: { name: string; picture: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  return picture ? <img className="avatar" src={picture} alt="" width={36} height={36} referrerPolicy="no-referrer" />
    : <span className="avatar" aria-hidden>{name.slice(0, 1) || "?"}</span>;
}

export default function GroupsTab() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroups(await listGroups());
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  if (open) return <GroupDetail id={open} onBack={() => { setOpen(null); load(); }} />;

  return (
    <>
      <section className="block">
        <h2>กลุ่มของฉัน</h2>
        {groups === null && !error && <p className="muted">กำลังโหลด…</p>}
        {groups?.length === 0 && (
          <div className="empty" style={{ marginTop: 0 }}>
            <Mascot pose="peek" size={72} />
            <p><strong>ยังไม่มีกลุ่ม</strong><span>สร้างกลุ่มของหน่วยงาน หรือใส่รหัสเชิญจากเพื่อนร่วมเวร</span></p>
          </div>
        )}
        <div className="rows">
          {groups?.map((g) => (
            <button key={g.id} className="row-item" onClick={() => setOpen(g.id)}>
              <span className="grow">
                <span className="title">{g.name}</span>
                <span className="muted">{g.member_count} คน{g.is_owner ? " · เจ้าของกลุ่ม" : ""}</span>
              </span>
              <ChevronRight size={18} aria-hidden />
            </button>
          ))}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="block">
        <h2 className="heading-icon"><KIcon name="group" size={26} />สร้างกลุ่มใหม่</h2>
        <label className="field">ชื่อกลุ่ม
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn" disabled={busy || !name.trim()}
          onClick={() => act(async () => { await createGroup(name.trim()); setName(""); track("create_group"); })}>
          สร้างกลุ่ม
        </button>
      </section>

      <section className="block">
        <h2 className="heading-icon"><KIcon name="heart" size={22} />เข้าร่วมด้วยรหัสเชิญ</h2>
        <label className="field">รหัส 6 ตัว
          <input value={code} maxLength={6} autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())} />
        </label>
        <button className="btn quiet" disabled={busy || code.length !== 6}
          onClick={() => act(async () => { await joinGroup(code); setCode(""); track("join_group"); })}>
          เข้าร่วม
        </button>
      </section>
    </>
  );
}

function GroupDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<GroupDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    getGroupDay(id, date)
      .then((d) => { if (!off) { setData(d); setError(null); } })
      .catch((e) => { if (!off) setError(e instanceof Error ? e.message : "error"); });
    return () => { off = true; };
  }, [id, date]);

  async function invite() {
    if (!data) return;
    const text = `ชวนเข้ากลุ่ม "${data.group.name}" ใน Kippy ใช้รหัสเชิญ ${data.group.invite_code}`;
    try {
      const liff = await ensureLiff();
      if (liff.isApiAvailable("shareTargetPicker")) { await liff.shareTargetPicker([{ type: "text", text }]); return; }
    } catch {}
    try { await navigator.clipboard.writeText(text); alert("คัดลอกคำเชิญแล้ว"); } catch {}
  }

  async function leave() {
    if (!data || !confirm(data.group.is_owner ? "ลบกลุ่มนี้สำหรับทุกคน?" : "ออกจากกลุ่มนี้?")) return;
    try { await leaveGroup(id); onBack(); }
    catch (e) { setError(e instanceof Error ? e.message : "error"); }
  }

  return (
    <>
      <section className="block">
        <button className="btn-line" style={{ marginLeft: 0, justifySelf: "start" }} onClick={onBack}><KIcon name="arrow-left" size={22} /> กลับ</button>
        <h2>{data?.group.name ?? "กำลังโหลด…"}</h2>
        {data && <p className="code-tag">รหัสเชิญ <span className="invite">{data.group.invite_code}</span></p>}
        <div className="seg" role="group" aria-label="เลือกวัน">
          <button aria-pressed={date === today} onClick={() => setDate(today)}>วันนี้</button>
          <button aria-pressed={date === addDays(today, 1)} onClick={() => setDate(addDays(today, 1))}>พรุ่งนี้</button>
        </div>
        <p className="muted">{thaiDateLong(date)}</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="rows">
          {data?.members.map((m) => (
            <div key={m.id} className="row-item">
              <Avatar name={m.name} picture={m.picture} />
              <span className="grow">
                <span className="title">{m.name || "ไม่ระบุชื่อ"}</span>
                <span className="muted">{m.label ? `${m.label}${m.hours ? ` · ${m.hours} ชม.` : ""}` : "ยังไม่ลงเวร"}</span>
              </span>
              <Stamp label={m.label ?? undefined} color={m.color ?? undefined} size="md" />
            </div>
          ))}
        </div>
      </section>
      <section className="block">
        <button className="btn quiet" onClick={invite} style={{ gap: 8 }}><Mascot pose="love" size={30} />ส่งคำเชิญ</button>
        <button className="btn danger" onClick={leave}>{data?.group.is_owner ? "ลบกลุ่ม" : "ออกจากกลุ่ม"}</button>
      </section>
    </>
  );
}
