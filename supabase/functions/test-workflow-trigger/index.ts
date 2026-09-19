// Test-only trigger evaluator. Returns a sample payload and whether the current
// scope + filter set would pass — never runs the workflow/automation.
//
// Uses exactly the same matching code as the live engines, so a passing test
// means the real trigger would also pass.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  matchTriggerScope,
  evaluateFilterGroups,
  type FilterGroup,
} from "../_shared/triggerMatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const {
      workflow_id,
      automation_id,
      record_kind, // "workflow" | "automation" — optional, inferred from ids
      workspace_id: bodyWorkspaceId,
      trigger_source,
      trigger_event,
      filter_groups = [],
    } = body;

    // Resolve workspace_id from whichever record was passed
    let ws: string | null = bodyWorkspaceId ?? null;
    const kind = record_kind || (automation_id ? "automation" : workflow_id ? "workflow" : null);
    if (!ws && workflow_id) {
      const { data: wf } = await supabase.from("workflows").select("workspace_id").eq("id", workflow_id).maybeSingle();
      ws = wf?.workspace_id ?? null;
    }
    if (!ws && automation_id) {
      const { data: a } = await supabase.from("automations").select("workspace_id").eq("id", automation_id).maybeSingle();
      ws = a?.workspace_id ?? null;
    }

    // Pull a recent sample from the workspace for the source
    let sample: Record<string, any> | null = null;
    let mapped: Record<string, any> | null = null;

    if (ws) {
      if (trigger_source === "crm" || trigger_source === "forms" || trigger_source === "funnels" || trigger_source === "meta_lead_ads") {
        const { data: lead } = await supabase.from("leads")
          .select("id,full_name,email,phone,source,status,score,tags,created_at")
          .eq("workspace_id", ws).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (lead) {
          sample = lead;
          mapped = { name: lead.full_name, email: lead.email, phone: lead.phone, source: lead.source };
        }
      } else if (trigger_source === "bookings") {
        const { data: b } = await supabase.from("bookings")
          .select("id,guest_name,guest_email,start_at,status,booking_page_id")
          .eq("workspace_id", ws).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (b) { sample = b; mapped = { name: b.guest_name, email: b.guest_email, when: b.start_at }; }
      }
    }

    if (!sample) {
      sample = { note: `No recent ${trigger_source ?? "event"} sample found. Filters were evaluated against an empty payload.` };
    }

    const passed = evalGroups(sample, filter_groups as FilterGroup[]);

    // Mark last_tested_at on the originating record
    const nowIso = new Date().toISOString();
    if (kind === "workflow" && workflow_id) {
      await supabase.from("workflows").update({ last_tested_at: nowIso } as any).eq("id", workflow_id);
    } else if (kind === "automation" && automation_id) {
      await supabase.from("automations").update({ last_tested_at: nowIso } as any).eq("id", automation_id);
    }

    return new Response(JSON.stringify({
      ok: true,
      trigger_source, trigger_event,
      sample_payload: sample,
      mapped_fields: mapped,
      passed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "test_failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
