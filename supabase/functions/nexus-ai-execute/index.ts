import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, authorize } from "../_shared/nexus-ai-core.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/** Executes a single confirmed action. Returns before/after snapshots for the audit trail. */
async function runAction(action: any, workspaceId: string, userId: string) {
  const changes = action.changes || {};
  const payload = action.payload || {};
  const targetId = action.target_id;

  const loadLead = async () => {
    if (!targetId) throw new Error("This action is missing the contact it applies to.");
    const { data, error } = await admin
      .from("leads")
      .select("*")
      .eq("id", targetId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Contact not found in this workspace.");
    return data;
  };

  const updateLead = async (patch: Record<string, unknown>, before: any) => {
    const { data, error } = await admin
      .from("leads")
      .update(patch)
      .eq("id", before.id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { before, after: data };
  };

  switch (action.action_type) {
    case "update_lead_status": {
      const before = await loadLead();
      const status = String(changes.status ?? payload.status ?? "");
      if (!status) throw new Error("No status supplied.");
      return updateLead({ status }, before);
    }
    case "update_lead_stage": {
      const before = await loadLead();
      const stage = String(changes.pipeline_stage ?? changes.stage ?? payload.stage ?? "");
      if (!stage) throw new Error("No pipeline stage supplied.");
      return updateLead({ pipeline_stage: stage }, before);
    }
    case "add_lead_tag": {
      const before = await loadLead();
      const tag = String(changes.tag ?? payload.tag ?? "").trim();
      if (!tag) throw new Error("No tag supplied.");
      const tags = Array.from(new Set([...(before.tags || []), tag]));
      return updateLead({ tags }, before);
    }
    case "remove_lead_tag": {
      const before = await loadLead();
      const tag = String(changes.tag ?? payload.tag ?? "").trim();
      const tags = (before.tags || []).filter((t: string) => t !== tag);
      return updateLead({ tags }, before);
    }
    case "assign_lead_owner": {
      const before = await loadLead();
      const owner = String(changes.assigned_owner_id ?? payload.user_id ?? "");
      if (!owner) throw new Error("No owner supplied.");
      const { data: isMember } = await admin.rpc("is_workspace_member", {
        _user_id: owner, _workspace_id: workspaceId,
      });
      if (isMember !== true) throw new Error("That owner is not a member of this workspace.");
      return updateLead({ assigned_owner_id: owner }, before);
    }
    case "create_lead_note": {
      const before = await loadLead();
      const note = String(changes.note ?? payload.note ?? "").trim();
      if (!note) throw new Error("No note text supplied.");
      const notes = [before.notes, `[Nexus AI] ${note}`].filter(Boolean).join("\n\n");
      return updateLead({ notes }, before);
    }
    case "create_lead_task": {
      const lead = await loadLead();
      const { data, error } = await admin
        .from("lead_tasks")
        .insert({
          lead_id: lead.id,
          workspace_id: workspaceId,
          user_id: userId,
          title: String(changes.title ?? payload.title ?? action.title).slice(0, 200),
          description: changes.description ? String(changes.description) : null,
          due_date: changes.due_date ?? payload.due_date ?? null,
        })
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { before: null, after: data };
    }
    case "pause_automation":
    case "activate_automation": {
      if (!targetId) throw new Error("This action is missing the automation it applies to.");
      const { data: before } = await admin
        .from("automations").select("*").eq("id", targetId).eq("workspace_id", workspaceId).maybeSingle();
      if (!before) throw new Error("Automation not found in this workspace.");
      const status = action.action_type === "pause_automation" ? "paused" : "active";
      const { data, error } = await admin
        .from("automations").update({ status }).eq("id", targetId).select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return { before, after: data };
    }
    case "pause_campaign": {
      if (!targetId) throw new Error("This action is missing the campaign it applies to.");
      const { data: before } = await admin
        .from("campaigns").select("*").eq("id", targetId).eq("workspace_id", workspaceId).maybeSingle();
      if (!before) throw new Error("Campaign not found in this workspace.");
      const { data, error } = await admin
        .from("campaigns").update({ status: "paused" }).eq("id", targetId).select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return { before, after: data };
    }
    default:
      throw new Error(`Nexus AI is not allowed to run "${action.action_type}".`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspaceId, actionId, decision } = await req.json();
    const auth = await authorize(req, admin, workspaceId);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const { data: action } = await admin
      .from("ai_proposed_actions")
      .select("*")
      .eq("id", actionId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!action) return json({ error: "That suggestion no longer exists." }, 404);

    if (decision === "cancel") {
      await admin.from("ai_proposed_actions")
        .update({ status: "cancelled" }).eq("id", actionId);
      return json({ status: "cancelled" });
    }

    if (!["suggested", "awaiting_confirmation", "failed"].includes(action.status)) {
      return json({ error: `This action was already ${action.status}.` }, 409);
    }

    await admin.from("ai_proposed_actions").update({
      status: "processing", confirmed_by: userId, confirmed_at: new Date().toISOString(),
    }).eq("id", actionId);

    try {
      const { before, after } = await runAction(action, workspaceId, userId);

      await admin.from("ai_proposed_actions").update({
        status: "completed", completed_at: new Date().toISOString(), error: null,
      }).eq("id", actionId);

      await admin.from("ai_action_audit").insert({
        workspace_id: workspaceId,
        action_id: actionId,
        user_id: userId,
        action_type: action.action_type,
        target_table: action.target_table,
        target_id: action.target_id,
        before_snapshot: before,
        after_snapshot: after,
        result: "completed",
        undo_available: !!before,
      });

      return json({ status: "completed", after });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      await admin.from("ai_proposed_actions").update({ status: "failed", error: message }).eq("id", actionId);
      await admin.from("ai_action_audit").insert({
        workspace_id: workspaceId, action_id: actionId, user_id: userId,
        action_type: action.action_type, target_table: action.target_table,
        target_id: action.target_id, result: "failed",
      });
      return json({ error: message }, 400);
    }
  } catch (e) {
    console.error("nexus-ai-execute error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
