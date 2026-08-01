import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---- Allowed vocabulary (kept in sync with src/lib/workflows/nodeLibrary.ts) ----
const TRIGGER_SUBTYPES = [
  "new_lead", "lead_added_to_folder", "lead_tagged", "tag_added_any", "score_threshold",
  "email_opened", "email_not_opened", "link_clicked", "whatsapp_replied", "sms_replied",
  "campaign_completed", "form_submitted", "funnel_step_completed", "purchase_event",
  "appointment_booked", "roi_calculator_submitted", "trial_started", "trial_ending_soon",
  "subscription_cancelled",
];
const ACTION_SUBTYPES = [
  "send_email", "send_sms", "send_whatsapp", "add_tag", "remove_tag", "update_status",
  "update_lifecycle_stage", "update_pipeline_stage", "increase_score", "decrease_score",
  "assign_owner", "create_task", "move_to_folder", "add_note", "notify_team", "webhook",
  "stop_workflow",
];
const CONDITION_SUBTYPES = [
  "if_email_opened", "if_email_not_opened", "if_link_clicked", "if_link_not_clicked",
  "if_whatsapp_replied", "if_sms_replied", "if_has_tag", "if_not_has_tag", "if_source_equals",
  "if_status_equals", "if_score_gt", "if_score_lt", "if_purchase_exists",
  "if_appointment_booked", "if_property_matches", "if_no_activity",
];

const REQUIRED_CONFIG: Record<string, string[]> = {
  send_email: ["subject", "body"],
  send_sms: ["message"],
  send_whatsapp: ["message"],
  add_tag: ["tag"],
  remove_tag: ["tag"],
  update_status: ["status"],
  update_lifecycle_stage: ["stage"],
  update_pipeline_stage: ["stage"],
  increase_score: ["delta"],
  decrease_score: ["delta"],
  assign_owner: ["owner"],
  create_task: ["title"],
  move_to_folder: ["folder_id"],
  add_note: ["note"],
  notify_team: ["message"],
  webhook: ["url"],
  if_has_tag: ["tag"],
  if_not_has_tag: ["tag"],
  if_source_equals: ["source"],
  if_status_equals: ["status"],
  if_score_gt: ["value"],
  if_score_lt: ["value"],
  if_no_activity: ["days"],
};

const SYSTEM_PROMPT = `You are an automation architect for NexusFlo24, a sales & marketing automation platform.
Convert the user's plain-English description into a workflow graph.

RESPOND WITH ONLY VALID JSON — no markdown, no code fences, no commentary.

Schema:
{
  "name": "short workflow name (max 60 chars)",
  "description": "one sentence describing what it does",
  "enrollment": {
    "object_type": "lead" | "contact" | "deal" | "booking" | "conversation" | "payment" | "subscription",
    "method": "event" | "filter" | "schedule" | "webhook" | "manual",
    "source": "crm" | "forms" | "funnels" | "meta_lead_ads" | "bookings" | "email" | "whatsapp" | "sms" | "payments" | "campaigns" | "webhooks",
    "event": "one of the trigger subTypes below",
    "config": { },
    "filter_groups": [ { "combinator": "AND", "conditions": [ { "property": "lead_source", "operator": "equals", "value": "..." } ] } ]
  },
  "nodes": [
    { "id": "n1", "kind": "trigger", "subType": "form_submitted", "label": "Assessment form submitted", "config": {} },
    { "id": "n2", "kind": "action", "subType": "send_email", "label": "Send confirmation", "config": { "subject": "...", "body": "..." } },
    { "id": "n3", "kind": "delay", "subType": "wait_delay", "label": "Wait 1 day", "config": { "duration": 1, "unit": "days" } },
    { "id": "n4", "kind": "condition", "subType": "if_no_activity", "label": "Not contacted yet?", "config": { "days": 1 } },
    { "id": "n5", "kind": "goal", "subType": "goal", "label": "Lead contacted", "config": {} }
  ],
  "edges": [ { "source": "n1", "target": "n2" }, { "source": "n4", "target": "n5", "sourceHandle": "yes" } ]
}

RULES:
- Exactly ONE node with kind "trigger", and it must be the first node.
- kind must be one of: trigger, action, condition, delay, merge, goal.
- Use "delay" kind with subType "wait_delay" and config { duration: number, unit: "minutes"|"hours"|"days" } for any waiting step.
- Every condition node must have exactly two outgoing edges with sourceHandle "yes" and "no".
- Every non-trigger node must be reachable from the trigger via edges.
- Do NOT invent subTypes. Allowed trigger subTypes: ${TRIGGER_SUBTYPES.join(", ")}.
- Allowed action subTypes: ${ACTION_SUBTYPES.join(", ")}.
- Allowed condition subTypes: ${CONDITION_SUBTYPES.join(", ")}.
- Email bodies and messages must be real, useful copy. Use {{first_name|there}} for personalisation.
- If the user mentions assigning a team/person, use action "assign_owner" with config { "owner": "<their words>" }.
- If the user mentions notifying a manager or team, use action "notify_team" with config { "message": "..." }.
- Do not emit positions — the server lays the graph out.
- Keep it to at most 20 nodes.`;

