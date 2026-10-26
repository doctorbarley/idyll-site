// Cloudflare Pages Function: writes waitlist sign-ups to Supabase via the join_waitlist RPC.
// Env vars (Pages → Settings → Environment variables): SUPABASE_URL, SUPABASE_ANON_KEY.
const GENDERS = new Set(["woman", "man", "nonbinary"]);
const BOROUGHS = new Set(["manhattan", "brooklyn", "queens", "bronx", "staten"]);

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const emailOk = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
  const age18 = form.get("age18") === "yes";
  const smsConsent = form.get("sms_consent") === "yes";
  let phone = null;
  if (smsConsent) {
    const digits = String(form.get("phone") || "").replace(/\D/g, "");
    if (digits.length === 10) phone = "+1" + digits;
    else if (digits.length === 11 && digits.startsWith("1")) phone = "+" + digits;
  }
  if (!age18 || (!emailOk && !phone)) return Response.redirect(new URL("/?err=1", request.url), 303);

  const g = String(form.get("gender") || "");
  const b = String(form.get("borough") || "");

  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    try {
      await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/join_waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.SUPABASE_ANON_KEY,
          // Legacy anon keys are JWTs and need a bearer header; publishable keys (sb_publishable_...) do not.
          ...(env.SUPABASE_ANON_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` } : {})
        },
        body: JSON.stringify({
          p_email: emailOk ? email : null,
          p_gender: GENDERS.has(g) ? g : null,
          p_borough: BOROUGHS.has(b) ? b : null,
          p_phone: phone,
          p_sms_consent: !!phone,
          p_source: "joinidyll.com"
        })
      });
    } catch (_) {
      // Fall through to the thanks page; the user shouldn't see a backend hiccup.
    }
  }
  return Response.redirect(new URL("/thanks", request.url), 303);
}
