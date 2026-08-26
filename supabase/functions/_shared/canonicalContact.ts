// Canonical contact resolution shared by every acquisition path.
// Always resolves a person to ONE contact per workspace via the
// crm_upsert_contact database function (external id -> email -> phone).

export type Attribution = Record<string, unknown>;

export interface UpsertContactInput {
  workspaceId: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  externalSourceId?: string | null;
  source?: string | null;
  attribution?: Attribution;
  sourceTable?: string | null;
  sourceRecordId?: string | null;
}

/**
 * Resolves (or creates) the canonical contact. Returns null when the payload
 * carries no usable identifier or the call fails — callers must never break the
 * acquisition flow because of contact resolution.
 */
export async function upsertCanonicalContact(
  supabase: any,
  input: UpsertContactInput,
  correlationId?: string,
): Promise<string | null> {
  const { workspaceId, email, phone, externalSourceId } = input;
  if (!workspaceId) return null;
  if (!email && !phone && !externalSourceId) return null;

  const { data, error } = await supabase.rpc("crm_upsert_contact", {
    _workspace_id: workspaceId,
    _email: email ?? null,
    _phone: phone ?? null,
    _full_name: input.fullName ?? null,
    _external_source_id: externalSourceId ?? null,
    _source: input.source ?? null,
    _attribution: input.attribution ?? {},
    _source_table: input.sourceTable ?? null,
    _source_record_id: input.sourceRecordId ?? null,
  });

  if (error) {
    console.error("[canonical-contact] upsert failed", {
      correlationId,
      workspaceId,
      sourceTable: input.sourceTable,
      message: error.message,
    });
    return null;
  }
  return (data as string) ?? null;
}

/** Links a lead row to its canonical contact and keeps origin_lead_id populated. */
export async function linkLeadToContact(
  supabase: any,
  leadId: string,
  contactId: string,
): Promise<void> {
  try {
    await supabase.from("leads").update({ contact_id: contactId }).eq("id", leadId);
    await supabase
      .from("contacts")
      .update({ origin_lead_id: leadId })
      .eq("id", contactId)
      .is("origin_lead_id", null);
  } catch (err) {
    console.error("[canonical-contact] link failed", { leadId, contactId, err: String(err) });
  }
}

/** Records a contact timeline event; never throws. */
export async function recordContactTimeline(
  supabase: any,
  params: {
    workspaceId: string;
    contactId: string;
    activityType: string;
    title: string;
    description?: string | null;
    source?: string | null;
    externalEventId?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("crm_activities").insert({
      workspace_id: params.workspaceId,
      record_type: "contact",
      record_id: params.contactId,
      activity_type: params.activityType,
      title: params.title,
      description: params.description ?? null,
      source: params.source ?? "system",
      external_event_id: params.externalEventId ?? null,
      meta: params.meta ?? {},
    });
  } catch (err) {
    console.error("[canonical-contact] timeline failed", String(err));
  }
}
