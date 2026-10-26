// Cloudflare Pages Function: stores early-access emails in a KV namespace bound as SIGNUPS.
// Setup (one time): Pages project → Settings → Bindings → KV namespace → variable name SIGNUPS.
export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
  if (!ok) return Response.redirect(new URL("/?err=1", request.url), 303);
  if (env.SIGNUPS) {
    const existing = await env.SIGNUPS.get(email);
    if (!existing) {
      await env.SIGNUPS.put(email, JSON.stringify({
        at: new Date().toISOString(),
        ua: request.headers.get("user-agent") || "",
        ref: request.headers.get("referer") || ""
      }));
    }
  }
  return Response.redirect(new URL("/thanks", request.url), 303);
}
