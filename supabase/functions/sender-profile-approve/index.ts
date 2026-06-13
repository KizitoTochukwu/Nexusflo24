import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) return json({ error: "unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const { id, status, reason } = await req.json();
    if (!id || !["approved", "rejected", "suspended", "pending"].includes(status)) {
      return json({ error: "invalid payload" }, 400);
    }

    const { data: profile, error: pErr } = await admin
      .from("sender_profiles")
      .select("workspace_id, label, channel")
      .eq("id", id)
      .maybeSingle();
    if (pErr || !profile) return json({ error: "profile not found" }, 404);

    const { error: uErr } = await admin
      .from("sender_profiles")
      .update({
        status,
        rejection_reason: reason || null,
        approved_by: userId,
        approved_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (uErr) throw uErr;

    // Notify workspace owner
    const { data: ws } = await admin.from("workspaces").select("owner_user_id").eq("id", profile.workspace_id).maybeSingle();
    if (ws?.owner_user_id) {
      await admin.from("notifications").insert({
        workspace_id: profile.workspace_id,
        user_id: ws.owner_user_id,
        title: `Sender ${status}`,
        body: `Your ${profile.channel} sender "${profile.label}" was ${status}${reason ? `: ${reason}` : ""}.`,
        type: "sender_status",
        meta: { sender_profile_id: id, status },
      });
    }

    return json({ ok: true });
  } catch (e: any) {
    console.error("[sender-profile-approve]", e);
    return json({ error: e.message || "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
