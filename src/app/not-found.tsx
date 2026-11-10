import Link from "next/link";
import Mascot from "@/components/Mascot";

export default function NotFound() {
  return (
    <main className="splash">
      <Mascot pose="peek" size={130} />
      <p role="alert"><strong>Kippy หาหน้านี้ไม่เจอ</strong></p>
      <p className="muted">ลิงก์อาจพิมพ์ผิดหรือหน้านี้ถูกย้ายไปแล้ว</p>
      <Link className="btn" href="/">กลับไปตารางเวร</Link>
    </main>
  );
}
