"use client";

export type ThemeMode = "system" | "day" | "night" | "auto";
export const THEME_KEY = "kippy_theme";

/** "auto" = night between 18:00 and 05:59 Bangkok time. */
function isNightNow(): boolean {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false }).format(new Date()));
  return h >= 18 || h < 6;
}

export function getThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "day" || v === "night" || v === "auto" || v === "system") return v;
  } catch {}
  return "system";
}

/** Resolve a mode to the attribute on <html>: "light" | "dark" | null (follow the device). */
export function resolveTheme(mode: ThemeMode): "light" | "dark" | null {
  if (mode === "day") return "light";
  if (mode === "night") return "dark";
  if (mode === "auto") return isNightNow() ? "dark" : "light";
  return null;
}

export function applyTheme(mode: ThemeMode) {
  const el = document.documentElement;
  const t = resolveTheme(mode);
  if (t) el.setAttribute("data-theme", t); else el.removeAttribute("data-theme");
  const dark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", dark ? "#0e1413" : "#f3f5f2"));
}

export function setThemeMode(mode: ThemeMode) {
  try { localStorage.setItem(THEME_KEY, mode); } catch {}
  applyTheme(mode);
}

/** Inline script for <head>: sets data-theme before first paint (no flash). Keep in sync with resolveTheme. */
export const THEME_BOOT = `(function(){try{var m=localStorage.getItem("${THEME_KEY}");var t=null;if(m==="day")t="light";else if(m==="night")t="dark";else if(m==="auto"){var h=+new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Bangkok",hour:"2-digit",hour12:false}).format(new Date());t=(h>=18||h<6)?"dark":"light"}if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
