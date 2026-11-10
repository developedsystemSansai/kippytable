// Roster codes, as on a printed ward rota: เช้า = ช, บ่าย = บ, ดึก = ด.
const KNOWN: Record<string, string> = { "เช้า": "ช", "บ่าย": "บ", "ดึก": "ด", "หยุด": "ย" };
const LEADING_VOWELS = /^[เแโใไ]+/;

export function shiftCode(label: string): string {
  const t = label.trim();
  if (KNOWN[t]) return KNOWN[t];
  if (/^[A-Za-z]/.test(t)) return t.slice(0, 2).toUpperCase();
  const stripped = t.replace(LEADING_VOWELS, "");
  return Array.from(stripped)[0] ?? Array.from(t)[0] ?? "?";
}

/** Readable text colour (dark ink or white) for a hex background. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.3 ? "#16201e" : "#ffffff";
}
