import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kippy",
    short_name: "Kippy",
    description: "Kippy ตารางเวรของคุณ ลงเวร ดูเวรเพื่อนร่วมกลุ่ม และสรุปรายได้",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5f2",
    theme_color: "#0e6b5e",
    lang: "th",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
