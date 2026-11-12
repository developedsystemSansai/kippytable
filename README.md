# Kippy

ตารางเวรบนมือถือ เปิดผ่าน LINE: ปฏิทินรายเดือนแบบตารางเวรกระดาษ ตราประทับรหัสเวร (ช/บ/ด/OT), สรุปเวรวันนี้/พรุ่งนี้, ลงเวรหลายวัน, กลุ่มเพื่อนร่วมเวร, สรุปรายได้รายปี/รายเดือน (พิมพ์ได้), อัตราค่าเวรตามตำแหน่ง, ติดต่อแอดมิน และแท็บ "ดวง" (ดูดวง/ไพ่ทาโรต์/ดวงกลุ่ม)

## สถาปัตยกรรม

```
LINE (ริชเมนู / ลิงก์) ──> เว็บแอป Next.js บน Vercel  (GitHub push → Vercel auto-deploy)
                │ 1) startLineLogin(): ส่งไป LINE Login (OAuth 2.0 authorization code, scope profile openid)
                │    LINE redirect กลับ /auth/callback?code=...
                ▼
   Supabase Edge Function  line-auth ── แลก code เป็น id_token กับ LINE ── ตรวจ id_token ── หา/สร้าง user ── คืน token_hash
                │ 2) supabase.auth.verifyOtp(token_hash) → ได้ session จริงของ Supabase
                ▼
   supabase-js ──> Postgres (ตาราง + RLS + RPC)   ← ทุกคำขอผูกกับ auth.uid()
```

- **ไม่ใช้ LIFF** เป็นการล็อกอินด้วย LINE Login แบบ redirect (ใช้ได้ทั้งในเบราว์เซอร์ LINE และเบราว์เซอร์ทั่วไป)
- ไม่มี API server ของตัวเอง: หน้าบ้านคุยกับ Supabase ตรง ความปลอดภัยอยู่ที่ Row Level Security และฟังก์ชัน RPC
- เวรเป็นของเจ้าของคนเดียว (policy `user_id = auth.uid()`)
- กลุ่ม/สมาชิก/ข้อความ/แอดมิน เขียนผ่าน RPC เท่านั้น `group_day` ส่งเฉพาะชื่อเวร/สี/ชั่วโมง **ไม่ส่งค่าเวร** และ `group_horoscopes` ส่งเฉพาะวันเกิดของคนที่ยินยอมแชร์ (ไม่ส่งเวลาเกิด)
- สิทธิ์แอดมิน = `profiles.is_admin` (แก้ผ่าน RPC ไม่ได้ ต้องตั้งใน SQL Editor)
- `service_role` key ใช้เฉพาะใน Edge Function (Supabase ใส่ให้เอง) ห้ามใส่ใน Vercel หรือ repo
- ตอนสร้าง auth user ใหม่ trigger `on_auth_user_created` จะสร้างแถว `profiles` ในธุรกรรมเดียวกัน (กัน user กำพร้า)

