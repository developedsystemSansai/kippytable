"use client";
import Mascot from "@/components/Mascot";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="splash">
      <Mascot pose="think" size={130} />
      <p role="alert"><strong>มีบางอย่างผิดพลาด</strong></p>
      <p className="muted">ลองใหม่อีกครั้ง ถ้ายังไม่หาย ให้ปิดแล้วเปิดแอปใหม่</p>
      <button className="btn" onClick={reset}>ลองอีกครั้ง</button>
    </main>
  );
}
