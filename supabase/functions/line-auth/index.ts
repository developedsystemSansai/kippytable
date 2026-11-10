// Edge Function: exchange a LINE ID token for a Supabase session.
//
// Flow: client (LIFF) -> POST { idToken } -> verify with LINE -> find/create auth user ->
//       generateLink(magiclink) (no email is sent) -> return { token_hash }
//       client then calls supabase.auth.verifyOtp({ token_hash, type: "magiclink" }) to get a real session.
//
// Secrets: LINE_LOGIN_CHANNEL_ID (set with `supabase secrets set`), optional ALLOWED_ORIGIN.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const channelId = Deno.env.get("LINE_LOGIN_CHANNEL_ID");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!channelId || !url || !serviceKey) return json({ error: "server_misconfigured" }, 500);

  let idToken = "";
  try {
    const body = await req.json();
    idToken = typeof body?.idToken === "string" ? body.idToken : "";
  } catch { /* fallthrough */ }
  if (!idToken || idToken.length > 4096) return json({ error: "invalid_request" }, 400);

  // 1) Verify with LINE (checks signature, expiry and that `aud` equals our channel ID).
  const verify = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!verify.ok) return json({ error: "invalid_token" }, 401);
  const claims = await verify.json() as { sub?: string; name?: string; picture?: string };
  if (!claims.sub) return json({ error: "invalid_token" }, 401);

  const lineUserId = claims.sub;
  const name = (claims.name ?? "").slice(0, 100);
  const picture = claims.picture ?? null;
  const email = `line_${lineUserId.toLowerCase()}@line.invalid`;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 2) Find or create the Supabase user.
  let { data: profile } = await admin.from("profiles").select("id").eq("line_user_id", lineUserId).maybeSingle();

  if (!profile) {
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId },
    });
    let userId = created.data.user?.id;
    if (!userId) {
      // Concurrent first login may have created it already: look the profile up again.
      const again = await admin.from("profiles").select("id").eq("line_user_id", lineUserId).maybeSingle();
      userId = again.data?.id;
    }
    if (!userId) return json({ error: "user_create_failed" }, 500);
    const up = await admin.from("profiles").upsert(
      { id: userId, line_user_id: lineUserId, name, picture },
      { onConflict: "id" },
    );
    if (up.error) return json({ error: "profile_failed" }, 500);
    profile = { id: userId };
  } else {
    await admin.from("profiles").update({ name, picture, updated_at: new Date().toISOString() }).eq("id", profile.id);
  }

  // 3) One-time token the client exchanges for a session. No email is sent by generateLink.
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) return json({ error: "link_failed" }, 500);

  return json({ token_hash: tokenHash });
});
