// Cloudflare Pages Function: POST /api/reset
// Sets a new password from a reset-email link. Uses the same env vars as the waitlist:
// SUPABASE_URL and SUPABASE_ANON_KEY (the publishable key). No secret key is involved.
//
// Body: { token_hash, password }  first attempt (the one-time token from the email link)
//    or { access_token, password } retry after a rejected password (the token is already spent)

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export async function onRequestPost({ request, env }) {
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const password = typeof input.password === "string" ? input.password : "";
  const tokenHash = typeof input.token_hash === "string" ? input.token_hash : "";
  let accessToken = typeof input.access_token === "string" ? input.access_token : "";

  if (!password || password.length > 200 || (!tokenHash && !accessToken)) {
    return json({ error: "bad_request" }, 400);
  }
  if (tokenHash.length > 500 || accessToken.length > 4000) {
    return json({ error: "bad_request" }, 400);
  }

  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  if (!base || !key) return json({ error: "server" }, 500);

  // Step 1: trade the one-time token from the email for a short-lived session.
  if (!accessToken) {
    const verify = await fetch(`${base}/auth/v1/verify`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ type: "recovery", token_hash: tokenHash }),
    });
    const session = await verify.json().catch(() => ({}));
    if (!verify.ok || !session.access_token) {
      return json({ error: "link_invalid" }, 400);
    }
    accessToken = session.access_token;
  }

  // Step 2: set the new password as that user.
  const update = await fetch(`${base}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: key,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (update.ok) return json({ ok: true });

  const problem = await update.json().catch(() => ({}));
  if (update.status === 401 || update.status === 403) {
    return json({ error: "link_invalid" }, 400);
  }
  // Password was rejected (too weak, same as the old one). The email token is spent,
  // so hand the session back to the page so the person can try another password.
  return json(
    {
      error: "password_rejected",
      message: String(problem.msg || problem.message || problem.error_description || "").slice(0, 300),
      access_token: accessToken,
    },
    422
  );
}
