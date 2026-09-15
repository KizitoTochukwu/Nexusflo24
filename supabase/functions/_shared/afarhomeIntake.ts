// AfarHome enquiry intake — shared by capture-lead (hosted form) and
// ingest-leads (external website webhook). Given a lead + its canonical
// contact plus the enquiry fields, it:
//   1. Updates the contact (WhatsApp number, per-channel consent).
//   2. Writes the seven AfarHome custom field values.
//   3. Applies service + urgency tags to lead and contact (creating tag
//      library rows on the fly).
//   4. Creates an opportunity in the "AfarHome Enquiries" pipeline —
//      idempotently: an existing open deal for the contact is reused and
//      annotated instead of duplicated.
// Never throws: intake must not break lead capture.

export interface AfarhomeEnquiryFields {
  country_of_residence?: string | null;
  service_interest?: string | null;
  service_location?: string | null;
  service_urgency?: string | null;
  enquiry_details?: string | null;
  preferred_channel?: string | null;
  enquiry_date?: string | null;
  marketing_consent?: boolean;
}

const CUSTOM_FIELD_KEYS = [
  "country_of_residence",
  "service_interest",
  "service_location",
  "service_urgency",
  "enquiry_details",
  "preferred_channel",
  "enquiry_date",
] as const;

/** Short human-quotable enquiry reference, e.g. AFH-7K2D9. */
function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `AFH-${out}`;
}

export function isAfarhomeEnquiry(tags: string[], explicit?: unknown): boolean {
  if (explicit === true) return true;
  return tags.some((t) => String(t).toLowerCase() === "afarhome");
}

async function ensureTag(supabase: any, workspaceId: string, name: string) {
  try {
    const { data } = await supabase
      .from("crm_tags")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", name)
      .maybeSingle();
    if (!data) {
      await supabase.from("crm_tags").insert({ workspace_id: workspaceId, name });
    }
  } catch (e) {
    console.error("[afarhome] ensureTag failed:", name, String(e));
  }
}

