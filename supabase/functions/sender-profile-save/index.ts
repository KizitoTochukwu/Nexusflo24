import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DETAIL_TABLE: Record<string, string> = {
  whatsapp: "whatsapp_senders",
  sms: "sms_senders",
  email: "email_senders",
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

    const body = await req.json();
    const { id, workspace_id, channel, label, display_name, address, is_default, detail } = body || {};

    if (!workspace_id || !channel || !label) return json({ error: "missing fields" }, 400);
    if (!["whatsapp", "sms", "email"].includes(channel)) return json({ error: "invalid channel" }, 400);

    // Authorize: workspace member OR platform admin
    const { data: isMember } = await admin.rpc("is_workspace_member", { _user_id: userId, _workspace_id: workspace_id });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isMember && !isAdmin) return json({ error: "forbidden" }, 403);

    // Plan gating: Starter → only shared SMS, no dedicated WA/email senders
    if (!isAdmin) {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("plan")
        .eq("workspace_id", workspace_id)
        .maybeSingle();
      const plan = sub?.plan || "starter";
      if (plan === "starter") {
        if (channel === "sms" && detail?.sender_type && detail.sender_type !== "shared") {
          return json({ error: "Starter plan only allows shared SMS senders. Upgrade to provision your own." }, 403);
        }
        if (channel === "whatsapp" || channel === "email") {
          return json({ error: `Starter plan cannot provision branded ${channel} senders. Upgrade to Plus or higher.` }, 403);
        }
      }
    }

    const profilePayload: any = {
      workspace_id,
      channel,
      label,
      display_name: display_name || label,
      address: address || null,
      is_default: !!is_default,
      status: "pending",
    };

    let profileId = id;
    if (id) {
      const { error } = await admin.from("sender_profiles").update(profilePayload).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await admin.from("sender_profiles").insert(profilePayload).select("id").single();
      if (error) throw error;
      profileId = data.id;
    }

    // Enforce single default
    if (is_default) {
      await admin.from("sender_profiles")
        .update({ is_default: false })
        .eq("workspace_id", workspace_id)
        .eq("channel", channel)
        .neq("id", profileId);
    }

    if (detail && DETAIL_TABLE[channel]) {
      const { error } = await admin
        .from(DETAIL_TABLE[channel])
        .upsert({ ...detail, sender_profile_id: profileId }, { onConflict: "sender_profile_id" });
      if (error) throw error;
    }

    return json({ ok: true, id: profileId });
  } catch (e: any) {
    console.error("[sender-profile-save]", e);
    return json({ error: e.message || "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
