// Cold lead reactivation worker (runs on a schedule).
// 1) Exit sweep: enrolled leads who replied / booked / opted out are stopped
//    immediately; replies alert the owner and create a follow-up task.
// 2) Enrolment: leads with no reply for 14 days are enrolled into every active
//    automation whose trigger_type is "cold_lead_14d".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const TRIGGER = "cold_lead_14d";
const DAY = 86_400_000;
const EXCLUDE_TAGS = ["customer", "unsubscribed", "do-not-contact", "dormant", "reactivated"];
const EXCLUDE_STATUS = ["customer", "won", "dormant", "unsubscribed"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, key);
  const summary = { exited: 0, replied: 0, enrolled: 0, errors: [] as string[] };

  const { data: autos } = await db.from("automations")
    .select("id, workspace_id, user_id, name").eq("status", "active").eq("trigger_type", TRIGGER);

  for (const auto of autos ?? []) {
    try {
      // ---------- 1) Exit sweep ----------
      const { data: enrolLogs } = await db.from("automation_logs")
        .select("lead_id, created_at").eq("automation_id", auto.id)
        .eq("event_type", "reactivation_enrolled")
        .gte("created_at", new Date(Date.now() - 30 * DAY).toISOString());
      const { data: exitLogs } = await db.from("automation_logs")
        .select("lead_id").eq("automation_id", auto.id).like("event_type", "reactivation_exit:%");
      const exited = new Set((exitLogs ?? []).map((l: any) => l.lead_id));

      for (const enr of enrolLogs ?? []) {
        if (!enr.lead_id || exited.has(enr.lead_id)) continue;
        const since = enr.created_at;
        const { data: lead } = await db.from("leads").select("*").eq("id", enr.lead_id).maybeSingle();
        if (!lead) continue;
        const tags = ((lead.tags ?? []) as string[]).map((t) => t.toLowerCase());

        const { data: reply } = await db.from("sales_conversations").select("id, channel, message_body")
          .eq("lead_id", lead.id).eq("direction", "inbound").gte("created_at", since)
          .order("created_at", { ascending: true }).limit(1).maybeSingle();
        const { count: bookings } = await db.from("bookings").select("id", { count: "exact", head: true })
          .eq("workspace_id", auto.workspace_id).eq("lead_id", lead.id).gte("created_at", since);
        const optedOut = lead.sms_opt_out === true || tags.includes("unsubscribed") ||
          tags.includes("do-not-contact") || (lead.email ? await isSuppressed(db, lead.email) : false);

        const reason = reply ? "replied" : (bookings ?? 0) > 0 ? "booked" : optedOut ? "opted_out" : null;
        if (!reason) continue;

        await db.from("scheduled_jobs").update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("automation_id", auto.id).eq("lead_id", lead.id).eq("status", "pending");
        await db.from("automation_logs").insert({
          automation_id: auto.id, workspace_id: auto.workspace_id, lead_id: lead.id,
          event_type: `reactivation_exit:${reason}`, status: "cancelled", details: { reason },
        });
        summary.exited++;

        if (reply) {
          summary.replied++;
          await db.from("leads").update({
            tags: [...new Set([...(lead.tags ?? []), "reactivated"])],
            updated_at: new Date().toISOString(),
          }).eq("id", lead.id);
          const owner = lead.assigned_owner_id || lead.user_id || auto.user_id;
          const name = lead.full_name || lead.email || lead.phone || "A lead";
          if (owner) {
            await db.from("notifications").insert({
              workspace_id: auto.workspace_id, user_id: owner,
              title: `${name} replied to your reactivation follow-up`,
              body: String(reply.message_body ?? "").slice(0, 200) || `Reply received on ${reply.channel}.`,
              type: "reactivation_reply",
              meta: { lead_id: lead.id, automation_id: auto.id, channel: reply.channel },
            });
          }
          const dedupe = `reactivation:${auto.id}:${lead.id}:${since}`;
          const { data: existing } = await db.from("crm_tasks").select("id")
            .eq("workspace_id", auto.workspace_id).eq("dedupe_key", dedupe).maybeSingle();
          if (!existing) {
            await db.from("crm_tasks").insert({
              workspace_id: auto.workspace_id,
              title: `Follow up: ${name} replied to reactivation`,
              description: `Replied via ${reply.channel}. Respond within one working day.`,
              due_date: new Date(Date.now() + DAY).toISOString(),
              priority: "high", status: "open", task_type: "follow_up",
              assigned_to: owner || null, created_by: auto.user_id || null,
              lead_id: lead.id, contact_id: lead.contact_id || null, dedupe_key: dedupe,
            });
          }
        }
      }

      // ---------- 2) Enrolment ----------
      const cutoff = new Date(Date.now() - 14 * DAY).toISOString();
      const { data: candidates } = await db.from("leads").select("*")
        .eq("workspace_id", auto.workspace_id)
        .lte("created_at", cutoff)
        .or(`last_activity_at.is.null,last_activity_at.lte.${cutoff}`)
        .limit(500);
      const everEnrolled = new Set((await allEnrolled(db, auto.id)));
      let enrolledThisRun = 0;

      for (const lead of candidates ?? []) {
        if (enrolledThisRun >= 50) break;
        if (everEnrolled.has(lead.id)) continue;
        const tags = ((lead.tags ?? []) as string[]).map((t) => t.toLowerCase());
        if (tags.some((t) => EXCLUDE_TAGS.includes(t))) continue;
        if (EXCLUDE_STATUS.includes(String(lead.status ?? "").toLowerCase())) continue;
        if (["won", "customer"].includes(String(lead.pipeline_stage ?? ""))) continue;

        // Any reply in the last 14 days → not cold.
        const { count: recentReplies } = await db.from("sales_conversations")
          .select("id", { count: "exact", head: true })
          .eq("lead_id", lead.id).eq("direction", "inbound").gte("created_at", cutoff);
        if ((recentReplies ?? 0) > 0) continue;

        // Already in another sequence.
        const { count: pending } = await db.from("scheduled_jobs")
          .select("id", { count: "exact", head: true }).eq("lead_id", lead.id).eq("status", "pending");
        if ((pending ?? 0) > 0) continue;

        // Contact-level exclusions: customer lifecycle, withdrawn consent.
        let contact: any = null;
        if (lead.contact_id) {
          const { data } = await db.from("contacts")
            .select("id, lifecycle_stage, consent_status, consent_email, consent_whatsapp")
            .eq("id", lead.contact_id).maybeSingle();
          contact = data;
        }
        if (contact && String(contact.lifecycle_stage ?? "").toLowerCase() === "customer") continue;
        if (contact && String(contact.consent_status ?? "") === "withdrawn") continue;

        // Active deals.
        let dealQ = db.from("crm_deals").select("id", { count: "exact", head: true })
          .eq("workspace_id", auto.workspace_id).eq("status", "open");
        dealQ = lead.contact_id
          ? dealQ.or(`lead_id.eq.${lead.id},contact_id.eq.${lead.contact_id}`)
          : dealQ.eq("lead_id", lead.id);
        const { count: openDeals } = await dealQ;
        if ((openDeals ?? 0) > 0) continue;

        // Permitted channel: email first, else WhatsApp.
        const emailOk = !!lead.email && contact?.consent_email !== false && !(await isSuppressed(db, lead.email));
        const waOk = !!lead.phone && lead.sms_opt_out !== true &&
          (!!lead.wa_opt_in_at || contact?.consent_whatsapp === true);
        if (!emailOk && !waOk) continue;
        const channelTag = emailOk ? "reactivation-email" : "reactivation-whatsapp";

        await db.from("leads").update({
          tags: [...new Set([...(lead.tags ?? []).filter((t: string) => !t.startsWith("reactivation-")), channelTag])],
          updated_at: new Date().toISOString(),
        }).eq("id", lead.id);
        await db.from("automation_logs").insert({
          automation_id: auto.id, workspace_id: auto.workspace_id, lead_id: lead.id,
          event_type: "reactivation_enrolled", status: "success", details: { channel: channelTag },
        });
        await fetch(`${url}/functions/v1/execute-automation`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ automation_id: auto.id, workspace_id: auto.workspace_id, lead_id: lead.id }),
        }).catch((e) => summary.errors.push(String(e)));
        enrolledThisRun++;
        summary.enrolled++;
      }
    } catch (e) {
      console.error("[cold-lead-reactivation]", auto.id, e);
      summary.errors.push(`${auto.id}: ${String(e)}`);
    }
  }

  return new Response(JSON.stringify({ ok: true, ...summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function isSuppressed(db: any, email: string) {
  const { data } = await db.from("suppressed_emails").select("email")
    .eq("email", String(email).toLowerCase()).limit(1);
  return !!(data && data.length);
}

async function allEnrolled(db: any, automationId: string): Promise<string[]> {
  const { data } = await db.from("automation_logs").select("lead_id")
    .eq("automation_id", automationId).eq("event_type", "reactivation_enrolled").limit(10000);
  return (data ?? []).map((r: any) => r.lead_id);
}
