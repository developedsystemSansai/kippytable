"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ensureLiff } from "./liff";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase env is not set");
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

/** Reads the (unverified) `sub` claim only to compare which LINE account a stored session belongs to. */
function subOf(idToken: string): string | null {
  try {
    const part = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(part)) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}

let sessionPromise: Promise<string> | null = null;

/** Make sure a Supabase session exists for the current LINE user. Returns the Supabase user id. */
export function ensureSession(): Promise<string> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const liff = await ensureLiff();
      const sb = supabase();
      const idToken = liff.getIDToken();
      if (!idToken) {
        liff.logout();
        liff.login({ redirectUri: window.location.href });
        return new Promise<never>(() => {});
      }

      const { data } = await sb.auth.getSession();
      const existing = data.session;
      if (existing && existing.user.user_metadata?.line_user_id === subOf(idToken)) {
        return existing.user.id;
      }
      if (existing) await sb.auth.signOut(); // different LINE account on this device

      const { data: ex, error } = await sb.functions.invoke<{ token_hash?: string }>("line-auth", {
        body: { idToken },
      });
      if (error || !ex?.token_hash) throw new Error("login_failed");
      const { data: verified, error: vErr } = await sb.auth.verifyOtp({ token_hash: ex.token_hash, type: "magiclink" });
      if (vErr || !verified.user) throw new Error("login_failed");
      return verified.user.id;
    })();
    sessionPromise.catch(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}
