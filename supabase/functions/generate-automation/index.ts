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

// ---- Allowed vocabulary (kept in sync with src/hooks/useAutomations.ts) ----
const TRIGGER_EVENTS = [
  "new_lead", "form_submitted", "lead_added_to_folder", "lead_tagged", "tag_added",
  "score_threshold", "email_opened", "link_clicked", "whatsapp_replied",
  "campaign_completed", "purchase_event", "book_appointment", "roi_calculator_submitted",
];

const ACTIONS = [
  "send_email", "send_whatsapp", "send_sms", "add_tag", "remove_tag", "update_status",
  "update_pipeline_stage", "adjust_score", "notify_sales", "assign_owner",
  "enroll_in_automation", "end_automation",
];

const CONDITIONS = [
  "email_known", "phone_known", "source_equals", "tag_contains", "email_opened",
  "link_clicked", "form_submitted", "checkout_visited", "pricing_visited",
  "whatsapp_replied", "score_gt", "appointment_booked", "purchase_happened",
];

const OPERATORS = [
  "equals", "not_equals", "contains", "not_contains", "greater_than", "less_than",
  "between", "happened", "not_happened", "is_known", "is_unknown",
];

const DEFAULT_OPERATOR: Record<string, string> = {
  email_known: "is_known",
  phone_known: "is_known",
  source_equals: "equals",
  tag_contains: "contains",
  email_opened: "happened",
  link_clicked: "happened",
  form_submitted: "happened",
  checkout_visited: "happened",
  pricing_visited: "happened",
  whatsapp_replied: "happened",
  score_gt: "greater_than",
  appointment_booked: "happened",
  purchase_happened: "happened",
};

/** Config keys that must be present for the step to run without manual setup. */
const REQUIRED_CONFIG: Record<string, string[]> = {
  send_email: ["subject", "message"],
  send_sms: ["message"],
  send_whatsapp: ["message"],
  add_tag: ["tag"],
  remove_tag: ["tag"],
  update_status: ["new_status"],
  update_pipeline_stage: ["stage"],
  adjust_score: ["score_delta"],
  notify_sales: ["message"],
  assign_owner: [],
  enroll_in_automation: ["target_automation_id"],
  end_automation: [],
};

const SYSTEM_PROMPT = `You are an automation architect for NexusFlo24, a sales & marketing automation platform.
Convert the user's plain-English description into a linear automation made of ordered steps.

RESPOND WITH ONLY VALID JSON — no markdown, no code fences, no commentary.

Schema:
{
  "name": "short automation name (max 60 chars)",
  "description": "one sentence describing what it does",
  "trigger": {
    "object_type": "lead" | "contact" | "deal" | "booking" | "conversation" | "payment" | "subscription",
    "method": "event" | "filter" | "schedule" | "webhook" | "manual",
    "source": "crm" | "forms" | "funnels" | "meta_lead_ads" | "bookings" | "email" | "whatsapp" | "sms" | "payments" | "campaigns" | "webhooks",
    "event": "one of the trigger events below",
    "config": { },
    "filter_groups": [ { "combinator": "AND", "conditions": [ { "property": "lead_source", "operator": "equals", "value": "..." } ] } ],
    "summary": "human sentence describing when this runs"
  },
  "steps": [
    { "type": "action", "action": "send_email", "config": { "subject": "...", "message": "..." } },
    { "type": "delay", "config": { "duration": 1, "unit": "days" } },
    { "type": "condition",
      "config": { "logic": "AND", "rows": [ { "condition": "email_opened", "operator": "not_happened", "time_window_days": 2 } ] },
      "yes": [ { "type": "action", "action": "add_tag", "config": { "tag": "engaged" } } ],
      "no":  [ { "type": "action", "action": "send_whatsapp", "config": { "message": "..." } } ]
    }
  ]
}

RULES:
- Steps are ordered and executed top to bottom. Do NOT include the trigger as a step.
- "type" must be one of: action, delay, condition.
- Allowed trigger events: ${TRIGGER_EVENTS.join(", ")}.
- Allowed actions: ${ACTIONS.join(", ")}.
- Allowed condition values: ${CONDITIONS.join(", ")}.
- Allowed condition operators: ${OPERATORS.join(", ")}.
- Delay config must be { "duration": number, "unit": "minutes"|"hours"|"days" }.
- Action config keys: send_email -> { subject, message }; send_sms / send_whatsapp / notify_sales -> { message };
  add_tag / remove_tag -> { tag }; update_status -> { new_status }; update_pipeline_stage -> { stage };
  adjust_score -> { score_delta: number }; assign_owner -> { assign_mode: "round_robin" }; end_automation -> { reason }.
- Email bodies and messages must be real, useful copy. Use {{first_name}} for personalisation.
- Conditions may include "yes" and "no" branches, each an array of steps (actions/delays only, no nested conditions).
- Keep it to at most 18 steps in total.`;

type RawStep = {
  type?: string;
  action?: string;
  config?: Record<string, unknown>;
  yes?: RawStep[];
  no?: RawStep[];
};

interface OutStep {
  step_type: string;
  config: Record<string, unknown>;
  needsSetup?: string[];
}

