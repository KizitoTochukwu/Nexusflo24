// Webinar registration intake — shared by ingest-leads (external webinar site
// webhook) and any hosted form that flags a submission as a webinar signup.
//
// Given a lead + its canonical contact plus the registration fields it:
//   1. Creates/links the company record from the business name.
//   2. Updates the contact (first name, WhatsApp number, per-channel consent,
//      lifecycle, source attribution) without blanking populated fields.
//   3. Writes the webinar custom field values (business type, enquiry volume,
//      consent flags, registration metadata).
//   4. Applies webinar tags to lead and contact.
//   5. Opens (or reuses) one opportunity in the webinar pipeline.
//   6. Records a CRM timeline entry with the full submission + attribution.
//   7. Upserts a webinar_registrations row used for 30-day re-enrolment
//      suppression and for the reporting view.
//   8. Notifies the assigned owner.
// Never throws: intake must not break lead capture.

export const WEBINAR_CAMPAIGN = "WhatsApp Lead Follow-Up Webinar";
export const WEBINAR_SOURCE = "Webinar";
export const WEBINAR_SOURCE_URL = "https://webinar.nexusflo24.com";
export const WEBINAR_BOOKING_URL =
  "https://nexusflo24.com/book/book-a-free-15-minute-automation-fit-call-9c004f";
export const WEBINAR_PRODUCT_URL =
  "https://nexusflo24.com/automations/whatsapp-lead-follow-up-system";
export const WEBINAR_PIPELINE_NAME = "Whatsapp Lead Follow Up Webinar";
export const WEBINAR_FIRST_STAGE = "New Webinar Lead";
export const WEBINAR_TAGS = ["webinar-lead", "whatsapp-followup-interest"];
/** Repeat registrations inside this window update records but do not restart the sequence. */
export const REENROLMENT_WINDOW_DAYS = 30;

export function webinarRecordingUrl(): string {
  return Deno.env.get("WEBINAR_RECORDING_URL") || `${WEBINAR_SOURCE_URL}/watch`;
}

export interface WebinarFields {
  first_name?: string | null;
  business_name?: string | null;
  business_type?: string | null;
  whatsapp_enquiry_volume?: string | null;
  webinar_consent?: boolean;
  marketing_consent?: boolean;
  consent_version?: string | null;
  consent_text?: string | null;
  source_url?: string | null;
  landing_page_url?: string | null;
  campaign?: string | null;
  utm?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
}

const CUSTOM_FIELD_KEYS = ["business_type", "whatsapp_enquiry_volume"] as const;

export function isWebinarRegistration(tags: string[], explicit?: unknown): boolean {
  if (explicit === true) return true;
  return tags.some((t) => String(t).toLowerCase() === "webinar-lead");
}

/** Enquiry-volume band → segment + score bump, used by intake and reporting. */
export function volumeSegment(raw: string | null | undefined): {
  band: "standard" | "warm" | "high" | "urgent";
  score: number;
  priority: "low" | "medium" | "high" | "urgent";
} {
  const v = String(raw ?? "").toLowerCase();
  const num = (v.match(/\d+/g) ?? []).map(Number).sort((a, b) => b - a)[0] ?? 0;
  if (v.includes("100") && (v.includes("+") || v.includes("more") || v.includes("over"))) {
    return { band: "urgent", score: 25, priority: "urgent" };
  }
  if (num > 100) return { band: "urgent", score: 25, priority: "urgent" };
  if (num > 50) return { band: "high", score: 18, priority: "high" };
  if (num > 20) return { band: "warm", score: 10, priority: "medium" };
  return { band: "standard", score: 5, priority: "low" };
}

function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `WLW-${out}`;
}

async function ensureTag(supabase: any, workspaceId: string, name: string) {
  try {
    const { data } = await supabase
      .from("crm_tags")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", name)
      .maybeSingle();
    if (!data) await supabase.from("crm_tags").insert({ workspace_id: workspaceId, name });
  } catch (e) {
    console.error("[webinar] ensureTag failed:", name, String(e));
  }
}

export interface WebinarIntakeResult {
  registration_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  deal_action: "created" | "reused" | "none";
  /** false when a registration for this person already exists inside the window. */
  should_enrol: boolean;
  repeat: boolean;
  webinar_url: string;
  booking_url: string;
  product_url: string;
}

