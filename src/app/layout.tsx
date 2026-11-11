import type { Metadata, Viewport } from "next";
import { Fredoka, Prompt } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { THEME_BOOT } from "@/lib/theme";

const ui = Prompt({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-ui" });
const brand = Fredoka({ subsets: ["latin"], weight: ["600"], display: "swap", variable: "--font-brand" });

export const metadata: Metadata = {
  title: "Kippy",
  description: "Kippy ตารางเวรของคุณ ลงเวร ดูเวรเพื่อนร่วมกลุ่ม และสรุปรายได้",
  applicationName: "Kippy",
  formatDetection: { telephone: false },
  appleWebApp: { title: "Kippy", statusBarStyle: "default", capable: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1413" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC;
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  return (
    <html lang="th" className={`${ui.variable} ${brand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        {children}
        {umamiSrc && umamiId && (
          <Script
            src={umamiSrc}
            data-website-id={umamiId}
            data-auto-track="false"
            data-exclude-search="true"
            data-exclude-hash="true"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
