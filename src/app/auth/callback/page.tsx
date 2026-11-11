"use client";
import { useEffect, useState } from "react";
import { finishLineLogin } from "@/lib/supabase";
import Mascot from "@/components/Mascot";

export default function CallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const code = p.get("code");
    if (p.get("error") || !code) {
      setError(p.get("error_description") || p.get("error") || "missing_code");
      return;
    }
    finishLineLogin(code, p.get("state"))
      .then(() => location.replace("/"))
      .catch((e) => setError(e instanceof Error ? e.message : "error"));
  }, []);

  if (error) {
    return (
      <main className="splash">
        <Mascot pose="think" size={120} />
        <p role="alert">เข้าสู่ระบบไม่สำเร็จ</p>
        <p className="muted">{error}</p>
        <a className="btn" href="/">ลองอีกครั้ง</a>
      </main>
    );
  }
  return (
    <main className="splash">
      <Mascot pose="run" size={112} />
      <p className="muted">กำลังเข้าสู่ระบบ…</p>
    </main>
  );
}
