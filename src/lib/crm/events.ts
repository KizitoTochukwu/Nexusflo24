import { supabase } from "@/integrations/supabase/client";
import { fireAutomationsForLeads } from "@/lib/automations/fireTriggers";

export type CrmRecordType = "contact" | "company" | "lead" | "deal" | "task";

type LogParams = {
  workspaceId: string;
  recordType: CrmRecordType;
  recordId: string;
  activityType: string;
  title?: string;
  description?: string;
  actorUserId?: string | null;
  actorLabel?: string;
  source?: string;
  status?: string;
  relatedType?: string;
  relatedId?: string;
  meta?: Record<string, unknown>;
  /** Stable key so webhook/mutation retries cannot create duplicate events. */
  externalEventId?: string;
  occurredAt?: string;
};

/**
 * Writes one row to the unified CRM timeline. Best-effort: never throws,
 * so a timeline failure can't roll back the user's actual change.
 * Duplicate suppression relies on the partial unique index over
 * (workspace_id, source, external_event_id).
 */
export async function logCrmActivity(params: LogParams) {
  try {
    const { error } = await supabase.from("crm_activities" as any).insert({
      workspace_id: params.workspaceId,
      record_type: params.recordType,
      record_id: params.recordId,
      activity_type: params.activityType,
      title: params.title ?? null,
      description: params.description ?? null,
      actor_user_id: params.actorUserId ?? null,
      actor_label: params.actorLabel ?? null,
      source: params.source ?? "app",
      status: params.status ?? null,
      related_type: params.relatedType ?? null,
      related_id: params.relatedId ?? null,
      external_event_id: params.externalEventId ?? null,
      meta: params.meta ?? {},
      occurred_at: params.occurredAt ?? new Date().toISOString(),
    } as any);
    // 23505 = duplicate (retry already logged this event) — expected, not an error.
    if (error && error.code !== "23505") console.error("[logCrmActivity]", error);
  } catch (e) {
    console.error("[logCrmActivity]", e);
  }
}

type AuditParams = {
  workspaceId: string;
  recordType: CrmRecordType;
  recordId?: string | null;
  action: string;
  actorUserId?: string | null;
  actorLabel?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

export async function logCrmAudit(params: AuditParams) {
  try {
    const { error } = await supabase.from("crm_audit_log" as any).insert({
      workspace_id: params.workspaceId,
      record_type: params.recordType,
      record_id: params.recordId ?? null,
      action: params.action,
      actor_user_id: params.actorUserId ?? null,
      actor_label: params.actorLabel ?? null,
      before_data: params.before ?? null,
      after_data: params.after ?? null,
    } as any);
    if (error) console.error("[logCrmAudit]", error);
  } catch (e) {
    console.error("[logCrmAudit]", e);
  }
}

/**
 * Fires a CRM automation event. The automation engine is lead-keyed, so a
 * contact only enrols when it is linked to an originating lead. Everything is
 * fired after the database write has succeeded, never before.
 */
export async function fireCrmAutomationEvent(params: {
  workspaceId: string;
  triggerType: string;
  leadIds: string[];
  triggerConfigMatch?: Record<string, string>;
}) {
  const leadIds = params.leadIds.filter(Boolean);
  if (!leadIds.length) return;
  return fireAutomationsForLeads({
    workspaceId: params.workspaceId,
    leadIds,
    triggerType: params.triggerType,
    triggerConfigMatch: params.triggerConfigMatch,
  }).catch((e) => console.error("[fireCrmAutomationEvent]", e));
}
