"use client";
import { useEffect, useState } from "react";
import { applyTheme, getThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme";
import KIcon from "./KIcon";

export const THEME_LABEL: Record<ThemeMode, string> = {
  system: "ตามเครื่อง", day: "กลางวัน", night: "กลางคืน", auto: "อัตโนมัติตามเวลา",
};

/** Quick day/night switch for the top bar. Full options live in the "ฉัน" tab. */
export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const m = getThemeMode();
    setMode(m);
    applyTheme(m);
    const read = () => setDark(document.documentElement.getAttribute("data-theme") === "dark"
      || (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches));
    read();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // keep "auto" in step with the clock
    const timer = setInterval(() => { if (getThemeMode() === "auto") { applyTheme("auto"); read(); } }, 60_000);
    return () => { mq.removeEventListener("change", read); obs.disconnect(); clearInterval(timer); };
  }, []);

  function flip() {
    const next: ThemeMode = dark ? "day" : "night";
    setThemeMode(next);
    setMode(next);
  }

  return (
    <button className="icon-btn theme-toggle" onClick={flip} aria-label={dark ? "เปลี่ยนเป็นโหมดกลางวัน" : "เปลี่ยนเป็นโหมดกลางคืน"}
      title={`โหมดแสดงผล: ${THEME_LABEL[mode]}`}>
      <KIcon name={dark ? "sun" : "moon"} size={26} />
    </button>
  );
}
