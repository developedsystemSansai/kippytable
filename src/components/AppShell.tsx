"use client";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/data";
import type { Me } from "@/lib/types";
import Logo from "./Logo";
import Mascot from "./Mascot";
import KIcon from "./KIcon";
import type { IconName } from "@/lib/art";
import ScheduleTab from "./ScheduleTab";
import GroupsTab from "./GroupsTab";
import IncomeTab from "./IncomeTab";
import MeTab from "./MeTab";

type TabId = "schedule" | "groups" | "income" | "me";
const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "schedule", label: "ตารางเวร", icon: "calendar-clock" },
  { id: "groups", label: "กลุ่ม", icon: "group" },
  { id: "income", label: "รายได้", icon: "wallet" },
  { id: "me", label: "ฉัน", icon: "profile" },
];

export default function AppShell() {
  const [tab, setTab] = useState<TabId>("schedule");
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getMe(); // also performs LIFF init + Supabase session exchange
        if (!cancelled) setMe(user);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <main className="splash">
        <Mascot pose="think" size={120} />
        <p role="alert">เปิด Kippy ไม่สำเร็จ</p>
        <p className="muted">{error}</p>
        <button className="btn" onClick={() => location.reload()}>ลองอีกครั้ง</button>
      </main>
    );
  }
  if (!me) {
    return (
      <main className="splash">
        <Mascot pose="run" size={112} />
        <Logo size={30} markless />
        <p className="muted">กำลังเปิด…</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner"><Logo size={22} /></div>
      </header>
      <div className="app-content">
        <div key={tab} className="tab-view">
          {tab === "schedule" && <ScheduleTab />}
          {tab === "groups" && <GroupsTab />}
          {tab === "income" && <IncomeTab />}
          {tab === "me" && <MeTab me={me} />}
        </div>
      </div>
      <nav className="app-tabs" aria-label="เมนูหลัก">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
            <KIcon name={t.icon} size={28} />
            {t.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