function normaliseLeaf(s: RawStep): OutStep | null {
  const type = typeof s?.type === "string" ? s.type : "";
  const config = (s?.config && typeof s.config === "object" ? { ...s.config } : {}) as Record<string, unknown>;

  if (type === "delay") {
    if (typeof config.duration !== "number") config.duration = Number(config.duration) || 1;
    if (typeof config.unit !== "string") config.unit = "days";
    return { step_type: "delay", config };
  }

  if (type === "action") {
    const action = typeof s.action === "string" ? s.action : String(config.action ?? "");
    if (!ACTIONS.includes(action)) return null;
    config.action = action;
    if (action === "adjust_score" && config.score_delta !== undefined) {
      config.score_delta = Number(config.score_delta) || 0;
    }
    if (action === "assign_owner" && !config.assign_mode) config.assign_mode = "round_robin";
    if (action === "send_email" && !config.message && config.body) config.message = config.body;
    const required = REQUIRED_CONFIG[action] ?? [];
    const missing = required.filter((k) => {
      const v = config[k];
      return v === undefined || v === null || v === "";
    });
    return { step_type: "action", config, ...(missing.length ? { needsSetup: missing } : {}) };
  }

  return null;
}

function normaliseCondition(s: RawStep): OutStep | null {
  const cfg = (s?.config && typeof s.config === "object" ? s.config : {}) as Record<string, unknown>;
  const rawRows = Array.isArray(cfg.rows) ? (cfg.rows as Record<string, unknown>[]) : [];
  const rows = rawRows
    .filter((r) => typeof r?.condition === "string" && CONDITIONS.includes(r.condition as string))
    .map((r) => {
      const condition = r.condition as string;
      const operator = typeof r.operator === "string" && OPERATORS.includes(r.operator)
        ? r.operator
        : DEFAULT_OPERATOR[condition];
      const out: Record<string, unknown> = { condition, operator };
      if (r.value !== undefined && r.value !== null && r.value !== "") out.value = String(r.value);
      if (r.value_to !== undefined && r.value_to !== null && r.value_to !== "") out.value_to = String(r.value_to);
      const tw = Number(r.time_window_days);
      if (Number.isFinite(tw) && tw > 0) out.time_window_days = tw;
      return out;
    });
  if (!rows.length) return null;
  const logic = cfg.logic === "OR" ? "OR" : "AND";
  return { step_type: "condition", config: { logic, rows } };
}

/** Flatten model steps into automation_steps rows (with branch markers). */
function normalise(raw: any) {
  const rawSteps: RawStep[] = Array.isArray(raw?.steps) ? raw.steps : [];
  const out: OutStep[] = [];

  for (const s of rawSteps) {
    if (out.length >= 40) break;
    if (s?.type === "condition") {
      const cond = normaliseCondition(s);
      if (!cond) continue;
      out.push(cond);
      const yes = (Array.isArray(s.yes) ? s.yes : []).map(normaliseLeaf).filter(Boolean) as OutStep[];
      const no = (Array.isArray(s.no) ? s.no : []).map(normaliseLeaf).filter(Boolean) as OutStep[];
      out.push({ step_type: "branch_yes_start", config: {} });
      if (yes.length) out.push(...yes);
      else out.push({ step_type: "action", config: { action: "end_automation", reason: "Condition met — stopping" } });
      out.push({ step_type: "branch_yes_end", config: {} });
      out.push({ step_type: "branch_no_start", config: {} });
      if (no.length) out.push(...no);
      else out.push({ step_type: "action", config: { action: "end_automation", reason: "Condition not met — stopping" } });
      out.push({ step_type: "branch_no_end", config: {} });
      continue;
    }
    const leaf = normaliseLeaf(s);
    if (leaf) out.push(leaf);
  }

  if (!out.length) return null;

  const t = raw?.trigger && typeof raw.trigger === "object" ? raw.trigger : {};
  const event = typeof t.event === "string" && TRIGGER_EVENTS.includes(t.event) ? t.event : "new_lead";

  return {
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 80) : "AI generated automation",
    description: typeof raw?.description === "string" ? raw.description.trim().slice(0, 300) : "",
    trigger: {
      enrollment_object_type: typeof t.object_type === "string" ? t.object_type : "lead",
      enrollment_method: typeof t.method === "string" ? t.method : "event",
      trigger_source: typeof t.source === "string" ? t.source : null,
      trigger_event: event,
      trigger_config: t.config && typeof t.config === "object" ? t.config : {},
      filter_groups: Array.isArray(t.filter_groups) ? t.filter_groups : [],
      reenrollment_config: { mode: "never" },
      trigger_summary: typeof t.summary === "string" ? t.summary.slice(0, 200) : null,
    },
    steps: out,
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
          { error: "The AI Automation Generator is available on the Pro and Enterprise plans.", code: "plan_required" },
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
          { role: "user", content: `Build an automation for: ${prompt.trim()}\n\nRespond with ONLY the JSON object.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit exceeded, please try again shortly." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted. Please add credits to continue." }, 402);
      const t = await response.text();
      console.error("[generate-automation] gateway error", response.status, t);
      return json({ error: "AI service unavailable" }, 500);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    if (!content) return json({ error: "AI did not return an automation" }, 500);
    content = String(content).trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (_e) {
      console.error("[generate-automation] parse failure", content.slice(0, 500));
      return json({ error: "AI returned an unreadable automation. Try rephrasing your description." }, 500);
    }

    const result = normalise(parsed);
    if (!result) {
      return json({ error: "AI could not build a valid automation from that description. Try adding more detail." }, 422);
    }

    return json({ automation: result });
  } catch (e) {
    console.error("[generate-automation] error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
