// Phase 5 — Commerce ⇄ CRM bridge.
// Keeps buyers in sync with CRM contacts/leads, writes the commerce timeline
// and fires commerce enrollment triggers on the automation engine.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const log = (step: string, details?: unknown) =>
  console.log(`[COMMERCE-CRM] ${step}`, details ? JSON.stringify(details) : "");

export interface CommerceParty {
  workspace_id: string;
  store_id?: string | null;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  customer_id?: string | null;
  order_id?: string | null;
  source?: string;
}

export interface SyncResult {
  contact_id: string | null;
  lead_id: string | null;
}

/** Workspace owner id — used as the required `user_id` on lead rows. */
async function workspaceOwnerId(admin: any, workspaceId: string): Promise<string | null> {
  const { data: ws } = await admin
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (ws?.owner_id) return ws.owner_id;
  const { data: member } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  return member?.user_id ?? null;
}

/**
 * Upserts the buyer as a CRM contact (and a lead so automations can enrol them),
 * then back-links shop_customers / shop_orders to the contact.
 */
export async function syncCommerceContact(admin: any, party: CommerceParty): Promise<SyncResult> {
  const email = String(party.email || "").trim().toLowerCase();
  if (!email || !party.workspace_id) return { contact_id: null, lead_id: null };

  const now = new Date().toISOString();
  let contactId: string | null = null;
  let leadId: string | null = null;

  try {
    // ---- Contact ----
    const { data: existingContact } = await admin
      .from("contacts")
      .select("id, full_name, phone, tags, lifecycle_stage")
      .eq("workspace_id", party.workspace_id)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
      const tags: string[] = Array.isArray(existingContact.tags) ? existingContact.tags : [];
      const nextTags = tags.some((t) => String(t).toLowerCase() === "customer")
        ? tags
        : [...tags, "customer"];
      await admin.from("contacts").update({
        full_name: existingContact.full_name || party.full_name || null,
        phone: existingContact.phone || party.phone || null,
        lifecycle_stage: "customer",
        tags: nextTags,
        last_activity_at: now,
      }).eq("id", contactId);
    } else {
      const { data: created, error } = await admin.from("contacts").insert({
        workspace_id: party.workspace_id,
        email,
        full_name: party.full_name || null,
        phone: party.phone || null,
        lifecycle_stage: "customer",
        source: party.source || "commerce",
        tags: ["customer"],
        last_activity_at: now,
      }).select("id").maybeSingle();
      if (error) log("contact insert failed", error.message);
      contactId = created?.id ?? null;
    }

    // ---- Lead (automation enrollment target) ----
    const { data: existingLead } = await admin
      .from("leads")
      .select("id, full_name, phone, tags")
      .eq("workspace_id", party.workspace_id)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
      const tags: string[] = Array.isArray(existingLead.tags) ? existingLead.tags : [];
      const nextTags = tags.some((t) => String(t).toLowerCase() === "customer")
        ? tags
        : [...tags, "customer"];
      await admin.from("leads").update({
        full_name: existingLead.full_name || party.full_name || null,
        phone: existingLead.phone || party.phone || null,
        tags: nextTags,
        last_activity_at: now,
      }).eq("id", leadId);
    } else {
      const ownerId = await workspaceOwnerId(admin, party.workspace_id);
      if (ownerId) {
        const { data: createdLead, error } = await admin.from("leads").insert({
          workspace_id: party.workspace_id,
          user_id: ownerId,
          email,
          full_name: party.full_name || null,
          phone: party.phone || null,
          source: party.source || "commerce",
          status: "customer",
          tags: ["customer"],
          last_activity_at: now,
        }).select("id").maybeSingle();
        if (error) log("lead insert failed", error.message);
        leadId = createdLead?.id ?? null;
      }
    }

    // ---- Back-links ----
    if (contactId && party.customer_id) {
      await admin.from("shop_customers").update({ contact_id: contactId }).eq("id", party.customer_id);
    }
    if (contactId && party.order_id) {
      await admin.from("shop_orders").update({ contact_id: contactId }).eq("id", party.order_id);
    }
  } catch (err) {
    log("sync failed", String(err));
  }

  return { contact_id: contactId, lead_id: leadId };
}

/** Writes a row to the unified CRM timeline (idempotent via external_event_id). */
export async function logCommerceActivity(admin: any, row: {
  workspace_id: string;
  contact_id: string | null;
  activity_type: string;
  title: string;
  description?: string | null;
  status?: string | null;
  related_id?: string | null;
  meta?: Record<string, unknown>;
  external_event_id?: string | null;
  occurred_at?: string;
}) {
  if (!row.contact_id) return;
  try {
    const { error } = await admin.from("crm_activities").insert({
      workspace_id: row.workspace_id,
      record_type: "contact",
      record_id: row.contact_id,
      activity_type: row.activity_type,
      title: row.title,
      description: row.description ?? null,
      source: "commerce",
      status: row.status ?? null,
      related_type: row.related_id ? "shop_order" : null,
      related_id: row.related_id ?? null,
      external_event_id: row.external_event_id ?? null,
      meta: row.meta ?? {},
      occurred_at: row.occurred_at ?? new Date().toISOString(),
    });
    if (error && (error as any).code !== "23505") log("activity insert failed", error.message);
  } catch (err) {
    log("activity failed", String(err));
  }
}

/** Fires a commerce enrollment trigger against the workflow engine. */
export async function fireCommerceTrigger(params: {
  workspace_id: string;
  lead_id: string | null;
  event_type: string;
  event_config?: Record<string, unknown>;
}) {
  if (!params.lead_id) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/enroll-workflow-leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        workspace_id: params.workspace_id,
        lead_ids: [params.lead_id],
        event_type: params.event_type,
        event_config: params.event_config ?? {},
      }),
    });
  } catch (err) {
    log("trigger dispatch failed", String(err));
  }
}

/**
 * Convenience: sync buyer, log the timeline entry and fire the matching
 * commerce automation trigger in one call.
 */
export async function handleCommerceEvent(admin: any, input: {
  party: CommerceParty;
  event_type: string;
  title: string;
  description?: string | null;
  status?: string | null;
  meta?: Record<string, unknown>;
  external_event_id?: string | null;
  event_config?: Record<string, unknown>;
}): Promise<SyncResult> {
  const result = await syncCommerceContact(admin, input.party);
  await logCommerceActivity(admin, {
    workspace_id: input.party.workspace_id,
    contact_id: result.contact_id,
    activity_type: input.event_type,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? null,
    related_id: input.party.order_id ?? null,
    meta: input.meta,
    external_event_id: input.external_event_id ?? null,
  });
  await fireCommerceTrigger({
    workspace_id: input.party.workspace_id,
    lead_id: result.lead_id,
    event_type: input.event_type,
    event_config: {
      ...(input.event_config ?? {}),
      store_id: input.party.store_id ?? null,
      order_id: input.party.order_id ?? null,
      external_event_id: input.external_event_id ?? undefined,
    },
  });
  return result;
}
