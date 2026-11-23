import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ADMIN_EMAIL = "kizzyadichie@gmail.com";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user_id } = await req.json().catch(() => ({}));
    if (typeof user_id !== "string" || !/^[0-9a-f-]{36}$/i.test(user_id)) return json({ error: "user_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Never trust the caller: confirm a real, freshly created account.
    const { data: u } = await admin.auth.admin.getUserById(user_id);
    const user = u?.user;
    if (!user) return json({ skipped: "unknown user" });
    if (Date.now() - new Date(user.created_at).getTime() > 15 * 60_000) return json({ skipped: "not a new signup" });

    const { data: adminProfile } = await admin.from("profiles").select("id").ilike("email", ADMIN_EMAIL).maybeSingle();
    const { data: ws } = adminProfile
      ? await admin.from("workspaces").select("id").eq("owner_user_id", adminProfile.id).order("created_at").limit(1).maybeSingle()
      : { data: null };

    // Dedupe: one alert per new user.
    if (adminProfile) {
      const { data: existing } = await admin.from("notifications").select("id")
        .eq("user_id", adminProfile.id).eq("type", "new_signup").contains("meta", { signup_user_id: user_id }).maybeSingle();
      if (existing) return json({ skipped: "already notified" });
    }

    const name = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "—";
    const email = user.email ?? "—";
    const when = new Date(user.created_at).toUTCString();

    if (adminProfile && ws) {
      await admin.from("notifications").insert({
        workspace_id: ws.id, user_id: adminProfile.id, type: "new_signup",
        title: "New user signed up", body: `${name} (${email})`,
        meta: { signup_user_id: user_id, link: "/platform-admin/users" },
      });
    }

    const key = Deno.env.get("RESEND_API_KEY");
    if (key) {
      const from = Deno.env.get("EMAIL_FROM") || "NexusFlo24 <noreply@nexusflo24.com>";
      const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0B1F3B">
        <h2 style="margin:0 0 12px">New NexusFlo24 signup</h2>
        <p><b>Name:</b> ${esc(name)}<br><b>Email:</b> ${esc(email)}<br><b>Signed up:</b> ${esc(when)}</p>
        <p><a href="https://nexusflo24.com/platform-admin/users" style="background:#0B1F3B;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View in Platform Admin</a></p></div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [ADMIN_EMAIL], subject: `New signup: ${email}`, html }),
      });
      if (!r.ok) console.error("[notify-new-signup] email failed", r.status, await r.text());
    } else console.warn("[notify-new-signup] RESEND_API_KEY missing");

    return json({ ok: true });
  } catch (e) {
    console.error("[notify-new-signup]", e);
    return json({ error: String(e) }, 500);
  }
});
