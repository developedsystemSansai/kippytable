"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_KIPPY_SUPABASE_URL;
   const key = process.env.NEXT_PUBLIC_KIPPY_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase env is not set");
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

const STATE_KEY = "kippy_line_state";

/** Send the browser to LINE Login (OAuth 2.0 authorization code flow). */
export function startLineLogin() {
  const clientId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_LINE_CHANNEL_ID is not set");
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  const qs = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${location.origin}/auth/callback`,
    state,
    scope: "profile openid",
  });
  location.href = `https://access.line.me/oauth2/v2.1/authorize?${qs.toString().replace(/\+/g, "%20")}`;
}

/** Called on /auth/callback: swap the LINE `code` for a Supabase session via the line-auth Edge Function. */
export async function finishLineLogin(code: string, state: string | null): Promise<void> {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!expected || state !== expected) throw new Error("invalid_state");

  const sb = supabase();
  const { data: ex, error } = await sb.functions.invoke<{ token_hash?: string }>("line-auth", { body: { code } });
  if (error || !ex?.token_hash) throw new Error("login_failed");
  const { data, error: vErr } = await sb.auth.verifyOtp({ token_hash: ex.token_hash, type: "magiclink" });
  if (vErr || !data.user) throw new Error("login_failed");
}

let sessionPromise: Promise<string> | null = null;

/** Returns the Supabase user id, or throws "not_logged_in" so the UI can show the login screen. */
export function ensureSession(): Promise<string> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase().auth.getSession();
      if (!data.session) throw new Error("not_logged_in");
      return data.session.user.id;
    })();
    sessionPromise.catch(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}