## ลิงก์ริชเมนู
ปุ่มริชเมนูเปิด `/?tab=schedule|income|fortune` (ค่าที่ใช้ได้: `schedule` `groups` `income` `fortune` `me`) ถ้ายังไม่ล็อกอิน แอปจะจำแท็บไว้และพากลับมาหน้านั้นหลังล็อกอินเสร็จ รายละเอียดอยู่ใน `richmenu/README.md`

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
src/                              Next.js (frontend)
supabase/migrations/              SQL: ตาราง, RLS, RPC, ฟีเจอร์ v2, hardening
supabase/functions/line-auth/     Edge Function ล็อกอินด้วย LINE
.github/workflows/ci.yml          typecheck + build ทุก PR / push main
.github/workflows/supabase.yml    deploy Edge Function เมื่อ supabase/functions/** เปลี่ยนบน main
richmenu/                         รูป + สคริปต์สร้างริชเมนู LINE
design/preview.html               พรีวิวหน้าจอแบบ static (เปิดในเบราว์เซอร์ได้เลย)
```

## ตัวแปรสภาพแวดล้อม (Vercel: Production + Preview / ในเครื่อง: `.env.local`)
ดูตัวอย่างใน `.env.example`

| ชื่อ | ค่า |
|---|---|
| `NEXT_PUBLIC_KIPPY_SUPABASE_URL` | Project URL ของ Supabase |
| `NEXT_PUBLIC_KIPPY_SUPABASE_ANON_KEY` | anon/publishable key (ไม่ใช่ service_role) |
| `NEXT_PUBLIC_LINE_CHANNEL_ID` | Channel ID ของ LINE Login |
| `NEXT_PUBLIC_UMAMI_SRC`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | ไม่บังคับ (Umami analytics) |

## ตั้งค่าครั้งแรก

### 1) Supabase
1. สร้างโปรเจกต์ (region ใกล้ไทย เช่น Singapore)
2. รัน SQL ใน `supabase/migrations/` ตามลำดับชื่อไฟล์ (SQL Editor หรือ `supabase link` + `supabase db push`) — โปรเจกต์ production บันทึกประวัติ migration ไว้แล้ว `db push` จะรันเฉพาะไฟล์ใหม่
3. ตั้งแอดมิน: ดูคำสั่งท้ายไฟล์ `20261111000000_features.sql`
4. Secrets ของ Edge Function:
   ```bash
   supabase secrets set LINE_LOGIN_CHANNEL_ID=<Channel ID> LINE_LOGIN_CHANNEL_SECRET=<Channel secret> \
     LINE_REDIRECT_URI=https://<โดเมน>/auth/callback ALLOWED_ORIGIN=https://<โดเมน>
   supabase functions deploy line-auth --no-verify-jwt
   ```
5. Authentication → Providers → Email: ปิด "Enable sign ups" (ผู้ใช้ถูกสร้างโดย Edge Function ผ่าน admin API)

### 2) LINE Developers Console
LINE Login channel → เปิด scope `openid` `profile` และเพิ่ม Callback URL = `https://<โดเมน>/auth/callback`

### 3) Vercel
Import repo จาก GitHub (Framework: Next.js) ตั้งตัวแปรตามตารางด้านบน ทุก push เข้า `main` deploy production เอง และทุก PR ได้ Preview URL

### 4) GitHub Actions
- `ci.yml` ไม่ต้องตั้งค่า
- `supabase.yml` ต้องมี Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID` (project ref)

## พัฒนาบนเครื่อง
```bash
cp .env.example .env.local   # กรอกค่า
npm install
npm run typecheck
npm run dev
```
เพิ่ม `http://localhost:3000/auth/callback` เป็น Callback URL ของ LINE Login ถ้าจะทดสอบล็อกอินในเครื่อง (และตั้ง `LINE_REDIRECT_URI` ให้ตรงกัน)

## เช็กลิสต์ทดสอบก่อนใช้จริง
1. เปิดแอปจาก LINE → ล็อกอินสำเร็จ เห็นปฏิทินว่าง
2. กดปุ่มริชเมนู "รายได้รวม" / "คำทำนาย" ตอนยังไม่ล็อกอิน → หลังล็อกอินต้องเปิดแท็บนั้น
3. ลงเวร แก้ ลบ เลือกหลายวัน เปลี่ยนเดือน
4. สร้างกลุ่ม → ใช้ LINE อีกบัญชีเข้าร่วมด้วยรหัส → เห็นเวรกันรายวัน แต่ไม่เห็นค่าเวร
5. ใช้ anon key เรียก `rest/v1/shifts` โดยไม่ล็อกอิน ต้องได้ข้อมูลว่างหรือถูกปฏิเสธ
6. ล็อกอินบัญชี A แล้วลองอ่านเวรของบัญชี B ผ่าน supabase-js ต้องไม่เห็น
7. บัญชีที่ไม่ใช่แอดมินเรียก `admin_save_rate` ต้องได้ `forbidden`
8. "ลบข้อมูลทั้งหมดของฉัน" แล้วตรวจว่าแถวใน `profiles`/`shifts` หายและ auth user ถูกลบ

## ที่ยังไม่มี
- แชร์เป็นรูป (ตอนนี้แชร์เป็นข้อความผ่าน LINE)
- จัดเวรทดลอง/แนะนำเวรอัตโนมัติ
- Rate limit ที่ `line-auth` (แนะนำใส่ที่ Cloudflare)
- อัตราค่าเวรเริ่มต้นอ้างอิงเกณฑ์ ก.สธ. แอดมินต้องตรวจ/แก้ให้ตรงกับประกาศของหน่วยงานในแอป

## แอนิเมชัน
มาสคอตมี pop-in แล้ววนท่าทางตามท่า (`data-pose`), ตราประทับเด้งเข้าปฏิทินทีละช่อง, เนื้อหาแท็บ/sheet/toast มีการเลื่อนเข้า-ออก, ปุ่มมี press feedback ทั้งหมดอยู่ท้าย `globals.css` และปิดอัตโนมัติเมื่อผู้ใช้ตั้ง “ลดการเคลื่อนไหว” (`prefers-reduced-motion`)