export async function processWebinarRegistration(
  supabase: any,
  input: {
    workspaceId: string;
    leadId: string;
    contactId: string | null;
    ownerId: string | null;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    fields: WebinarFields;
  },
): Promise<WebinarIntakeResult> {
  const { workspaceId, leadId, contactId, ownerId } = input;
  const f = input.fields;
  const now = new Date().toISOString();
  const result: WebinarIntakeResult = {
    registration_id: null,
    contact_id: contactId,
    deal_id: null,
    deal_action: "none",
    should_enrol: false,
    repeat: false,
    webinar_url: webinarRecordingUrl(),
    booking_url: WEBINAR_BOOKING_URL,
    product_url: WEBINAR_PRODUCT_URL,
  };

  try {
    const firstName =
      (f.first_name || "").trim() ||
      (input.fullName || "").trim().split(/\s+/)[0] ||
      null;
    const email = (input.email || "").trim().toLowerCase() || null;
    const seg = volumeSegment(f.whatsapp_enquiry_volume);

    // ---- 0) Existing registration (30-day re-enrolment suppression) ----
    let existingReg: any = null;
    if (email) {
      const { data } = await supabase
        .from("webinar_registrations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .ilike("email", email)
        .maybeSingle();
      existingReg = data;
    }
    if (!existingReg && input.phone) {
      const { data } = await supabase
        .from("webinar_registrations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("phone", input.phone)
        .maybeSingle();
      existingReg = data;
    }
    result.repeat = !!existingReg;

    const withinWindow =
      !!existingReg?.enrolled_at &&
      Date.now() - new Date(existingReg.enrolled_at).getTime() <
        REENROLMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    result.should_enrol = !!f.webinar_consent && !withinWindow;

    // ---- 1) Company from business name ----
    let companyId: string | null = null;
    const businessName = (f.business_name || "").trim();
    if (businessName) {
      const { data: existingCo } = await supabase
        .from("companies")
        .select("id")
        .eq("workspace_id", workspaceId)
        .ilike("name", businessName)
        .maybeSingle();
      if (existingCo) {
        companyId = existingCo.id;
      } else {
        const { data: newCo, error: coErr } = await supabase
          .from("companies")
          .insert({
            workspace_id: workspaceId,
            name: businessName,
            owner_user_id: ownerId,
            created_by: ownerId,
            lifecycle_stage: "lead",
            tags: WEBINAR_TAGS,
          })
          .select("id")
          .maybeSingle();
        if (coErr) console.error("[webinar] company insert failed:", coErr.message);
        companyId = newCo?.id ?? null;
      }
    }

    // ---- 2) Contact updates (never blank a populated field) ----
    if (contactId) {
      const { data: contact } = await supabase
        .from("contacts")
        .select(
          "first_name, whatsapp_number, company_id, company_name, tags, source, consent_email, consent_whatsapp, lifecycle_stage, score, first_touch",
        )
        .eq("id", contactId)
        .maybeSingle();

      const updates: Record<string, unknown> = { updated_at: now, last_activity_at: now };
      if (firstName && !contact?.first_name) updates.first_name = firstName;
      if (input.phone && !contact?.whatsapp_number) updates.whatsapp_number = input.phone;
      if (companyId && !contact?.company_id) updates.company_id = companyId;
      if (businessName && !contact?.company_name) updates.company_name = businessName;
      if (!contact?.source) updates.source = WEBINAR_SOURCE;
      if (!contact?.lifecycle_stage || contact.lifecycle_stage === "subscriber") {
        updates.lifecycle_stage = "lead";
      }
      updates.lead_status = "New";
      updates.score = Math.min(100, (contact?.score ?? 0) + seg.score);
      updates.score_updated_at = now;

      // Consent only ever upgrades: webinar consent enables essential webinar
      // email/WhatsApp; marketing consent enables promotional sends.
      if (f.webinar_consent) {
        updates.consent_email = true;
        updates.consent_whatsapp = true;
        updates.consent_status = "granted";
        updates.consent_updated_at = now;
      }

      const attribution = {
        source: WEBINAR_SOURCE,
        campaign: f.campaign || WEBINAR_CAMPAIGN,
        source_url: f.source_url || WEBINAR_SOURCE_URL,
        landing_page_url: f.landing_page_url || null,
        ...(f.utm ?? {}),
        at: now,
      };
      if (!contact?.first_touch || Object.keys(contact.first_touch ?? {}).length === 0) {
        updates.first_touch = attribution;
        updates.first_touch_at = now;
      }
      updates.last_touch = attribution;
      updates.last_touch_at = now;

      const tags = Array.from(
        new Set([
          ...((contact?.tags as string[]) ?? []),
          ...WEBINAR_TAGS,
          ...(f.marketing_consent ? ["marketing-consent"] : []),
        ]),
      );
      updates.tags = tags;

      await supabase.from("contacts").update(updates).eq("id", contactId);

      // ---- 3) Custom field values ----
      const { data: defs } = await supabase
        .from("crm_custom_field_defs")
        .select("id, field_key")
        .eq("workspace_id", workspaceId)
        .eq("record_type", "contact")
        .in("field_key", [
          ...CUSTOM_FIELD_KEYS,
          "marketing_consent",
          "whatsapp_consent",
          "webinar_registration_status",
          "webinar_registered_at",
        ]);
      const defByKey = new Map<string, string>((defs ?? []).map((d: any) => [d.field_key, d.id]));
      const values: Record<string, unknown> = {
        business_type: f.business_type ?? null,
        whatsapp_enquiry_volume: f.whatsapp_enquiry_volume ?? null,
        marketing_consent: f.marketing_consent ? "Yes" : "No",
        whatsapp_consent: f.webinar_consent ? "Yes" : "No",
        webinar_registration_status: "Registered",
        webinar_registered_at: now,
      };
      const rows = Object.entries(values)
        .map(([key, value]) => {
          const fieldId = defByKey.get(key);
          if (!fieldId || value === null || value === undefined || value === "") return null;
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
        if (error) console.error("[webinar] custom field values failed:", error.message);
      }
    }

    // ---- 4) Tags on lead + tag library ----
    const leadTags = [...WEBINAR_TAGS, ...(f.marketing_consent ? ["marketing-consent"] : [])];
    for (const tag of leadTags) await ensureTag(supabase, workspaceId, tag);
    const { data: lead } = await supabase
      .from("leads")
      .select("tags, score")
      .eq("id", leadId)
      .maybeSingle();
    await supabase
      .from("leads")
      .update({
        tags: Array.from(new Set([...((lead?.tags as string[]) ?? []), ...leadTags])),
        source: WEBINAR_SOURCE,
        campaign_name: f.campaign || WEBINAR_CAMPAIGN,
        status: "New",
        score: Math.min(100, (lead?.score ?? 0) + seg.score),
        attribution: {
          source: WEBINAR_SOURCE,
          campaign: f.campaign || WEBINAR_CAMPAIGN,
          source_url: f.source_url || WEBINAR_SOURCE_URL,
          landing_page_url: f.landing_page_url || null,
          ...(f.utm ?? {}),
        },
        ...(f.webinar_consent ? { wa_opt_in_at: now } : {}),
        updated_at: now,
        last_activity_at: now,
      })
      .eq("id", leadId);

    // ---- 5) Opportunity in the webinar pipeline (idempotent) ----
    const { data: pipeline } = await supabase
      .from("crm_pipelines")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", WEBINAR_PIPELINE_NAME)
      .maybeSingle();

    if (pipeline && contactId) {
      const { data: openDeal } = await supabase
        .from("crm_deals")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("pipeline_id", pipeline.id)
        .eq("contact_id", contactId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .maybeSingle();

      const summary = [
        firstName && `First name: ${firstName}`,
        businessName && `Business: ${businessName}`,
        f.business_type && `Business type: ${f.business_type}`,
        f.whatsapp_enquiry_volume && `Monthly WhatsApp enquiries: ${f.whatsapp_enquiry_volume}`,
        input.phone && `Phone: ${input.phone}`,
        email && `Email: ${email}`,
        `Webinar consent: ${f.webinar_consent ? "Yes" : "No"}`,
        `Marketing consent: ${f.marketing_consent ? "Yes" : "No"}`,
      ]
        .filter(Boolean)
        .join("\n");

      if (openDeal) {
        result.deal_id = openDeal.id;
        result.deal_action = "reused";
        await supabase.from("crm_notes").insert({
          workspace_id: workspaceId,
          record_type: "deal",
          record_id: openDeal.id,
          body: `Repeat webinar registration (${now.slice(0, 10)}):\n${summary}`,
          author_user_id: ownerId,
        });
      } else {
        const { data: stage } = await supabase
          .from("crm_pipeline_stages")
          .select("id")
          .eq("pipeline_id", pipeline.id)
          .ilike("name", WEBINAR_FIRST_STAGE)
          .maybeSingle();

        const { data: deal, error: dealErr } = await supabase
          .from("crm_deals")
          .insert({
            workspace_id: workspaceId,
            pipeline_id: pipeline.id,
            stage_id: stage?.id ?? null,
            name: `${firstName || email || input.phone || "Webinar lead"} – ${businessName || "Webinar registration"}`,
            status: "open",
            contact_id: contactId,
            company_id: companyId,
            lead_id: leadId,
            owner_user_id: ownerId,
            created_by: ownerId,
            source: WEBINAR_SOURCE,
            description: summary,
            tags: [...WEBINAR_TAGS, seg.band],
            reference_number: makeReference(),
            priority: seg.priority,
          })
          .select("id")
          .maybeSingle();
        if (dealErr) console.error("[webinar] deal insert failed:", dealErr.message);
        result.deal_id = deal?.id ?? null;
        result.deal_action = deal ? "created" : "none";
      }

      // ---- 6) Timeline entry ----
      await supabase.from("crm_activities").insert({
        workspace_id: workspaceId,
        record_type: "contact",
        record_id: contactId,
        activity_type: "form_submitted",
        title: result.repeat ? "Webinar registration (repeat)" : "Webinar registration",
        description: summary,
        source: "webinar_intake",
        external_event_id: `webinar-registration:${leadId}:${now}`,
        meta: {
          lead_id: leadId,
          deal_id: result.deal_id,
          campaign: f.campaign || WEBINAR_CAMPAIGN,
          source_url: f.source_url || WEBINAR_SOURCE_URL,
          landing_page_url: f.landing_page_url || null,
          utm: f.utm ?? {},
          enquiry_volume_band: seg.band,
          webinar_consent: !!f.webinar_consent,
          marketing_consent: !!f.marketing_consent,
        },
      });
    }

    // ---- 7) Registration record (dedupe + reporting) ----
    const regRow: Record<string, unknown> = {
      workspace_id: workspaceId,
      contact_id: contactId,
      lead_id: leadId,
      deal_id: result.deal_id,
      email,
      phone: input.phone ?? null,
      first_name: firstName,
      business_name: businessName || null,
      business_type: f.business_type ?? null,
      whatsapp_enquiry_volume: f.whatsapp_enquiry_volume ?? null,
      webinar_consent: !!f.webinar_consent,
      marketing_consent: !!f.marketing_consent,
      consent_version: f.consent_version ?? null,
      consent_text: f.consent_text ?? null,
      webinar_consent_at: f.webinar_consent ? now : null,
      marketing_consent_at: f.marketing_consent ? now : null,
      source_url: f.source_url || WEBINAR_SOURCE_URL,
      landing_page_url: f.landing_page_url ?? null,
      campaign: f.campaign || WEBINAR_CAMPAIGN,
      utm: f.utm ?? {},
      ip_address: f.ip_address ?? null,
      user_agent: f.user_agent ?? null,
      last_submitted_at: now,
      updated_at: now,
    };

    if (existingReg) {
      regRow.submission_count = (existingReg.submission_count ?? 1) + 1;
      if (result.should_enrol) regRow.enrolled_at = now;
      const { data: updated } = await supabase
        .from("webinar_registrations")
        .update(regRow)
        .eq("id", existingReg.id)
        .select("id")
        .maybeSingle();
      result.registration_id = updated?.id ?? existingReg.id;
    } else {
      if (result.should_enrol) regRow.enrolled_at = now;
      const { data: inserted, error: regErr } = await supabase
        .from("webinar_registrations")
        .insert(regRow)
        .select("id")
        .maybeSingle();
      if (regErr) console.error("[webinar] registration insert failed:", regErr.message);
      result.registration_id = inserted?.id ?? null;
    }

    // ---- 8) Staff notification ----
    if (ownerId) {
      await supabase.from("notifications").insert({
        workspace_id: workspaceId,
        user_id: ownerId,
        type: "new_lead",
        title: `New webinar lead: ${firstName || email || "Unknown"}`,
        body:
          `New webinar lead: ${firstName || "Unknown"} from ${businessName || "an unnamed business"}. ` +
          `Business type: ${f.business_type || "not given"}. ` +
          `Monthly WhatsApp enquiries: ${f.whatsapp_enquiry_volume || "not given"}. ` +
          `Phone: ${input.phone || "not given"}. Email: ${email || "not given"}.`,
        meta: {
          lead_id: leadId,
          contact_id: contactId,
          deal_id: result.deal_id,
          band: seg.band,
          repeat: result.repeat,
        },
      });
    }

    // High-volume registrants get a priority follow-up task straight away.
    if (contactId && (seg.band === "high" || seg.band === "urgent")) {
      await supabase.from("crm_tasks").insert({
        workspace_id: workspaceId,
        created_by: ownerId,
        assigned_to: ownerId,
        title: `Priority webinar lead — ${firstName || email || "new registrant"}`,
        description:
          `Monthly WhatsApp enquiries: ${f.whatsapp_enquiry_volume || "not given"}. ` +
          `Business: ${businessName || "not given"}.`,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: seg.priority === "urgent" ? "high" : seg.priority,
        task_type: "call",
        contact_id: contactId,
        deal_id: result.deal_id,
        lead_id: leadId,
        dedupe_key: `webinar-priority:${contactId}`,
      });
    }
  } catch (e) {
    console.error("[webinar] intake failed:", String(e));
  }

  return result;
}
