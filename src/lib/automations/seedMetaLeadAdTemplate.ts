/**
 * Pre-built "Facebook Lead Ad → Instant Follow-up" automation for Nexusflo24.
 *
 * Fires on the `meta-lead-ad` tag, which the meta-webhook adds to every lead
 * captured from a Facebook Lead Ad form (see supabase/functions/meta-webhook).
 *
 * Flow:
 *   1. Instant email acknowledgement
 *   2. Wait 3 min
 *   3. WhatsApp follow-up (auto-falls back to SMS if 24h window closed)
 *   4. Tag as "new-lead" + notify assigned salesperson
 *   5. Wait 24h
 *   6. Condition: appointment booked?
 *        ├ Yes → send confirmation email
 *        └ No  → send booking reminder email
 */
import type { ExitCriterion } from "./exitCriteria";
import type { SeedStep } from "./seedNurtureTemplate";

export const META_LEAD_AD_TEMPLATE_NAME = "Facebook Lead Ad → Instant Follow-up";

const EMAIL_ACK_BODY = `Hi {{first_name}},

Thanks for your interest — we just received your details from our Facebook ad and wanted to say hello personally.

A member of our team will be in touch shortly. In the meantime, if you'd like to book a quick chat straight away, grab a slot here: https://nexusflo24.com/book

Talk soon,
— The Nexusflo24 team`;

const WHATSAPP_FOLLOW_UP = `Hey {{first_name}} 👋 It's Nexusflo24 — thanks for filling in our Facebook form. Is now a good time for a quick chat, or would you rather I email you a few options?`;

const EMAIL_REMINDER_BODY = `Hi {{first_name}},

Just a friendly nudge — we noticed you haven't booked a call yet. If you'd still like to chat about how Nexusflo24 can help, pick any slot that works for you here:

👉 https://nexusflo24.com/book

If timing isn't right, no worries — reply to this email and we'll pause follow-ups.

— The Nexusflo24 team`;

const EMAIL_CONFIRM_BODY = `Hi {{first_name}},

Your appointment is confirmed 🎉 — we're looking forward to speaking with you.

You'll receive a calendar invite shortly with the exact time and joining link. If anything changes on your end, just reply to this email and we'll rearrange.

— The Nexusflo24 team`;

export const META_LEAD_AD_STEPS: SeedStep[] = [
  // 1. Instant acknowledgement email
  { step_type: "action", config: { action: "send_email", subject: "Thanks {{first_name}} — we got your details 👋", body: EMAIL_ACK_BODY } },

  // 2. Short wait so the WhatsApp doesn't land at the exact same second
  { step_type: "delay", config: { duration: 3, unit: "minutes" } },

  // 3. WhatsApp follow-up (executor falls back to SMS if the 24h window is closed)
  { step_type: "action", config: { action: "send_whatsapp", message: WHATSAPP_FOLLOW_UP } },

  // 4. Tag + assign + notify sales
  { step_type: "action", config: { action: "add_tag", tag: "new-lead" } },
  { step_type: "action", config: { action: "assign_owner", strategy: "round_robin" } },
  { step_type: "action", config: { action: "notify_sales", title: "New Facebook Lead Ad", message: "{{first_name}} {{last_name}} just came in from a Facebook Lead Ad — say hello while it's hot." } },

  // 5. Wait 24 hours
  { step_type: "delay", config: { duration: 24, unit: "hours" } },

  // 6. Did they book an appointment?
  { step_type: "condition", config: { condition: "appointment_booked", operator: "happened", time_window_days: 1 } },

  // 6a. YES → send confirmation email
  { step_type: "branch_yes_start", config: { label: "Appointment booked" } },
  { step_type: "action", config: { action: "send_email", subject: "Your appointment is confirmed ✅", body: EMAIL_CONFIRM_BODY } },
  { step_type: "action", config: { action: "add_tag", tag: "booked" } },
  { step_type: "branch_yes_end", config: {} },

  // 6b. NO → send booking reminder
  { step_type: "branch_no_start", config: { label: "No appointment yet — send reminder" } },
  { step_type: "action", config: { action: "send_email", subject: "Still want to chat, {{first_name}}?", body: EMAIL_REMINDER_BODY } },
  { step_type: "action", config: { action: "send_whatsapp", message: "Hi {{first_name}} — quick reminder you can grab a slot with us here: https://nexusflo24.com/book" } },
  { step_type: "branch_no_end", config: {} },
];

export const META_LEAD_AD_EXIT_CRITERIA: ExitCriterion[] = [
  { type: "purchase_happened" },
  { type: "unsubscribed" },
  { type: "tag_added", tag: "do-not-contact" },
];

export const META_LEAD_AD_DEFINITION = {
  name: META_LEAD_AD_TEMPLATE_NAME,
  description:
    "Auto-follows up on every Facebook Lead Ad submission with an instant email, a WhatsApp/SMS nudge, sales assignment, and a 24h booking check with confirmation or reminder.",
  trigger_type: "lead_tagged",
  trigger_config: { tag: "meta-lead-ad" } as Record<string, unknown>,
  exit_criteria: META_LEAD_AD_EXIT_CRITERIA,
  steps: META_LEAD_AD_STEPS,
};
