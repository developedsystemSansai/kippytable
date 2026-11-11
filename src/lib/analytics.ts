"use client";

/** Fire-and-forget Umami custom event (script is loaded with auto-track off). */
export function track(event: string, data?: Record<string, string | number>) {
  try {
    (window as unknown as { umami?: { track: (e: string, d?: unknown) => void } }).umami?.track(event, data);
  } catch {}
}
