import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Verify SPF / DKIM / DMARC for an email sender via Google DNS-over-HTTPS.
 * Caller passes { sender_profile_id, dkim_selector? }.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { sender_profile_id, dkim_selector } = await req.json();
    if (!sender_profile_id) return json({ error: "missing sender_profile_id" }, 400);

    const { data: row, error } = await admin
      .from("email_senders")
      .select("*")
      .eq("sender_profile_id", sender_profile_id)
      .maybeSingle();
    if (error || !row) return json({ error: "sender not found" }, 404);

    const domain = row.domain;
    if (!domain) return json({ error: "no domain on sender" }, 400);

    const selector = dkim_selector || row.dkim_selector || "resend";
    const spf = await txtContains(domain, "v=spf1");
    const dmarc = await txtContains(`_dmarc.${domain}`, "v=DMARC1");
    const dkim = await txtContains(`${selector}._domainkey.${domain}`, "v=DKIM1") ||
      await txtContains(`${selector}._domainkey.${domain}`, "k=rsa");

    const allVerified = spf && dkim && dmarc;
    const verification_status = allVerified ? "verified" : (spf || dkim || dmarc ? "partial" : "failed");

    await admin.from("email_senders").update({
      spf_status: spf ? "verified" : "failed",
      dkim_status: dkim ? "verified" : "failed",
      dmarc_status: dmarc ? "verified" : "failed",
      verification_status,
    }).eq("sender_profile_id", sender_profile_id);

    return json({ ok: true, spf, dkim, dmarc, verification_status });
  } catch (e: any) {
    console.error("[email-domain-verify]", e);
    return json({ error: e.message || "internal_error" }, 500);
  }
});

async function txtContains(host: string, needle: string): Promise<boolean> {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=TXT`);
    if (!r.ok) return false;
    const j = await r.json();
    const answers: any[] = j.Answer || [];
    return answers.some((a) => typeof a.data === "string" && a.data.toLowerCase().includes(needle.toLowerCase()));
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
