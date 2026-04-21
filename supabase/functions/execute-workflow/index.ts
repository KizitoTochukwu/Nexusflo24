// Workflow execution engine — runs one or more steps for a single enrollment.
// Re-enters itself when the next step is also "instant" (action/condition); for delays
// it schedules a row in scheduled_jobs and exits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deductCredit } from "../_shared/credit-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HARD_STEP_CAP = 500;
const THROTTLE_MS = 350;

function interpolate(template: string, lead: Record<string, any>): string {
  if (!template) return "";
  // Supports {{field}} and {{field|fallback}}
  return template.replace(/\{\{\s*([a-z_]+)\s*(?:\|\s*([^}]*))?\}\}/gi, (_m, key, fb) => {
    const k = String(key).toLowerCase();
    let v: any = "";
    if (k === "first_name") v = (lead.full_name?.split(" ")[0]) || "";
    else if (k === "owner_name") v = lead.owner_name || "";
    else v = lead[k] ?? "";
    if (v === null || v === undefined || String(v).trim() === "") return (fb ?? "").trim();
    return String(v);
  });
}

async function evaluateCondition(
  supabase: any,
  workspaceId: string,
  leadId: string,
  subType: string,
  config: Record<string, any>,
): Promise<boolean> {
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return false;

  switch (subType) {
    case "if_email_opened": {
      const { count } = await supabase.from("email_logs").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("lead_id", leadId).eq("status", "opened");
      return (count ?? 0) > 0;
    }
    case "if_email_not_opened": {
      const { count } = await supabase.from("email_logs").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("lead_id", leadId).eq("status", "opened");
      return (count ?? 0) === 0;
    }
    case "if_link_clicked": {
      const { count } = await supabase.from("lead_activities").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("lead_id", leadId).eq("type", "link_click");
      return (count ?? 0) > 0;
    }
    case "if_link_not_clicked": {
      const { count } = await supabase.from("lead_activities").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("lead_id", leadId).eq("type", "link_click");
      return (count ?? 0) === 0;
    }
    case "if_has_tag":
      return Array.isArray(lead.tags) && lead.tags.includes(String(config.tag || ""));
    case "if_not_has_tag":
      return !(Array.isArray(lead.tags) && lead.tags.includes(String(config.tag || "")));
    case "if_source_equals":
      return String(lead.source || "").toLowerCase() === String(config.value || "").toLowerCase();
    case "if_status_equals":
      return String(lead.status || "").toLowerCase() === String(config.value || "").toLowerCase();
    case "if_score_gt":
      return (lead.score ?? 0) > Number(config.value || 0);
    case "if_score_lt":
      return (lead.score ?? 0) < Number(config.value || 0);
    case "if_purchase_exists": {
      const { count } = await supabase.from("lead_activities").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("lead_id", leadId).eq("type", "purchase");
      return (count ?? 0) > 0;
    }
    case "if_appointment_booked": {
      const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("lead_id", leadId);
      return (count ?? 0) > 0;
    }
    case "if_no_activity": {
      const days = Number(config.days || 7);
      if (!lead.last_activity_at) return true;
      const ms = Date.now() - new Date(lead.last_activity_at).getTime();
      return ms > days * 24 * 60 * 60 * 1000;
    }
    case "if_property_matches": {
      const field = String(config.field || "");
      const op = String(config.operator || "equals");
      const val = config.value;
      const lv = lead[field];
      if (op === "equals") return String(lv ?? "") === String(val ?? "");
      if (op === "not_equals") return String(lv ?? "") !== String(val ?? "");
      if (op === "contains") return String(lv ?? "").toLowerCase().includes(String(val ?? "").toLowerCase());
      if (op === "exists") return lv !== null && lv !== undefined && lv !== "";
      if (op === "not_exists") return lv === null || lv === undefined || lv === "";
      return false;
    }
    default:
      return true; // unknown — default YES
  }
}

function nextNodeFromCanvas(canvas: any, currentId: string, branch?: "yes" | "no"): string | null {
  const edges = (canvas.edges || []) as any[];
  if (branch) {
    const e = edges.find((e) => e.source === currentId && e.sourceHandle === branch);
    return e?.target ?? null;
  }
  const e = edges.find((e) => e.source === currentId && (!e.sourceHandle || e.sourceHandle === "out" || e.sourceHandle === "main"));
  return e?.target ?? null;
}

function getNode(canvas: any, id: string): any | null {
  return (canvas.nodes || []).find((n: any) => n.id === id) ?? null;
}

function delayMinutesFromConfig(cfg: Record<string, any>): number {
  const dur = Number(cfg.duration ?? 0);
  const unit = String(cfg.unit ?? "minutes").toLowerCase();
  if (!dur) return 0;
  if (unit.startsWith("min")) return dur;
  if (unit.startsWith("hour") || unit === "h") return dur * 60;
  if (unit.startsWith("day") || unit === "d") return dur * 1440;
  if (unit.startsWith("week") || unit === "w") return dur * 10080;
  return dur;
}

