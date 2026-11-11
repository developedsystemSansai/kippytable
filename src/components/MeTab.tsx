"use client";
import { useState } from "react";
import { deleteMyAccount } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { Me } from "@/lib/types";
import Mascot from "./Mascot";
import KIcon from "./KIcon";

export default function MeTab({ me }: { me: Me }) {
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    await supabase().auth.signOut();
    location.reload();
  }

  async function deleteAll() {
    if (!confirm("ลบข้อมูลทั้งหมดของคุณ (เวร กลุ่มที่สร้าง) แบบถาวร?")) return;
    try {
      await deleteMyAccount();
      await logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    }
  }

  return (
    <>
      <section className="block">
        <div className="hello-row">
          <Mascot pose="hello" size={84} />
          <p><strong>สวัสดี{me.name ? ` ${me.name}` : ""}</strong><span className="muted">Kippy พร้อมช่วยดูเวรของคุณ</span></p>
        </div>
        <div className="row-item" style={{ borderBottom: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {me.picture ? <img className="avatar" src={me.picture} alt="" width={36} height={36} referrerPolicy="no-referrer" />
            : <span className="avatar" aria-hidden>{me.name.slice(0, 1) || "?"}</span>}
          <span className="grow"><span className="title">{me.name || "ผู้ใช้"}</span><span className="muted">เข้าสู่ระบบด้วย LINE</span></span>
        </div>
        <button className="btn quiet" onClick={logout} style={{ gap: 8 }}><KIcon name="door" size={22} />ออกจากระบบ</button>
      </section>
      <section className="block">
        <h2 className="heading-icon"><KIcon name="profile" size={24} />ข้อมูลของฉัน</h2>
        <p className="muted">เพื่อนในกลุ่มเห็นเฉพาะชื่อเวรและจำนวนชั่วโมง ไม่เห็นค่าเวรหรือรายได้ของคุณ</p>
        <button className="btn danger" onClick={deleteAll}>ลบข้อมูลทั้งหมดของฉัน</button>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </>
  );
}
