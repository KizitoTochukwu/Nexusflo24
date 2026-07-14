// Test-only trigger evaluator. Returns a sample payload and whether the current
// filter set would pass — never runs the workflow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FilterCondition { property: string; operator: string; value?: string }
interface FilterGroup { combinator: "AND" | "OR"; conditions: FilterCondition[] }

function evalCondition(rec: Record<string, any>, c: FilterCondition): boolean {
  const v = rec?.[c.property];
  switch (c.operator) {
    case "eq": return String(v ?? "") === String(c.value ?? "");
    case "neq": return String(v ?? "") !== String(c.value ?? "");
    case "in": return (c.value || "").split(",").map((s) => s.trim()).includes(String(v ?? ""));
    case "nin": return !(c.value || "").split(",").map((s) => s.trim()).includes(String(v ?? ""));
    case "contains": return String(v ?? "").toLowerCase().includes(String(c.value ?? "").toLowerCase());
    case "ncontains": return !String(v ?? "").toLowerCase().includes(String(c.value ?? "").toLowerCase());
    case "known": return v !== undefined && v !== null && v !== "";
    case "unknown": return v === undefined || v === null || v === "";
    case "gt": return Number(v) > Number(c.value);
    case "lt": return Number(v) < Number(c.value);
    case "before": return new Date(v).getTime() < new Date(c.value || "").getTime();
    case "after": return new Date(v).getTime() > new Date(c.value || "").getTime();
    default: return true;
  }
}

function evalGroups(rec: Record<string, any>, groups: FilterGroup[]): boolean {
  if (!groups?.length) return true;
  // Groups are OR'd together; conditions within a group use combinator.
  return groups.some((g) => {
    if (!g.conditions?.length) return true;
    return g.combinator === "OR"
      ? g.conditions.some((c) => evalCondition(rec, c))
      : g.conditions.every((c) => evalCondition(rec, c));
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { workflow_id, trigger_source, trigger_event, filter_groups = [] } = body;

    // Pull a recent sample from the workspace for the source
    let sample: Record<string, any> | null = null;
    let mapped: Record<string, any> | null = null;

    if (workflow_id) {
      const { data: wf } = await supabase.from("workflows").select("workspace_id").eq("id", workflow_id).maybeSingle();
      const ws = wf?.workspace_id;
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
    }

    if (!sample) {
      sample = { note: `No recent ${trigger_source ?? "event"} sample found. Filters were evaluated against an empty payload.` };
    }

    const passed = evalGroups(sample, filter_groups as FilterGroup[]);

    // Mark last_tested_at
    if (workflow_id) {
      await supabase.from("workflows").update({ last_tested_at: new Date().toISOString() } as any).eq("id", workflow_id);
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