async function runAction(
  supabase: any,
  workflow: any,
  enrollment: any,
  node: any,
  lead: any,
): Promise<{ status: "success" | "failed" | "skipped"; details: any; error?: string }> {
  const cfg = node.data?.config || {};
  const sub = node.data?.subType;
  const isTest = enrollment.is_test;

  try {
    switch (sub) {
      case "send_email": {
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        if (!lead.email) return { status: "skipped", details: { reason: "no_email" } };
        const credit = await deductCredit(workflow.workspace_id, "email", `wf:${enrollment.id}`, workflow.user_id);
        if (!credit.allowed) return { status: "failed", details: {}, error: credit.error || "out_of_credits" };
        const subject = interpolate(String(cfg.subject || ""), lead);
        const body = interpolate(String(cfg.body || ""), lead);
        // Reuse the email-send function
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ workspace_id: workflow.workspace_id, to: lead.email, subject, html: body, lead_id: lead.id }),
        }).catch(() => {});
        return { status: "success", details: { subject } };
      }
      case "send_sms": {
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        if (!lead.phone) return { status: "skipped", details: { reason: "no_phone" } };
        const credit = await deductCredit(workflow.workspace_id, "sms", `wf:${enrollment.id}`, workflow.user_id);
        if (!credit.allowed) return { status: "failed", details: {}, error: credit.error || "out_of_credits" };
        const message = interpolate(String(cfg.message || ""), lead);
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ workspace_id: workflow.workspace_id, to: lead.phone, message, lead_id: lead.id }),
        }).catch(() => {});
        return { status: "success", details: { message } };
      }
      case "send_whatsapp": {
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        if (!lead.phone) return { status: "skipped", details: { reason: "no_phone" } };
        const credit = await deductCredit(workflow.workspace_id, "whatsapp", `wf:${enrollment.id}`, workflow.user_id);
        if (!credit.allowed) return { status: "failed", details: {}, error: credit.error || "out_of_credits" };
        const message = interpolate(String(cfg.message || ""), lead);
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ workspace_id: workflow.workspace_id, to: lead.phone, message, lead_id: lead.id }),
        }).catch(() => {});
        return { status: "success", details: { message } };
      }
      case "add_tag": {
        const tag = String(cfg.tag || "").trim();
        if (!tag) return { status: "skipped", details: { reason: "no_tag" } };
        const tags = Array.from(new Set([...(lead.tags || []), tag]));
        if (!isTest) await supabase.from("leads").update({ tags }).eq("id", lead.id);
        return { status: "success", details: { tag } };
      }
      case "remove_tag": {
        const tag = String(cfg.tag || "").trim();
        const tags = (lead.tags || []).filter((t: string) => t !== tag);
        if (!isTest) await supabase.from("leads").update({ tags }).eq("id", lead.id);
        return { status: "success", details: { tag } };
      }
      case "update_status":
        if (!isTest) await supabase.from("leads").update({ status: String(cfg.status || cfg.value || "New") }).eq("id", lead.id);
        return { status: "success", details: { status: cfg.status || cfg.value } };
      case "update_pipeline_stage":
        if (!isTest) await supabase.from("leads").update({ pipeline_stage: String(cfg.stage || cfg.value || "new_lead") }).eq("id", lead.id);
        return { status: "success", details: { stage: cfg.stage || cfg.value } };
      case "update_lifecycle_stage":
        if (!isTest) await supabase.from("leads").update({ status: String(cfg.stage || "Warm") }).eq("id", lead.id);
        return { status: "success", details: { stage: cfg.stage } };
      case "increase_score":
      case "decrease_score": {
        const delta = sub === "increase_score" ? Math.abs(Number(cfg.delta || cfg.value || 0)) : -Math.abs(Number(cfg.delta || cfg.value || 0));
        const prev = Number(lead.score || 0);
        const next = Math.max(0, prev + delta);
        if (!isTest) {
          await supabase.from("leads").update({ score: next }).eq("id", lead.id);
          await supabase.from("lead_score_history").insert({
            workspace_id: workflow.workspace_id, lead_id: lead.id, delta, previous_score: prev, new_score: next,
            source: "workflow", ref_type: "workflow", ref_id: workflow.id, reason: `Workflow: ${workflow.name}`,
          });
        }
        return { status: "success", details: { delta, previous: prev, new: next } };
      }
      case "assign_owner": {
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        if (cfg.mode === "round_robin") {
          const { data: ownerId } = await supabase.rpc("assign_next_round_robin", { _workspace_id: workflow.workspace_id });
          if (ownerId) await supabase.from("leads").update({ assigned_owner_id: ownerId }).eq("id", lead.id);
          return { status: "success", details: { owner_id: ownerId } };
        }
        if (cfg.user_id) await supabase.from("leads").update({ assigned_owner_id: cfg.user_id }).eq("id", lead.id);
        return { status: "success", details: { owner_id: cfg.user_id } };
      }
      case "create_task": {
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        await supabase.from("lead_tasks").insert({
          workspace_id: workflow.workspace_id, user_id: workflow.user_id, lead_id: lead.id,
          title: interpolate(String(cfg.title || "Follow up"), lead),
          description: interpolate(String(cfg.description || ""), lead),
        });
        return { status: "success", details: {} };
      }
      case "move_to_folder": {
        if (isTest || !cfg.folder_id) return { status: "skipped", details: { reason: !cfg.folder_id ? "no_folder" : "test_mode" } };
        await supabase.from("lead_folder_leads").insert({
          workspace_id: workflow.workspace_id, folder_id: cfg.folder_id, lead_id: lead.id,
        }).catch(() => {});
        return { status: "success", details: { folder_id: cfg.folder_id } };
      }
      case "add_note": {
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        const note = interpolate(String(cfg.note || ""), lead);
        const newNotes = lead.notes ? `${lead.notes}\n\n[Workflow] ${note}` : `[Workflow] ${note}`;
        await supabase.from("leads").update({ notes: newNotes }).eq("id", lead.id);
        return { status: "success", details: { note } };
      }
      case "notify_team": {
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        await supabase.from("notifications").insert({
          workspace_id: workflow.workspace_id, user_id: lead.assigned_owner_id || workflow.user_id,
          title: interpolate(String(cfg.title || "Workflow alert"), lead),
          body: interpolate(String(cfg.message || ""), lead),
          type: "workflow",
          meta: { workflow_id: workflow.id, lead_id: lead.id },
        });
        return { status: "success", details: {} };
      }
      case "webhook": {
        if (isTest || !cfg.url) return { status: "skipped", details: { reason: !cfg.url ? "no_url" : "test_mode" } };
        await fetch(String(cfg.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead, workflow_id: workflow.id, workflow_name: workflow.name }),
        }).catch(() => {});
        return { status: "success", details: { url: cfg.url } };
      }
      case "stop_workflow":
        return { status: "success", details: { stopped: true } };
      default:
        return { status: "skipped", details: { reason: "unknown_action", subType: sub } };
    }
  } catch (e: any) {
    return { status: "failed", details: {}, error: e?.message || "action_failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { enrollment_id, start_from_node } = body as { enrollment_id: string; start_from_node?: string };
    if (!enrollment_id) {
      return new Response(JSON.stringify({ error: "enrollment_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: enrollment, error: enrollErr } = await supabase
      .from("workflow_enrollments").select("*").eq("id", enrollment_id).maybeSingle();
    if (enrollErr || !enrollment) throw new Error("Enrollment not found");

    if (enrollment.status !== "active") {
      return new Response(JSON.stringify({ ok: true, skipped: enrollment.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: workflow } = await supabase.from("workflows").select("*").eq("id", enrollment.workflow_id).maybeSingle();
    if (!workflow) throw new Error("Workflow not found");
    if (workflow.status === "paused" || workflow.status === "archived") {
      return new Response(JSON.stringify({ ok: true, skipped: workflow.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const canvas = workflow.canvas_json || { nodes: [], edges: [] };
    let currentId: string | null = start_from_node || enrollment.current_node_id;
    if (!currentId) {
      // Start at the trigger
      const trig = (canvas.nodes || []).find((n: any) => n.data?.kind === "trigger");
      currentId = trig?.id || null;
      if (currentId) {
        // Move to next node after trigger immediately
        currentId = nextNodeFromCanvas(canvas, currentId);
      }
    }

    const stepsRun: any[] = [];
    let stepsExecuted = enrollment.steps_executed || 0;

    while (currentId && stepsExecuted < HARD_STEP_CAP) {
      stepsExecuted++;
      const node = getNode(canvas, currentId);
      if (!node) break;

      // Refresh lead each iteration so updates from earlier steps are visible
      const { data: lead } = await supabase.from("leads").select("*").eq("id", enrollment.lead_id).maybeSingle();
      if (!lead) {
        await supabase.from("workflow_enrollments").update({
          status: "exited", exit_reason: "lead_deleted", completed_at: new Date().toISOString(),
        }).eq("id", enrollment.id);
        break;
      }

      const nodeKind = node.data?.kind;

      // ---- DELAY: schedule and exit ----
      if (nodeKind === "delay") {
        const minutes = delayMinutesFromConfig(node.data?.config || {});
        const nextId = nextNodeFromCanvas(canvas, currentId);
        const runAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
        if (!enrollment.is_test && nextId) {
          await supabase.from("scheduled_jobs").insert({
            workspace_id: workflow.workspace_id,
            automation_id: workflow.id, // re-using column; payload has workflow_id
            lead_id: enrollment.lead_id,
            run_at: runAt,
            step_index: 0,
            status: "pending",
            payload: { workflow_id: workflow.id, enrollment_id: enrollment.id, start_from_node: nextId },
          });
        }
        await supabase.from("workflow_enrollments").update({
          current_node_id: nextId, steps_executed: stepsExecuted, last_step_at: new Date().toISOString(),
        }).eq("id", enrollment.id);
        await supabase.from("workflow_runs").insert({
          enrollment_id: enrollment.id, workflow_id: workflow.id, workspace_id: workflow.workspace_id,
          lead_id: enrollment.lead_id, node_id: currentId, node_type: "delay",
          status: "success", details: { wait_minutes: minutes, next: nextId }, is_test: enrollment.is_test,
        });
        stepsRun.push({ node: currentId, type: "delay", minutes });
        return new Response(JSON.stringify({ ok: true, paused_for_delay: true, run_at: runAt, steps: stepsRun }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ---- CONDITION ----
      if (nodeKind === "condition") {
        const result = await evaluateCondition(supabase, workflow.workspace_id, enrollment.lead_id, node.data?.subType || "", node.data?.config || {});
        const branch = result ? "yes" : "no";
        const nextId = nextNodeFromCanvas(canvas, currentId, branch);
        await supabase.from("workflow_runs").insert({
          enrollment_id: enrollment.id, workflow_id: workflow.id, workspace_id: workflow.workspace_id,
          lead_id: enrollment.lead_id, node_id: currentId, node_type: "condition",
          branch_taken: branch, status: "success", details: { result }, is_test: enrollment.is_test,
        });
        stepsRun.push({ node: currentId, type: "condition", branch });
        currentId = nextId;
        continue;
      }

      // ---- GOAL ----
      if (nodeKind === "goal") {
        await supabase.from("workflow_enrollments").update({
          status: "completed", exit_reason: "goal_reached", completed_at: new Date().toISOString(),
          steps_executed: stepsExecuted, current_node_id: currentId, last_step_at: new Date().toISOString(),
        }).eq("id", enrollment.id);
        await supabase.from("workflow_runs").insert({
          enrollment_id: enrollment.id, workflow_id: workflow.id, workspace_id: workflow.workspace_id,
          lead_id: enrollment.lead_id, node_id: currentId, node_type: "goal",
          status: "success", details: { goal: true }, is_test: enrollment.is_test,
        });
        stepsRun.push({ node: currentId, type: "goal" });
        break;
      }

      // ---- MERGE / END / TRIGGER (passthrough) ----
      if (nodeKind === "merge" || nodeKind === "end" || nodeKind === "trigger") {
        currentId = nextNodeFromCanvas(canvas, currentId);
        continue;
      }

      // ---- ACTION ----
      const result = await runAction(supabase, workflow, enrollment, node, lead);
      await supabase.from("workflow_runs").insert({
        enrollment_id: enrollment.id, workflow_id: workflow.id, workspace_id: workflow.workspace_id,
        lead_id: enrollment.lead_id, node_id: currentId, node_type: "action",
        status: result.status, details: result.details, error: result.error || null, is_test: enrollment.is_test,
      });
      stepsRun.push({ node: currentId, type: "action", status: result.status });

      // Stop workflow action exits
      if (node.data?.subType === "stop_workflow") {
        await supabase.from("workflow_enrollments").update({
          status: "exited", exit_reason: "stop_workflow_action", completed_at: new Date().toISOString(),
          steps_executed: stepsExecuted, current_node_id: currentId,
        }).eq("id", enrollment.id);
        break;
      }

      currentId = nextNodeFromCanvas(canvas, currentId);
      // Throttle messaging actions
      if (["send_email", "send_sms", "send_whatsapp"].includes(node.data?.subType || "")) {
        await new Promise((r) => setTimeout(r, THROTTLE_MS));
      }
    }

    if (!currentId) {
      // Reached end of canvas — mark complete (if not already)
      await supabase.from("workflow_enrollments").update({
        status: "completed", exit_reason: "flow_end", completed_at: new Date().toISOString(),
        steps_executed: stepsExecuted, last_step_at: new Date().toISOString(),
      }).eq("id", enrollment.id).eq("status", "active");
    }

    return new Response(JSON.stringify({ ok: true, steps: stepsRun, executed: stepsExecuted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("execute-workflow error:", e);
    return new Response(JSON.stringify({ error: e?.message || "execution_failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
