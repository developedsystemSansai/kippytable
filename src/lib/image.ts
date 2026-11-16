/** Centre-crops an image file to a square and re-encodes it as a small JPEG (typically 15–40 KB). */
export async function squareJpeg(file: File, size = 256): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("เลือกไฟล์รูปภาพเท่านั้น");
  if (file.size > 15 * 1024 * 1024) throw new Error("ไฟล์ใหญ่เกินไป (สูงสุด 15 MB)");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try { bmp = await createImageBitmap(file); } catch { throw new Error("อ่านรูปนี้ไม่ได้ ลองใช้รูป JPG หรือ PNG"); }
  }
  const s = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("อุปกรณ์นี้ย่อรูปไม่ได้");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  bmp.close?.();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  if (!blob) throw new Error("แปลงรูปไม่สำเร็จ");
  return blob;
}