export async function processAfarhomeEnquiry(
  supabase: any,
  input: {
    workspaceId: string;
    leadId: string;
    contactId: string | null;
    ownerId: string | null;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    fields: AfarhomeEnquiryFields;
  },
): Promise<{ deal_id: string | null; deal_action: "created" | "reused" | "none" }> {
  const { workspaceId, leadId, contactId, ownerId } = input;
  const f = input.fields;
  const result = { deal_id: null as string | null, deal_action: "none" as "created" | "reused" | "none" };

  try {
    // ---- 1) Contact updates: WhatsApp number + consent ----
    if (contactId) {
      const contactUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.phone) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("whatsapp_number")
          .eq("id", contactId)
          .maybeSingle();
        if (!contact?.whatsapp_number) contactUpdates.whatsapp_number = input.phone;
      }
      if (f.marketing_consent) {
        // Only ever upgrade consent — never downgrade an existing opt-out.
        contactUpdates.consent_email = true;
        contactUpdates.consent_whatsapp = true;
        contactUpdates.consent_sms = true;
        contactUpdates.consent_status = "granted";
        contactUpdates.consent_updated_at = new Date().toISOString();
      }
      if (Object.keys(contactUpdates).length > 1) {
        await supabase.from("contacts").update(contactUpdates).eq("id", contactId);
      }

      // ---- 2) Custom field values ----
      const { data: defs } = await supabase
        .from("crm_custom_field_defs")
        .select("id, field_key")
        .eq("workspace_id", workspaceId)
        .eq("record_type", "contact")
        .in("field_key", CUSTOM_FIELD_KEYS as unknown as string[]);
      const defByKey = new Map<string, string>((defs ?? []).map((d: any) => [d.field_key, d.id]));
      const rows = CUSTOM_FIELD_KEYS
        .map((key) => {
          const fieldId = defByKey.get(key);
          const value = (f as any)[key];
          if (!fieldId || value === undefined || value === null || value === "") return null;
          return {
            workspace_id: workspaceId,
            record_type: "contact",
            record_id: contactId,
            field_id: fieldId,
            value,
          };
        })
        .filter(Boolean);
      if (rows.length) {
        const { error } = await supabase
          .from("crm_custom_field_values")
          .upsert(rows, { onConflict: "field_id,record_id" });
        if (error) console.error("[afarhome] custom field values failed:", error.message);
      }
    }

    // ---- 3) Dynamic tags: service + urgency on lead and contact ----
    const dynamicTags = [f.service_interest, f.service_urgency]
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean) as string[];
    for (const tag of dynamicTags) await ensureTag(supabase, workspaceId, tag);
    if (dynamicTags.length) {
      const { data: lead } = await supabase.from("leads").select("tags").eq("id", leadId).maybeSingle();
      const merged = Array.from(new Set([...(lead?.tags ?? []), ...dynamicTags]));
      await supabase.from("leads").update({ tags: merged }).eq("id", leadId);
      if (contactId) {
        const { data: contact } = await supabase.from("contacts").select("tags").eq("id", contactId).maybeSingle();
        const cMerged = Array.from(new Set([...(contact?.tags ?? []), ...dynamicTags, "AfarHome", "Website Enquiry"]));
        await supabase.from("contacts").update({ tags: cMerged }).eq("id", contactId);
      }
    }

    // ---- 4) Opportunity in "AfarHome Enquiries" (idempotent) ----
    const { data: pipeline } = await supabase
      .from("crm_pipelines")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", "afarhome enquiries")
      .maybeSingle();

    if (pipeline && contactId) {
      // Re-entry rule: an open opportunity is only reused when the new enquiry
      // is for the SAME service. A different service (or a closed earlier
      // enquiry) opens a fresh opportunity.
      const service = (f.service_interest || "").trim().toLowerCase();
      const { data: openDeals } = await supabase
        .from("crm_deals")
        .select("id, name, tags, reference_number")
        .eq("workspace_id", workspaceId)
        .eq("pipeline_id", pipeline.id)
        .eq("contact_id", contactId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(10);
      const openDeal = (openDeals ?? []).find((d: any) => {
        if (!service) return true;
        const tags = (d.tags ?? []).map((t: string) => String(t).toLowerCase());
        return tags.includes(service) || String(d.name || "").toLowerCase().includes(service);
      }) ?? null;

      const summary = [
        f.service_interest && `Service: ${f.service_interest}`,
        f.service_location && `Location: ${f.service_location}`,
        f.service_urgency && `Timeframe: ${f.service_urgency}`,
        f.preferred_channel && `Preferred contact: ${f.preferred_channel}`,
        f.enquiry_details && `Enquiry: ${f.enquiry_details}`,
      ].filter(Boolean).join("\n");

      if (openDeal) {
        result.deal_id = openDeal.id;
        result.deal_action = "reused";
        await supabase.from("crm_notes").insert({
          workspace_id: workspaceId,
          record_type: "deal",
          record_id: openDeal.id,
          body: `Repeat enquiry received (${new Date().toISOString().slice(0, 10)}):\n${summary}`,
          author_user_id: ownerId,
        });
      } else {
        const { data: stage } = await supabase
          .from("crm_pipeline_stages")
          .select("id")
          .eq("pipeline_id", pipeline.id)
          .ilike("name", "new enquiry")
          .maybeSingle();

        const name = `${input.fullName || input.email || input.phone || "New enquiry"} – ${f.service_interest || "General enquiry"}`;
        const { data: deal, error: dealErr } = await supabase
          .from("crm_deals")
          .insert({
            workspace_id: workspaceId,
            pipeline_id: pipeline.id,
            stage_id: stage?.id ?? null,
            name,
            status: "open",
            contact_id: contactId,
            lead_id: leadId,
            owner_user_id: ownerId,
            created_by: ownerId,
            source: "Website Enquiry",
            description: summary || null,
            tags: ["AfarHome", "Website Enquiry", ...dynamicTags],
            reference_number: makeReference(),
          })
          .select("id")
          .maybeSingle();
        if (dealErr) {
          console.error("[afarhome] deal insert failed:", dealErr.message);
        } else {
          result.deal_id = deal?.id ?? null;
          result.deal_action = "created";
        }
      }

      // Contact timeline entry
      await supabase.from("crm_activities").insert({
        workspace_id: workspaceId,
        record_type: "contact",
        record_id: contactId,
        activity_type: "deal_created",
        title: result.deal_action === "created" ? "Opportunity created" : "Opportunity updated",
        description: `${nameSummary(input, f)} (${result.deal_action})`,
        source: "afarhome_intake",
        external_event_id: `afarhome-enquiry:${leadId}`,
        meta: { lead_id: leadId, deal_id: result.deal_id },
      });
    }
  } catch (e) {
    console.error("[afarhome] intake failed:", String(e));
  }
  return result;
}

function nameSummary(
  input: { fullName?: string | null; email?: string | null },
  f: AfarhomeEnquiryFields,
): string {
  return `${input.fullName || input.email || "Enquiry"} – ${f.service_interest || "General enquiry"}`;
}
