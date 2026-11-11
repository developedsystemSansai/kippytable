// Edge Function: exchange a LINE Login authorization code for a Supabase session.
//
// Flow: browser -> LINE Login (OAuth, redirect back to /auth/callback with ?code)
//       -> POST { code } here -> swap code for tokens at LINE (needs channel secret)
//       -> verify id_token -> find/create auth user -> generateLink(magiclink) (no email sent)
//       -> return { token_hash }; client calls supabase.auth.verifyOtp({ token_hash, type: "magiclink" }).
//
// Secrets (supabase secrets set ...):
//   LINE_LOGIN_CHANNEL_ID, LINE_LOGIN_CHANNEL_SECRET, LINE_REDIRECT_URI (e.g. https://kippytable.vercel.app/auth/callback)
//   optional ALLOWED_ORIGIN.
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
  const channelSecret = Deno.env.get("LINE_LOGIN_CHANNEL_SECRET");
  const redirectUri = Deno.env.get("LINE_REDIRECT_URI");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!channelId || !channelSecret || !redirectUri || !url || !serviceKey) return json({ error: "server_misconfigured" }, 500);

  let code = "";
  try {
    const body = await req.json();
    code = typeof body?.code === "string" ? body.code : "";
  } catch { /* fallthrough */ }
  if (!code || code.length > 1024) return json({ error: "invalid_request" }, 400);

  // 1) Swap the one-time code for tokens (redirect_uri comes from our secret, not from the client).
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });
  if (!tokenRes.ok) {
  console.error("line token error", tokenRes.status, await tokenRes.text());
  return json({ error: "code_exchange_failed" }, 401);
}
  const idToken = (await tokenRes.json() as { id_token?: string }).id_token;
  if (!idToken) return json({ error: "no_id_token" }, 401);

  // 2) Verify with LINE (checks signature, expiry and that `aud` equals our channel ID).
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

  // 3) Find or create the Supabase user.
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

  // 4) One-time token the client exchanges for a session. No email is sent by generateLink.
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) return json({ error: "link_failed" }, 500);

  return json({ token_hash: tokenHash });
});
