// Academy paid-enrolment fulfilment: CRM lead in "Academy Students" folder,
// canonical contact + timeline, and a confirmation email with the class
// booking link. Idempotent: guarded by academy_enrolments columns.
import { upsertCanonicalContact, linkLeadToContact, recordContactTimeline } from "./canonicalContact.ts";

export const ACADEMY_WORKSPACE_ID = "95bc7e99-798e-49ef-a5c3-ab68bbc08950";
export const ACADEMY_OWNER_ID = "afd12255-5ad7-46f9-8588-c51cf1ed1f72";
export const ACADEMY_BOOKING_SLUG = "academy-live-class";
const FOLDER_NAME = "Academy Students";
const SITE = "https://nexusflo24.com";

export function academyBookingUrl(en: { full_name: string; email: string; phone?: string | null }) {
  const q = new URLSearchParams({ name: en.full_name, email: en.email });
  if (en.phone) q.set("phone", en.phone);
  return `${SITE}/book/${ACADEMY_BOOKING_SLUG}?${q.toString()}`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function syncCrm(db: any, en: any) {
  const ws = ACADEMY_WORKSPACE_ID;
  const tags = ["academy-student", "paid-live-class", en.course_slug];
  const amount = `${(en.amount_minor / 100).toFixed(2)} ${en.currency}`;
  const note = `Academy live class: ${en.course_title} (paid ${amount})` +
    (en.business_type ? `\nBusiness: ${en.business_type}` : "") +
    (en.goals ? `\nGoals: ${en.goals}` : "");

  // Lead (dedupe by email within the workspace)
  let leadId: string | null = en.crm_lead_id ?? null;
  if (!leadId) {
    const { data: existing } = await db.from("leads").select("id, tags, notes")
      .eq("workspace_id", ws).ilike("email", en.email).limit(1).maybeSingle();
    if (existing) {
      leadId = existing.id;
      await db.from("leads").update({
        tags: Array.from(new Set([...(existing.tags ?? []), ...tags])),
        notes: [existing.notes, note].filter(Boolean).join("\n\n"),
        phone: en.phone || undefined,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", leadId);
    } else {
      const { data: created, error } = await db.from("leads").insert({
        workspace_id: ws, user_id: ACADEMY_OWNER_ID, full_name: en.full_name, email: en.email,
        phone: en.phone, source: "Academy Live Class", campaign_name: en.course_title,
        status: "won", tags, notes: note,
        attribution: { kind: "academy_enrolment", enrolment_id: en.id, course_slug: en.course_slug },
      }).select("id").single();
      if (error) throw error;
      leadId = created.id;
    }
  }

  // Folder
  let { data: folder } = await db.from("lead_folders").select("id")
    .eq("workspace_id", ws).eq("name", FOLDER_NAME).maybeSingle();
  if (!folder) {
    const { data } = await db.from("lead_folders").insert({
      workspace_id: ws, user_id: ACADEMY_OWNER_ID, name: FOLDER_NAME, color: "#D4AF37",
    }).select("id").single();
    folder = data;
  }
  if (folder && leadId) {
    await db.from("lead_folder_leads").upsert(
      { workspace_id: ws, folder_id: folder.id, lead_id: leadId },
      { onConflict: "folder_id,lead_id", ignoreDuplicates: true },
    );
  }

  // Canonical contact + timeline
  let contactId: string | null = en.crm_contact_id ?? null;
  if (!contactId) {
    contactId = await upsertCanonicalContact(db, {
      workspaceId: ws, email: en.email, phone: en.phone, fullName: en.full_name,
      source: "Academy Live Class", sourceTable: "academy_enrolments", sourceRecordId: String(en.id),
      attribution: { course_slug: en.course_slug },
    });
    if (contactId && leadId) {
      await linkLeadToContact(db, leadId, contactId);
      await recordContactTimeline(db, {
        workspaceId: ws, contactId, activityType: "purchase",
        title: `Paid ${amount} for live class: ${en.course_title}`,
        description: en.goals ?? null, source: "academy", externalEventId: `academy_enrolment:${en.id}`,
        meta: { enrolment_id: en.id, course_slug: en.course_slug },
      });
    }
  }

  await db.from("academy_enrolments").update({ crm_lead_id: leadId, crm_contact_id: contactId }).eq("id", en.id);
}

async function sendConfirmation(db: any, en: any) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { console.warn("[academy] RESEND_API_KEY missing, email skipped"); return; }
  // Claim the send so concurrent verify/webhook calls send only once.
  const { data: claimed } = await db.from("academy_enrolments")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("id", en.id).is("confirmation_sent_at", null).select("id");
  if (!claimed?.length) return;

  const from = Deno.env.get("EMAIL_FROM") || "noreply@nexusflo24.com";
  const url = academyBookingUrl(en);
  const amount = new Intl.NumberFormat("en-GB", { style: "currency", currency: en.currency || "GBP" }).format(en.amount_minor / 100);
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#ffffff;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
  <table width="600" style="max-width:600px;width:100%;" cellpadding="0" cellspacing="0">
  <tr><td style="background:#0B1F3B;padding:24px;border-radius:12px 12px 0 0;text-align:center;color:#ffffff;font-size:20px;font-weight:700;">You're booked in! 🎓</td></tr>
  <tr><td style="background:#f8f9fa;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;color:#374151;font-size:15px;line-height:1.6;">
  <p style="color:#0B1F3B;font-size:16px;">Hi ${esc(en.full_name)},</p>
  <p>Thank you — your payment of <strong>${amount}</strong> for <strong>${esc(en.course_title)}</strong> (NexusFlo24 Academy live class) has been received.</p>
  <p><strong>Next step:</strong> choose the date and time that suits you for your live class.</p>
  <p style="text-align:center;margin:28px 0;"><a href="${url}" style="background:#C9A227;color:#0B1F3B;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;display:inline-block;">Select your live class date &amp; time</a></p>
  <p style="font-size:13px;color:#6b7280;">Once you pick a slot you'll receive a calendar confirmation. Questions? Just reply to this email.</p>
  </td></tr>
  <tr><td style="padding:16px;text-align:center;font-size:12px;color:#9ca3af;">NexusFlo24 Academy · Secure payments via ${en.currency === "NGN" ? "Paystack" : "Stripe"}</td></tr>
  </table></td></tr></table></body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `NexusFlo24 Academy <${from}>`, to: [en.email], subject: `Payment confirmed — book your ${en.course_title} live class`, html }),
  });
  if (!res.ok) {
    console.error("[academy] confirmation email failed", res.status, await res.text());
    await db.from("academy_enrolments").update({ confirmation_sent_at: null }).eq("id", en.id);
  }
}

export async function fulfilAcademyEnrolment(db: any, enrolmentId: string) {
  const { data: en } = await db.from("academy_enrolments").select("*").eq("id", enrolmentId).maybeSingle();
  if (!en || en.status === "pending_payment") return;
  try { await syncCrm(db, en); } catch (e) { console.error("[academy] CRM sync failed", String(e)); }
  try { await sendConfirmation(db, en); } catch (e) { console.error("[academy] email failed", String(e)); }
}
