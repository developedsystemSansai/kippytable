// Kippy artwork. Files live in /public/kippy/{mascot,icons}/*.webp (transparent).
export type Pose = "hello" | "sleep" | "love" | "peek" | "run" | "think" | "cheer" | "done" | "ok" | "sign-ch" | "sign-b" | "sign-d" | "sign-ot" | "rest";
export type IconName = "arrow-left" | "arrow-right" | "bed" | "bell" | "calendar-check" | "calendar-clock" | "clock-moon" | "clock-plus" | "clock-sun" | "cloud-sun" | "door" | "gear" | "group" | "heart" | "moon" | "profile" | "star" | "sun" | "umbrella" | "wallet";

// Intrinsic pixel sizes [w, h] so the browser can reserve space before the image loads.
export const POSE_SIZE: Record<Pose, [number, number]> = {
  "hello": [280, 242],
  "sleep": [204, 248],
  "love": [219, 222],
  "peek": [210, 218],
  "run": [229, 229],
  "think": [203, 214],
  "cheer": [271, 211],
  "done": [269, 218],
  "ok": [253, 229],
  "sign-ch": [196, 259],
  "sign-b": [209, 253],
  "sign-d": [210, 252],
  "sign-ot": [212, 247],
  "rest": [264, 191],
};
export const ICON_SIZE: Record<IconName, [number, number]> = {
  "arrow-left": [110, 104],
  "arrow-right": [112, 104],
  "bed": [129, 108],
  "bell": [130, 122],
  "calendar-check": [123, 122],
  "calendar-clock": [135, 127],
  "clock-moon": [147, 99],
  "clock-plus": [117, 94],
  "clock-sun": [151, 107],
  "cloud-sun": [136, 130],
  "door": [117, 130],
  "gear": [121, 131],
  "group": [143, 97],
  "heart": [104, 95],
  "moon": [130, 118],
  "profile": [99, 132],
  "star": [99, 107],
  "sun": [122, 123],
  "umbrella": [144, 117],
  "wallet": [131, 112],
};
export const LOGO_MARK: [number, number] = [275, 242];

/** Which pose greets the user for a given shift label (or none). */
export function poseForShift(label?: string): Pose {
  if (!label) return "peek";
  if (label === "เช้า") return "sign-ch";
  if (label === "บ่าย") return "sign-b";
  if (label === "ดึก") return "sign-d";
  if (label === "หยุด") return "rest";
  if (label.toUpperCase().startsWith("OT")) return "sign-ot";
  return "hello";
}

/** Symbol shown on a shift stamp. Custom shift names fall back to a letter code. */
export function symbolForShift(label: string): IconName | null {
  const t = label.trim();
  if (t === "เช้า") return "sun";
  if (t === "บ่าย") return "cloud-sun";
  if (t === "ดึก") return "moon";
  if (t === "หยุด") return "umbrella";
  if (t.toUpperCase().startsWith("OT")) return "clock-plus";
  return null;
}
