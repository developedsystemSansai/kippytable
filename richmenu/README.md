# ริชเมนู Kippy (3 ปุ่ม)

| ปุ่ม | ลิงก์ที่เปิด |
|---|---|
| ซ้าย ตารางเวร | https://kippytable.vercel.app/?tab=schedule |
| กลาง รายได้รวม | https://kippytable.vercel.app/?tab=income |
| ขวา คำทำนาย | https://kippytable.vercel.app/?tab=fortune |

ไฟล์
- `richmenu-2500x843-labeled.jpg` รูปที่เติมคำว่า "ตารางเวร" ใต้มาสคอตซ้าย (แนะนำ)
- `richmenu-2500x843.jpg` รูปตามต้นฉบับของคุณ
- `richmenu.json` พิกัดปุ่ม 3 ช่องเท่ากัน (833 / 834 / 833 × 843 px)
- `create-richmenu.mjs` สคริปต์สร้างผ่าน API (ทางเลือก ถ้าไม่ใช้หน้า LINE Official Account Manager)

อย่า commit หรือวาง Channel access token ลงในแชท/โค้ด ใช้ผ่านตัวแปร `LINE_CHANNEL_ACCESS_TOKEN` เท่านั้น