interface RawNode {
  id?: string;
  kind?: string;
  subType?: string;
  label?: string;
  config?: Record<string, unknown>;
}
interface RawEdge {
  source?: string;
  target?: string;
  sourceHandle?: string;
}

const KINDS = new Set(["trigger", "action", "condition", "delay", "merge", "goal", "end"]);

function subTypeAllowed(kind: string, subType: string) {
  if (kind === "trigger") return TRIGGER_SUBTYPES.includes(subType);
  if (kind === "action") return ACTION_SUBTYPES.includes(subType);
  if (kind === "condition") return CONDITION_SUBTYPES.includes(subType);
  if (kind === "delay") return subType === "wait_delay";
  if (kind === "merge") return subType === "merge";
  if (kind === "goal") return subType === "goal";
  return false;
}

/** Normalise the model output into a safe WorkflowCanvasJSON with layout. */
function normalise(raw: any) {
  const rawNodes: RawNode[] = Array.isArray(raw?.nodes) ? raw.nodes : [];
  const rawEdges: RawEdge[] = Array.isArray(raw?.edges) ? raw.edges : [];

  const kept: Array<{ id: string; kind: string; subType: string; label: string; config: Record<string, unknown>; needsSetup: string[] }> = [];
  let triggerSeen = false;

  for (const n of rawNodes) {
    const id = typeof n?.id === "string" && n.id.trim() ? n.id.trim() : null;
    let kind = typeof n?.kind === "string" ? n.kind : "";
    let subType = typeof n?.subType === "string" ? n.subType : "";
    if (!id || !KINDS.has(kind)) continue;
    // wait_delay may arrive as an action — normalise to delay kind
    if (subType === "wait_delay") kind = "delay";
    if (!subTypeAllowed(kind, subType)) continue;
    if (kind === "trigger") {
      if (triggerSeen) continue;
      triggerSeen = true;
    }
    const config = (n.config && typeof n.config === "object" ? n.config : {}) as Record<string, unknown>;
    const required = REQUIRED_CONFIG[subType] || [];
    const needsSetup = required.filter((k) => {
      const v = config[k];
      return v === undefined || v === null || v === "";
    });
    if (kind === "delay") {
      if (typeof config.duration !== "number") config.duration = 1;
      if (typeof config.unit !== "string") config.unit = "days";
    }
    kept.push({
      id,
      kind,
      subType,
      label: typeof n.label === "string" && n.label.trim() ? n.label.trim() : subType.replace(/_/g, " "),
      config,
      needsSetup,
    });
  }

  if (!kept.length) return null;

  // Trigger must be first
  const trigIdx = kept.findIndex((n) => n.kind === "trigger");
  if (trigIdx > 0) {
    const [t] = kept.splice(trigIdx, 1);
    kept.unshift(t);
  }

  const ids = new Set(kept.map((n) => n.id));
  const edges = rawEdges
    .filter((e) => e?.source && e?.target && ids.has(e.source!) && ids.has(e.target!) && e.source !== e.target)
    .map((e, i) => ({
      id: `e${i + 1}`,
      source: e.source!,
      target: e.target!,
      ...(e.sourceHandle === "yes" || e.sourceHandle === "no" ? { sourceHandle: e.sourceHandle } : {}),
    }));

  // Reconnect orphans in declaration order so nothing is stranded
  const targets = new Set(edges.map((e) => e.target));
  for (let i = 1; i < kept.length; i++) {
    if (!targets.has(kept[i].id)) {
      const prev = kept[i - 1];
      const handle = prev.kind === "condition" ? "yes" : undefined;
      edges.push({
        id: `e${edges.length + 1}`,
        source: prev.id,
        target: kept[i].id,
        ...(handle ? { sourceHandle: handle } : {}),
      });
      targets.add(kept[i].id);
    }
  }

  // Layout: breadth-first vertical grid, YES branches left / NO branches right
  const X = 400;
  const Y_STEP = 140;
  const posById: Record<string, { x: number; y: number }> = {};
  const depth: Record<string, number> = {};
  const outgoing: Record<string, typeof edges> = {};
  edges.forEach((e) => {
    (outgoing[e.source] ||= [] as any).push(e);
  });

  const root = kept[0].id;
  depth[root] = 0;
  posById[root] = { x: X, y: 0 };
  const queue = [root];
  const seen = new Set([root]);
  while (queue.length) {
    const cur = queue.shift()!;
    const outs = outgoing[cur] || [];
    outs.forEach((e) => {
      if (seen.has(e.target)) return;
      seen.add(e.target);
      const d = (depth[cur] ?? 0) + 1;
      depth[e.target] = d;
      const offset = e.sourceHandle === "yes" ? -220 : e.sourceHandle === "no" ? 220 : 0;
      posById[e.target] = { x: (posById[cur]?.x ?? X) + offset, y: d * Y_STEP };
      queue.push(e.target);
    });
  }
  let fallbackDepth = kept.length;
  kept.forEach((n) => {
    if (!posById[n.id]) posById[n.id] = { x: X, y: ++fallbackDepth * Y_STEP };
  });

  const nodes = kept.map((n) => ({
    id: n.id,
    type: n.kind,
    position: posById[n.id],
    data: {
      kind: n.kind,
      subType: n.subType,
      label: n.label,
      config: n.config,
      ...(n.needsSetup.length ? { needsSetup: true, missingFields: n.needsSetup } : {}),
    },
  }));

  const enr = raw?.enrollment && typeof raw.enrollment === "object" ? raw.enrollment : {};
  const triggerNode = kept[0].kind === "trigger" ? kept[0] : null;

  return {
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 80) : "AI generated workflow",
    description: typeof raw?.description === "string" ? raw.description.trim().slice(0, 300) : "",
    canvas_json: { nodes, edges },
    enrollment: {
      object_type: typeof enr.object_type === "string" ? enr.object_type : "lead",
      method: typeof enr.method === "string" ? enr.method : "event",
      source: typeof enr.source === "string" ? enr.source : null,
      event: typeof enr.event === "string" ? enr.event : (triggerNode?.subType ?? null),
      config: enr.config && typeof enr.config === "object" ? enr.config : {},
      filter_groups: Array.isArray(enr.filter_groups) ? enr.filter_groups : [],
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const bearer = authHeader.slice("Bearer ".length).trim();

  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(bearer);
  const userId = claimsData?.claims?.sub as string | undefined;
  if (claimsErr || !userId) {
    return json({ error: "Unauthorized", details: claimsErr?.message ?? "Invalid or expired session" }, 401);
  }

  try {
    const { prompt, workspace_id } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
      return json({ error: "Describe the automation in a sentence or two." }, 400);
    }
    if (!workspace_id) return json({ error: "workspace_id is required" }, 400);

    const { data: isMember } = await supabase.rpc("is_workspace_member", {
      _user_id: userId,
      _workspace_id: workspace_id,
    });
    if (!isMember) return json({ error: "Forbidden" }, 403);

    // Plan gate: admins, or an active pro/enterprise subscription
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan,status")
        .eq("workspace_id", workspace_id)
        .in("status", ["active", "trialing"])
        .maybeSingle();
      const plan = sub?.plan ?? null;
      if (plan !== "pro" && plan !== "enterprise") {
        return json(
          { error: "The AI Workflow Generator is available on the Pro and Enterprise plans.", code: "plan_required" },
          403,
        );
      }
    }

    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured" }, 500);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Build a workflow for: ${prompt.trim()}\n\nRespond with ONLY the JSON object.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit exceeded, please try again shortly." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted. Please add credits to continue." }, 402);
      const t = await response.text();
      console.error("[generate-workflow] gateway error", response.status, t);
      return json({ error: "AI service unavailable" }, 500);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    if (!content) return json({ error: "AI did not return a workflow" }, 500);
    content = String(content).trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (_e) {
      console.error("[generate-workflow] parse failure", content.slice(0, 500));
      return json({ error: "AI returned an unreadable workflow. Try rephrasing your description." }, 500);
    }

    const result = normalise(parsed);
    if (!result) {
      return json({ error: "AI could not build a valid workflow from that description. Try adding more detail." }, 422);
    }

    return json({ workflow: result });
  } catch (e) {
    console.error("[generate-workflow] error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
