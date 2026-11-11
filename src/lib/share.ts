"use client";

/** Share text: native share sheet if available, otherwise copy to clipboard. */
export async function shareText(text: string, copiedMessage: string) {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return; // user closed the sheet
  }
  try {
    await navigator.clipboard.writeText(text);
    alert(copiedMessage);
  } catch {}
}
