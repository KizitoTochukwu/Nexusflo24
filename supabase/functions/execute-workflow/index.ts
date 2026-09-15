// Workflow execution engine — runs one or more steps for a single enrollment.
// Re-enters itself when the next step is also "instant" (action/condition); for delays
// it schedules a row in scheduled_jobs and exits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deductCredit } from "../_shared/credit-guard.ts";
import { buildLeadVars, interpolateText } from "../_shared/interpolate-vars.ts";
import { requireInternalOrWorkspaceMember } from "../_shared/caller-auth.ts";
import { syncTagToContact } from "../_shared/crmTagSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const HARD_STEP_CAP = 500;
const THROTTLE_MS = 350;

function interpolate(template: string, lead: Record<string, any>): string {
  if (!template) return "";
  const vars = buildLeadVars(lead as any, {
    assignedRepName: lead.owner_name || undefined,
  });
  return interpolateText(template, vars);
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
      const { count } = await supabase.from("lead_activities").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("lead_id", leadId).eq("type", "email_open");
      return (count ?? 0) > 0;
    }
    case "if_email_not_opened": {
      const { count } = await supabase.from("lead_activities").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("lead_id", leadId).eq("type", "email_open");
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
    case "if_whatsapp_replied": {
      const { count } = await supabase.from("whatsapp_messages").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("direction", "inbound")
        .or(`lead_id.eq.${leadId}${lead.phone ? `,phone_number.eq.${lead.phone}` : ""}`);
      return (count ?? 0) > 0;
    }
    case "if_sms_replied": {
      const { count } = await supabase.from("sms_logs").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("direction", "inbound")
        .or(`${lead.phone ? `from_number.eq.${lead.phone},` : ""}contact_id.eq.${(lead as any).contact_id ?? "00000000-0000-0000-0000-000000000000"}`);
      return (count ?? 0) > 0;
    }
    case "if_email_replied": {
      if (!lead.email) return false;
      const { count } = await supabase.from("email_logs").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("direction", "inbound")
        .or(`lead_id.eq.${leadId},from_email.ilike.${lead.email}`);
      return (count ?? 0) > 0;
    }
    // Combined exit check for enquiry chase sequences: true when the person has
    // replied on ANY channel, booked a call, or been tagged as opted out.
    case "if_responded_or_booked": {
      const optedOut = Array.isArray(lead.tags) && lead.tags.some((t: string) =>
        ["opted out", "opted-out", "unsubscribed", "do not contact"].includes(String(t).toLowerCase()));
      if (optedOut) return true;
      const nullUuid = "00000000-0000-0000-0000-000000000000";
      const contactId = (lead as any).contact_id ?? nullUuid;
      const [wa, sms, em, bk] = await Promise.all([
        supabase.from("whatsapp_messages").select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("direction", "inbound")
          .or(`lead_id.eq.${leadId},contact_id.eq.${contactId}${lead.phone ? `,phone_number.eq.${lead.phone}` : ""}`),
        supabase.from("sms_logs").select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("direction", "inbound")
          .or(`contact_id.eq.${contactId}${lead.phone ? `,from_number.eq.${lead.phone}` : ""}`),
        lead.email
          ? supabase.from("email_logs").select("id", { count: "exact", head: true })
              .eq("workspace_id", workspaceId).eq("direction", "inbound")
              .or(`lead_id.eq.${leadId},from_email.ilike.${lead.email}`)
          : Promise.resolve({ count: 0 }),
        supabase.from("bookings").select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("lead_id", leadId),
      ]);
      return ((wa.count ?? 0) + (sms.count ?? 0) + (em.count ?? 0) + (bk.count ?? 0)) > 0;
    }
    default:
      return true;
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

/**
 * Awaits an HTTP send and returns ok/error so the engine can record real status.
 */
async function postJson(url: string, body: any): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(body),
    });
    let data: any = {};
    try { data = await res.json(); } catch { /* non-json */ }
    if (!res.ok) {
      return { ok: false, status: res.status, data, error: data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data };
  } catch (e: any) {
    return { ok: false, status: 0, data: null, error: e?.message || "fetch_failed" };
  }
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
        const r = await postJson(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
          workspaceId: workflow.workspace_id, to: lead.email, subject, html: body, leadId: lead.id, skipCredits: true,
        });
        if (!r.ok) return { status: "failed", details: { subject, provider: r.data }, error: r.error };
        return { status: "success", details: { subject, provider_status: r.status } };
      }
      case "send_sms": {
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        if (!lead.phone) return { status: "skipped", details: { reason: "no_phone" } };
        const credit = await deductCredit(workflow.workspace_id, "sms", `wf:${enrollment.id}`, workflow.user_id);
        if (!credit.allowed) return { status: "failed", details: {}, error: credit.error || "out_of_credits" };
        const message = interpolate(String(cfg.message || ""), lead);
        const r = await postJson(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-send`, {
          workspaceId: workflow.workspace_id, to: lead.phone, message, leadId: lead.id, skipCredits: true,
        });
        if (!r.ok) return { status: "failed", details: { provider: r.data }, error: r.error };
        return { status: "success", details: { message } };
      }
      case "send_whatsapp": {
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        if (!lead.phone) return { status: "skipped", details: { reason: "no_phone" } };
        const credit = await deductCredit(workflow.workspace_id, "whatsapp", `wf:${enrollment.id}`, workflow.user_id);
        if (!credit.allowed) return { status: "failed", details: {}, error: credit.error || "out_of_credits" };
        const message = interpolate(String(cfg.message || ""), lead);
        const r = await postJson(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
          workspaceId: workflow.workspace_id, to: lead.phone, body: message, leadId: lead.id, skipCredits: true,
        });
        // Caller-side auto-fallback (matches HubSpot / GHL workflow-step behavior):
        // when whatsapp-send returns fallback:true (window closed, template
        // unavailable, opted out, tier exceeded) AND the node has a
        // fallback_channel configured, fire it inline in the same step.
        const waFailed = !r.ok || r.data?.success === false;
        const wantsFallback = waFailed && r.data?.fallback === true;
        const fbChannel = String(cfg.fallback_channel || "").toLowerCase();
        if (wantsFallback && (fbChannel === "sms" || fbChannel === "email")) {
          const fbMessage = interpolate(String(cfg.fallback_message || cfg.message || ""), lead);
          if (fbChannel === "sms" && lead.phone) {
            const fb = await postJson(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-send`, {
              workspaceId: workflow.workspace_id, to: lead.phone, message: fbMessage, leadId: lead.id, skipCredits: true,
            });
            return fb.ok
              ? { status: "success", details: { message: fbMessage, primary_channel: "whatsapp", fallback_channel: "sms", fallback_reason: r.data?.reason } }
              : { status: "failed", details: { primary_channel: "whatsapp", fallback_channel: "sms", fallback_reason: r.data?.reason }, error: fb.error };
          }
          if (fbChannel === "email" && lead.email) {
            const fb = await postJson(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
              workspaceId: workflow.workspace_id, to: lead.email,
              subject: String(cfg.fallback_subject || cfg.subject || "Follow-up"),
              html: fbMessage, leadId: lead.id, skipCredits: true,
            });
            return fb.ok
              ? { status: "success", details: { message: fbMessage, primary_channel: "whatsapp", fallback_channel: "email", fallback_reason: r.data?.reason } }
              : { status: "failed", details: { primary_channel: "whatsapp", fallback_channel: "email", fallback_reason: r.data?.reason }, error: fb.error };
          }
        }
        if (!r.ok) return { status: "failed", details: { provider: r.data }, error: r.error };
        if (r.data?.success === false) return { status: "failed", details: { reason: r.data?.reason }, error: r.data?.error };
        return { status: "success", details: { message } };
      }
      case "add_tag": {
        const tag = String(cfg.tag || "").trim();
        if (!tag) return { status: "skipped", details: { reason: "no_tag" } };
        const tags = Array.from(new Set([...(lead.tags || []), tag]));
        if (!isTest) {
          await supabase.from("leads").update({ tags }).eq("id", lead.id);
          await syncTagToContact(supabase, {
            workspaceId: workflow.workspace_id,
            leadId: lead.id,
            contactId: (lead as any).contact_id ?? null,
            tag,
            mode: "add",
          });
        }
        return { status: "success", details: { tag } };
      }
      case "remove_tag": {
        const tag = String(cfg.tag || "").trim();
        const tags = (lead.tags || []).filter((t: string) => t !== tag);
        if (!isTest) {
          await supabase.from("leads").update({ tags }).eq("id", lead.id);
          await syncTagToContact(supabase, {
            workspaceId: workflow.workspace_id,
            leadId: lead.id,
            contactId: (lead as any).contact_id ?? null,
            tag,
            mode: "remove",
          });
        }
        return { status: "success", details: { tag } };
      }
      case "update_deal_stage": {
        // Move the lead's open deal in a named pipeline to a named stage.
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        const pipelineName = String(cfg.pipeline || "").trim();
        const stageName = String(cfg.stage || "").trim();
        if (!pipelineName || !stageName) return { status: "skipped", details: { reason: "missing_config" } };
        const contactId = (lead as any).contact_id ?? null;
        const { data: pipeline } = await supabase
          .from("crm_pipelines").select("id")
          .eq("workspace_id", workflow.workspace_id).ilike("name", pipelineName).maybeSingle();
        if (!pipeline) return { status: "skipped", details: { reason: "pipeline_not_found", pipeline: pipelineName } };
        let dealQ = supabase.from("crm_deals").select("id")
          .eq("workspace_id", workflow.workspace_id).eq("pipeline_id", pipeline.id).eq("status", "open")
          .order("created_at", { ascending: false }).limit(1);
        dealQ = contactId ? dealQ.or(`contact_id.eq.${contactId},lead_id.eq.${lead.id}`) : dealQ.eq("lead_id", lead.id);
        const { data: deal } = await dealQ.maybeSingle();
        if (!deal) return { status: "skipped", details: { reason: "no_open_deal", pipeline: pipelineName } };
        const { data: stage } = await supabase
          .from("crm_pipeline_stages").select("id, probability")
          .eq("pipeline_id", pipeline.id).ilike("name", stageName).maybeSingle();
        if (!stage) return { status: "failed", details: { pipeline: pipelineName }, error: `stage_not_found:${stageName}` };
        await supabase.from("crm_deals")
          .update({ stage_id: stage.id, ...(stage.probability != null ? { probability: stage.probability } : {}), updated_at: new Date().toISOString() })
          .eq("id", deal.id);
        return { status: "success", details: { deal_id: deal.id, stage: stageName } };
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
        let assignedUserId: string | null = null;
        if (cfg.mode === "round_robin") {
          const { data: ownerId } = await supabase.rpc("assign_next_round_robin", { _workspace_id: workflow.workspace_id });
          assignedUserId = (ownerId as string | null) || null;
        } else if (cfg.user_id) {
          assignedUserId = String(cfg.user_id);
        }
        if (!assignedUserId) return { status: "skipped", details: { reason: "no_eligible_user" } };

        const previousOwnerId = (lead as any).assigned_owner_id || null;
        await supabase.from("leads").update({ assigned_owner_id: assignedUserId }).eq("id", lead.id);
        await supabase.from("lead_activities").insert({
          lead_id: lead.id, workspace_id: workflow.workspace_id, user_id: workflow.user_id,
          type: "owner_assigned",
          meta: { assigned_to: assignedUserId, mode: cfg.mode || "specific", workflow_id: workflow.id, previous_owner_id: previousOwnerId },
        }).catch(() => {});

        // Notify new owner (mirrors execute-automation v2)
        const notifyNewOwner = cfg.notify_new_owner !== false;
        const isNoop = previousOwnerId && previousOwnerId === assignedUserId;
        if (notifyNewOwner && !isNoop) {
          const channels: string[] = Array.isArray(cfg.channels) && cfg.channels.length ? cfg.channels : ["inapp", "email"];
          const alsoNotify: string[] = Array.isArray(cfg.also_notify) ? cfg.also_notify : [];
          const recipientIds = new Set<string>([assignedUserId]);
          if (alsoNotify.includes("creator") && workflow.user_id) recipientIds.add(workflow.user_id);
          if (alsoNotify.includes("previous_owner") && previousOwnerId) recipientIds.add(previousOwnerId);
          if (alsoNotify.includes("all_admins")) {
            const { data: members } = await supabase
              .from("workspace_members").select("user_id, role").eq("workspace_id", workflow.workspace_id);
            for (const m of members || []) {
              if (["owner", "admin"].includes(m.role)) recipientIds.add(m.user_id);
            }
          }
          const ids = Array.from(recipientIds);
          const { data: profiles } = await supabase
            .from("profiles").select("id, email, phone").in("id", ids);
          const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));
          const title = interpolate(String(cfg.notify_title || "New lead assigned to you"), lead);
          const body = interpolate(
            String(cfg.notify_message || "{{lead.full_name}} ({{lead.email}}) was just assigned to you."),
            lead,
          );
          for (const uid of ids) {
            const prof = profileMap.get(uid);
            if (channels.includes("inapp")) {
              await supabase.from("notifications").insert({
                workspace_id: workflow.workspace_id, user_id: uid, title, body,
                type: "lead_assigned",
                meta: { lead_id: lead.id, workflow_id: workflow.id, assigned_to: assignedUserId },
              });
            }
            if (channels.includes("email") && prof?.email) {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({
                  workspaceId: workflow.workspace_id, to: prof.email, subject: title,
                  html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
                  leadId: lead.id, skipCredits: true, isInternal: true,
                }),
              }).catch(() => {});
            }
            if (channels.includes("sms") && prof?.phone) {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-send`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({
                  workspaceId: workflow.workspace_id, to: prof.phone, message: `${title}\n${body}`,
                  skipCredits: true, isInternal: true,
                }),
              }).catch(() => {});
            }
            if (channels.includes("whatsapp") && prof?.phone) {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({
                  workspaceId: workflow.workspace_id, to: prof.phone, body: `*${title}*\n${body}`,
                  skipCredits: true, isInternal: true,
                }),
              }).catch(() => {});
            }
          }
        }
        return { status: "success", details: { owner_id: assignedUserId, previous_owner_id: previousOwnerId, notified: notifyNewOwner && !isNoop } };
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
      case "notify_team":
      case "notify_sales": {
        if (isTest) return { status: "skipped", details: { reason: "test_mode" } };
        const title = interpolate(String(cfg.title || "Workflow alert"), lead);
        const body = interpolate(String(cfg.message || ""), lead);
        const recipientKinds: string[] = Array.isArray(cfg.recipients) && cfg.recipients.length
          ? cfg.recipients
          : ["lead_owner", "creator"];
        const channels: string[] = Array.isArray(cfg.channels) && cfg.channels.length
          ? cfg.channels
          : ["inapp", "email"];
        const ids = new Set<string>();
        if (recipientKinds.includes("lead_owner") && (lead.assigned_owner_id || lead.user_id)) {
          ids.add(lead.assigned_owner_id || lead.user_id);
        }
        if (recipientKinds.includes("creator") && workflow.user_id) ids.add(workflow.user_id);
        if (recipientKinds.includes("specific") && Array.isArray(cfg.recipient_user_ids)) {
          for (const uid of cfg.recipient_user_ids) if (uid) ids.add(String(uid));
        }
        if (recipientKinds.includes("all_admins") || recipientKinds.includes("all_members")) {
          const { data: members } = await supabase
            .from("workspace_members").select("user_id, role").eq("workspace_id", workflow.workspace_id);
          for (const m of (members || [])) {
            if (recipientKinds.includes("all_members")) ids.add(m.user_id);
            else if (["owner", "admin"].includes(m.role)) ids.add(m.user_id);
          }
        }
        if (ids.size === 0) return { status: "skipped", details: { reason: "no_recipients" } };
        const idList = Array.from(ids);
        const { data: profiles } = await supabase.from("profiles").select("id, email, phone").in("id", idList);
        const pmap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));
        const stats: Record<string, number> = { inapp: 0, email: 0, sms: 0, whatsapp: 0 };
        for (const uid of idList) {
          const p = pmap.get(uid);
          if (channels.includes("inapp")) {
            await supabase.from("notifications").insert({
              workspace_id: workflow.workspace_id, user_id: uid, title, body,
              type: "workflow", meta: { workflow_id: workflow.id, lead_id: lead.id },
            });
            stats.inapp++;
          }
          if (channels.includes("email") && p?.email) {
            await postJson(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
              workspaceId: workflow.workspace_id, to: p.email, subject: title,
              html: `<p>${body.replace(/\n/g, "<br>")}</p>`, skipCredits: true, isInternal: true,
            }); stats.email++;
          }
          if (channels.includes("sms") && p?.phone) {
            await postJson(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-send`, {
              workspaceId: workflow.workspace_id, to: p.phone, message: `${title}\n${body}`,
              skipCredits: true, isInternal: true,
            }); stats.sms++;
          }
          if (channels.includes("whatsapp") && p?.phone) {
            await postJson(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
              workspaceId: workflow.workspace_id, to: p.phone, body: `*${title}*\n${body}`,
              skipCredits: true, isInternal: true,
            }); stats.whatsapp++;
          }
        }
        return { status: "success", details: { recipients: idList.length, ...stats } };
      }
      case "webhook": {
        if (isTest || !cfg.url) return { status: "skipped", details: { reason: !cfg.url ? "no_url" : "test_mode" } };
        const r = await postJson(String(cfg.url), { lead, workflow_id: workflow.id, workflow_name: workflow.name });
        if (!r.ok) return { status: "failed", details: { url: cfg.url }, error: r.error };
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

    // Authorize caller: internal (service-role) or workspace member
    const authz = await requireInternalOrWorkspaceMember(req, supabase, (enrollment as any).workspace_id);
    if (authz) {
      const body = await authz.text();
      return new Response(body, {
        status: authz.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      const trig = (canvas.nodes || []).find((n: any) => n.data?.kind === "trigger");
      currentId = trig?.id || null;
      if (currentId) currentId = nextNodeFromCanvas(canvas, currentId);
    }

    const stepsRun: any[] = [];
    let stepsExecuted = enrollment.steps_executed || 0;

    const fail = async (nodeId: string, nodeKind: string, message: string, details: any) => {
      await supabase.from("workflow_runs").insert({
        enrollment_id: enrollment.id, workflow_id: workflow.id, workspace_id: workflow.workspace_id,
        lead_id: enrollment.lead_id, node_id: nodeId, node_type: nodeKind,
        status: "failed", error: message, details, is_test: enrollment.is_test,
      });
      await supabase.from("workflow_logs").insert({
        workflow_id: workflow.id, workspace_id: workflow.workspace_id,
        enrollment_id: enrollment.id, lead_id: enrollment.lead_id,
        event_type: "step_failed", level: "error",
        message: `Node ${nodeId} (${nodeKind}) failed: ${message}`,
        details,
      });
      await supabase.from("workflow_enrollments").update({
        status: "failed", exit_reason: message.slice(0, 200), completed_at: new Date().toISOString(),
        steps_executed: stepsExecuted, current_node_id: nodeId, last_step_at: new Date().toISOString(),
      }).eq("id", enrollment.id);
    };

    while (currentId && stepsExecuted < HARD_STEP_CAP) {
      stepsExecuted++;
      const node = getNode(canvas, currentId);
      if (!node) {
        await fail(currentId, "unknown", `Node ${currentId} not found in canvas (broken edge)`, { currentId });
        break;
      }

      const { data: lead } = await supabase.from("leads").select("*").eq("id", enrollment.lead_id).maybeSingle();
      if (!lead) {
        await supabase.from("workflow_enrollments").update({
          status: "exited", exit_reason: "lead_deleted", completed_at: new Date().toISOString(),
        }).eq("id", enrollment.id);
        break;
      }

      const nodeKind = node.data?.kind;

      try {
        // ---- DELAY: schedule and exit ----
        if (nodeKind === "delay") {
          const minutes = delayMinutesFromConfig(node.data?.config || {});
          const nextId = nextNodeFromCanvas(canvas, currentId);
          const runAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

          if (!nextId) {
            // Delay with no follow-up → treat as flow end
            await supabase.from("workflow_runs").insert({
              enrollment_id: enrollment.id, workflow_id: workflow.id, workspace_id: workflow.workspace_id,
              lead_id: enrollment.lead_id, node_id: currentId, node_type: "delay",
              status: "success", details: { wait_minutes: minutes, next: null, note: "no_next_node" }, is_test: enrollment.is_test,
            });
            await supabase.from("workflow_enrollments").update({
              status: "completed", exit_reason: "flow_end_after_delay", completed_at: new Date().toISOString(),
              steps_executed: stepsExecuted, current_node_id: currentId, last_step_at: new Date().toISOString(),
            }).eq("id", enrollment.id);
            break;
          }

          if (!enrollment.is_test) {
            const { error: schedErr } = await supabase.from("scheduled_jobs").insert({
              workspace_id: workflow.workspace_id,
              automation_id: null, // workflow jobs identify themselves via payload
              lead_id: enrollment.lead_id,
              run_at: runAt,
              step_index: 0,
              status: "pending",
              payload: { workflow_id: workflow.id, enrollment_id: enrollment.id, start_from_node: nextId },
            });
            if (schedErr) {
              await fail(currentId, "delay", `Failed to schedule next step: ${schedErr.message}`, { schedErr, runAt, nextId });
              break;
            }
          }

          await supabase.from("workflow_enrollments").update({
            current_node_id: nextId, steps_executed: stepsExecuted, last_step_at: new Date().toISOString(),
          }).eq("id", enrollment.id);
          await supabase.from("workflow_runs").insert({
            enrollment_id: enrollment.id, workflow_id: workflow.id, workspace_id: workflow.workspace_id,
            lead_id: enrollment.lead_id, node_id: currentId, node_type: "delay",
            status: "success", details: { wait_minutes: minutes, next: nextId, run_at: runAt }, is_test: enrollment.is_test,
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
            branch_taken: branch, status: "success", details: { result, next: nextId }, is_test: enrollment.is_test,
          });
          stepsRun.push({ node: currentId, type: "condition", branch });
          if (!nextId) {
            await supabase.from("workflow_enrollments").update({
              status: "completed", exit_reason: `condition_${branch}_unwired`, completed_at: new Date().toISOString(),
              steps_executed: stepsExecuted, current_node_id: currentId, last_step_at: new Date().toISOString(),
            }).eq("id", enrollment.id);
            break;
          }
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

        if (result.status === "failed") {
          await supabase.from("workflow_logs").insert({
            workflow_id: workflow.id, workspace_id: workflow.workspace_id,
            enrollment_id: enrollment.id, lead_id: enrollment.lead_id,
            event_type: "step_failed", level: "error",
            message: `Action ${node.data?.subType} failed: ${result.error}`,
            details: result.details,
          });
        }

        if (node.data?.subType === "stop_workflow") {
          await supabase.from("workflow_enrollments").update({
            status: "exited", exit_reason: "stop_workflow_action", completed_at: new Date().toISOString(),
            steps_executed: stepsExecuted, current_node_id: currentId,
          }).eq("id", enrollment.id);
          break;
        }

        currentId = nextNodeFromCanvas(canvas, currentId);
        if (["send_email", "send_sms", "send_whatsapp"].includes(node.data?.subType || "")) {
          await new Promise((r) => setTimeout(r, THROTTLE_MS));
        }
      } catch (nodeErr: any) {
        await fail(currentId!, nodeKind || "unknown", nodeErr?.message || "node_crashed", { stack: nodeErr?.stack });
        break;
      }
    }

    if (!currentId) {
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
