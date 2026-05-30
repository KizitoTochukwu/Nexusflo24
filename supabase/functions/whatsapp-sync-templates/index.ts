// Pulls the workspace's approved WhatsApp message templates from Meta Graph API
// and upserts them into `whatsapp_templates`. Callable by:
//   - service-role (cron / embedded-signup post-connect dispatch), no body verification needed beyond workspaceId
//   - authenticated workspace member (manual "Sync from Meta" button)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptWhatsApp } from "../_shared/whatsapp-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH = "https://graph.facebook.com/v21.0";

interface MetaComponent {
  type: string;
  text?: string;
  format?: string;
  example?: unknown;
  buttons?: unknown[];
}
interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: MetaComponent[];
}

function extractBody(components: MetaComponent[]): { body: string; variables: number } {
  const body = components.find((c) => c.type?.toUpperCase() === "BODY");
  const text = body?.text || "";
  const matches = text.match(/\{\{\s*\d+\s*\}\}/g);
  return { body: text, variables: matches ? matches.length : 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const whatsappKey = Deno.env.get("WHATSAPP_SETTINGS_ENCRYPTION_KEY");
    if (!whatsappKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const isService = token === serviceRoleKey;

    const { workspaceId } = (await req.json()) as { workspaceId?: string };
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "workspaceId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (!isService) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: claims, error } = await userClient.auth.getClaims(token);
      if (error || !claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isMember } = await admin.rpc("is_workspace_member", {
        _user_id: claims.claims.sub,
        _workspace_id: workspaceId,
      });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: settings } = await admin
      .from("whatsapp_settings")
      .select("waba_id, access_token_encrypted, is_active")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!settings || !settings.is_active || !settings.waba_id || !settings.access_token_encrypted) {
      return new Response(
        JSON.stringify({
          error: "WhatsApp not connected for this workspace. Connect via Settings → Channels first.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = await decryptWhatsApp(settings.access_token_encrypted, whatsappKey);

    // Paginate through templates.
    const all: MetaTemplate[] = [];
    let next: string | null =
      `${GRAPH}/${encodeURIComponent(settings.waba_id)}/message_templates?limit=100&fields=id,name,language,category,status,components`;

    while (next) {
      const res = await fetch(next, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || `Graph ${res.status}`;
        throw new Error(`Template fetch failed: ${msg}`);
      }
      for (const t of data?.data || []) all.push(t as MetaTemplate);
      next = data?.paging?.next || null;
    }

    const seenKeys = new Set<string>();
    let upserts = 0;
    for (const t of all) {
      const { body, variables } = extractBody(t.components || []);
      const row = {
        workspace_id: workspaceId,
        name: t.name,
        language: t.language,
        category: (t.category || "MARKETING").toUpperCase(),
        body_preview: body.slice(0, 1024),
        variable_count: variables,
        status: (t.status || "approved").toLowerCase(),
        components: t.components,
        meta_template_id: t.id,
        last_synced_at: new Date().toISOString(),
      };
      // Upsert by (workspace_id, name, language) — the existing unique key.
      const { error } = await admin
        .from("whatsapp_templates")
        .upsert(row, { onConflict: "workspace_id,name,language" });
      if (error) {
        console.warn(`Template upsert failed for ${t.name} (${t.language}):`, error.message);
      } else {
        upserts++;
        seenKeys.add(`${t.name}::${t.language}`);
      }
    }

    // Mark previously-synced templates that no longer exist in Meta as deleted.
    const { data: localTpls } = await admin
      .from("whatsapp_templates")
      .select("id, name, language, status, meta_template_id")
      .eq("workspace_id", workspaceId)
      .not("meta_template_id", "is", null);
    let markedDeleted = 0;
    for (const tpl of localTpls || []) {
      const key = `${tpl.name}::${tpl.language}`;
      if (!seenKeys.has(key) && tpl.status !== "deleted") {
        await admin
          .from("whatsapp_templates")
          .update({ status: "deleted", last_synced_at: new Date().toISOString() })
          .eq("id", tpl.id);
        markedDeleted++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced: upserts, total: all.length, removed: markedDeleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("whatsapp-sync-templates error:", err);
    const message = err instanceof Error ? err.message : "Sync failed";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
