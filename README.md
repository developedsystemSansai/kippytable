# Kippy

ตารางเวรบน LINE LIFF: ปฏิทินรายเดือนแบบตารางเวรกระดาษ ตราประทับรหัสเวร (ช/บ/ด), สรุปเวรวันนี้/พรุ่งนี้, ลงเวรหลายวัน, กลุ่มเพื่อนร่วมเวร, สรุปรายได้รายปี

> **สถานะ:** ยังไม่ได้ติดตั้ง/build/deploy จริง ให้รัน `npm install`, `npm run typecheck`, `npm run build`
> และทดสอบตามเช็กลิสต์ท้ายไฟล์ก่อนเปิดให้ผู้ใช้จริง

## สถาปัตยกรรม

```
LINE app ──> LIFF (โดเมนของคุณบน Vercel)
                │   Frontend: Next.js บน Vercel  (GitHub push → Vercel auto-deploy)
                │ 1) liff.getIDToken()
                ▼
   Supabase Edge Function  line-auth  ── ตรวจ ID token กับ LINE ── สร้าง/หา user ── คืน token_hash
                │ 2) supabase.auth.verifyOtp(token_hash) → ได้ session จริงของ Supabase
                ▼
   supabase-js ──> Postgres (ตาราง + RLS + RPC)   ← ทุกคำขอผูกกับ auth.uid()
```

- ไม่มี API server ของตัวเอง: หน้าบ้านคุยกับ Supabase ตรง ความปลอดภัยอยู่ที่ Row Level Security และฟังก์ชัน RPC
- เวรเป็นของเจ้าของคนเดียว (policy `user_id = auth.uid()`)
- กลุ่ม/สมาชิกเขียนผ่าน RPC เท่านั้น และ `group_day` ส่งเฉพาะชื่อเวร/สี/ชั่วโมง **ไม่ส่งค่าเวร**
- `service_role` key ใช้เฉพาะใน Edge Function (Supabase ใส่ให้เอง) ห้ามใส่ใน Vercel หรือ repo

## งานภาพ (มาสคอตและไอคอน Kippy)
ไฟล์พื้นหลังโปร่งใสอยู่ใน `public/kippy/`
- `logo-mark.webp` ตราโลโก้ (ใช้คู่กับคำว่า kippy ใน `components/Logo.tsx`), `src/app/icon.png` และ `apple-icon.png` ใช้มาสคอตตัวเดียวกัน
- `mascot/` 14 ท่า: `hello` `sleep` `love` `peek` `run` `think` `cheer` `done` `ok` `rest` และป้ายกะ `sign-ch` `sign-b` `sign-d` `sign-ot` (แถบ “วันนี้” เลือกท่าตามเวร, toast บันทึก = `ok`)
- `icons/` 20 ไอคอน: แท็บ = `calendar-clock` `group` `wallet` `profile`; สัญลักษณ์เวร = `sun`(เช้า) `cloud-sun`(บ่าย) `moon`(ดึก) `clock-plus`(OT) `umbrella`(หยุด) ใน `components/Stamp.tsx` (ชื่อเวรกำหนดเองจะแสดงเป็นตัวอักษร); ลูกศรเดือน/ปี = `arrow-left` `arrow-right`; อื่นๆ `door` `calendar-check` `heart`
  (`gear` `bell` `bed` `star` `clock-sun` `clock-moon` เตรียมไว้ใช้ต่อ)

ท่าของมาสคอตเปลี่ยนตามสถานการณ์ (ดู `lib/art.ts`):
| จุดที่ใช้ | ท่า |
|---|---|
| โหลดแอป | `run` |
| เปิดแอปไม่สำเร็จ / หน้า error / รายได้ว่าง | `think` |
| หน้า 404 / ยังไม่ได้ลงเวร / ยังไม่มีกลุ่ม | `peek` |
| แถบสรุปวันนี้: วันหยุด/เวรดึก | `sleep` |
| แถบสรุปวันนี้: เวรเช้า/บ่าย | `run` |
| แถบสรุปวันนี้: OT | `cheer` |
| เดือนที่ยังไม่มีเวร / ทักทายในแท็บ "ฉัน" | `hello` |
| ปุ่มส่งคำเชิญ | `love` |
| แจ้งเตือนหลังบันทึก/ลบเวร | `done` |

## แนวทางออกแบบ
ตารางเวรกระดาษที่ใช้ได้บนมือถือ: พื้นเรียบ เส้นบาง สีเขียวสครับสีเดียว และ "ตราประทับ" วงกลมแทนเวรแต่ละวัน
ไม่ใช้เงา ไม่ใช้ไล่สี ไม่ใช้ emoji เป็นไอคอน รองรับโหมดมืด (ใช้หลังเวรดึก/ในหอผู้ป่วยตอนกลางคืน)
ฟอนต์ UI คือ Prompt และโลโก้คำว่า kippy ใช้ Fredoka (โหลดผ่าน `next/font`) โทเคนสีทั้งหมดอยู่ที่ต้น `src/app/globals.css`

