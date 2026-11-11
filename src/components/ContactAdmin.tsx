"use client";
import { useCallback, useEffect, useState } from "react";
import { listMyMessages, sendMessage } from "@/lib/data";
import type { Message } from "@/lib/types";
import KIcon from "./KIcon";

const fmt = (iso: string) => new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

const ERRORS: Record<string, string> = {
  too_many_messages: "ส่งข้อความบ่อยเกินไป ลองอีกครั้งในอีกสักครู่ (ได้ 5 ข้อความต่อชั่วโมง)",
  invalid_message: "ข้อความต้องมี 1–1000 ตัวอักษร",
};

export default function ContactAdmin() {
  const [text, setText] = useState("");
  const [list, setList] = useState<Message[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    try { setList(await listMyMessages()); } catch (e) { setError(e instanceof Error ? e.message : "error"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function send() {
    setBusy(true); setError(null); setSent(false);
    try { await sendMessage(text.trim()); setText(""); setSent(true); await load(); }
    catch (e) { const m = e instanceof Error ? e.message : "error"; setError(ERRORS[m] ?? m); }
    finally { setBusy(false); }
  }

  return (
    <section className="block">
      <h2 className="heading-icon"><KIcon name="bell" size={24} />ติดต่อผู้ดูแลระบบ</h2>
      <p className="muted">แจ้งปัญหา เสนอแนะ หรือขอแก้ค่าเวร ผู้ดูแลจะตอบกลับในหน้านี้</p>
      <label className="field">ข้อความ
        <textarea rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <button className="btn" disabled={busy || !text.trim()} onClick={send}>ส่งข้อความ</button>
      {sent && <p className="hint" role="status">ส่งข้อความแล้ว</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {list && list.length > 0 && (
        <div className="rows" style={{ gap: 10 }}>
          {list.map((m) => (
            <div key={m.id} className="bubble">
              <small>{fmt(m.created_at)}</small>
              <p>{m.body}</p>
              {m.reply
                ? <div className="bubble reply"><small>ผู้ดูแลระบบตอบ · {m.replied_at ? fmt(m.replied_at) : ""}</small><p>{m.reply}</p></div>
                : <small>รอผู้ดูแลตอบกลับ</small>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
