"use client";
import type Liff from "@line/liff";

let liffPromise: Promise<typeof Liff> | null = null;

/** Initialise LIFF once; redirects to LINE Login if the user is not logged in. */
export function ensureLiff(): Promise<typeof Liff> {
  if (!liffPromise) {
    liffPromise = (async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) throw new Error("NEXT_PUBLIC_LIFF_ID is not set");
      const { default: liff } = await import("@line/liff");
      await liff.init({ liffId });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.origin + window.location.pathname });
        // login() navigates away; keep the promise pending.
        await new Promise<never>(() => {});
      }
      return liff;
    })();
    liffPromise.catch(() => {
      liffPromise = null;
    });
  }
  return liffPromise;
}

/** Fire-and-forget Umami custom event (script is loaded with auto-track off). */
export function track(event: string, data?: Record<string, string | number>) {
  try {
    (window as unknown as { umami?: { track: (e: string, d?: unknown) => void } }).umami?.track(event, data);
  } catch {}
}