## โครงสร้าง repo
```
src/                            Next.js (frontend)
supabase/migrations/            SQL: ตาราง, RLS, RPC
supabase/functions/line-auth/   Edge Function ล็อกอินด้วย LINE
.github/workflows/ci.yml        typecheck + build ทุก PR
.github/workflows/supabase.yml  push migration + deploy function เมื่อ supabase/** เปลี่ยนบน main
design/preview.html             พรีวิวหน้าจอแบบ static (เปิดในเบราว์เซอร์ได้เลย)
```

## ตั้งค่าครั้งแรก

### 1) GitHub
สร้าง repo (private ได้) แล้ว push โปรเจกต์ขึ้น `main`

### 2) Supabase
1. สร้างโปรเจกต์ที่ supabase.com (region ใกล้ไทย เช่น Singapore)
2. ติดตั้ง CLI แล้ว link:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <PROJECT_REF>
   supabase db push                                   # สร้างตาราง + RLS + RPC
   supabase secrets set LINE_LOGIN_CHANNEL_ID=<Channel ID ของ LINE Login> LINE_LOGIN_CHANNEL_SECRET=<Channel secret> LINE_REDIRECT_URI=https://<โดเมนของคุณ>/auth/callback
   supabase secrets set ALLOWED_ORIGIN=https://<โดเมนของคุณ>
   supabase functions deploy line-auth
   ```
3. Authentication → Providers → Email: ปิด "Enable sign ups" (ผู้ใช้ถูกสร้างโดย Edge Function ผ่าน admin API)
   แล้วทดสอบล็อกอินว่ายังใช้ได้ (ยังไม่ได้ทดสอบจริง)
4. Settings → API: คัดลอก Project URL และ **anon/publishable key** (ไม่ใช่ service_role)

### 3) LINE Developers Console
1. LINE Login channel → เปิด scope `openid` และ `profile`
2. LIFF app → Endpoint URL = โดเมนที่ Vercel ให้ (หรือโดเมนของคุณ), Scope = `openid profile`
3. คัดลอก LIFF ID

### 4) Vercel
1. Add New Project → Import repo จาก GitHub (Framework: Next.js)
2. Environment Variables (Production + Preview): `NEXT_PUBLIC_LIFF_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ทุกครั้งที่ push เข้า `main` Vercel deploy production เอง และทุก PR ได้ Preview URL

### 5) GitHub Actions (ไม่บังคับแต่แนะนำ)
Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`
การแก้ `supabase/**` บน `main` จะ push migration และ deploy function ให้อัตโนมัติ

## พัฒนาบนเครื่อง
```bash
cp .env.example .env.local   # กรอกค่า
npm install
npm run typecheck
npm run dev
```
ตอนพัฒนาให้สร้าง LIFF app แยกที่ Endpoint เป็น `http://localhost:3000`

## เช็กลิสต์ทดสอบก่อนใช้จริง
1. เปิดแอปใน LINE → ล็อกอินสำเร็จ เห็นปฏิทินว่าง
2. ลงเวร แก้ ลบ เลือกหลายวัน เปลี่ยนเดือน
3. สร้างกลุ่ม → ใช้ LINE อีกบัญชีเข้าร่วมด้วยรหัส → เห็นเวรกันรายวัน แต่ไม่เห็นค่าเวร
4. ใช้ anon key เรียก `rest/v1/shifts` โดยไม่ล็อกอิน ต้องได้ข้อมูลว่างหรือถูกปฏิเสธ
5. ล็อกอินบัญชี A แล้วลองอ่านเวรของบัญชี B ผ่าน supabase-js ต้องไม่เห็น
6. "ลบข้อมูลทั้งหมดของฉัน" แล้วตรวจว่าแถวใน `profiles`/`shifts` หายและ auth user ถูกลบ

## ที่ยังไม่มี
- แชร์เป็นรูป (ตอนนี้แชร์เป็นข้อความผ่าน LINE)
- จัดเวรทดลอง/แนะนำเวรอัตโนมัติ
- Rate limit ที่ `line-auth` (แนะนำใส่ที่ Cloudflare)


## แอนิเมชัน
มาสคอตมี pop-in แล้ววนท่าทางตามท่า (`data-pose`), ตราประทับเด้งเข้าปฏิทินทีละช่อง, เนื้อหาแท็บ/sheet/toast มีการเลื่อนเข้า-ออก, ปุ่มมี press feedback ทั้งหมดอยู่ท้าย `globals.css` และปิดอัตโนมัติเมื่อผู้ใช้ตั้ง “ลดการเคลื่อนไหว” (`prefers-reduced-motion`)
