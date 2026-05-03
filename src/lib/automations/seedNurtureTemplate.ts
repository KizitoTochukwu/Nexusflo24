/**
 * Pre-built "New Subscriber Nurture" automation for Nexusflo24.
 * Multi-channel (Email + WhatsApp + SMS) with TRUE YES/NO branching
 * via `branch_yes_start` / `branch_no_start` markers.
 *
 * The execute-automation engine forks on the most recent condition's
 * `passed` result: only one branch runs; the other is skipped.
 * Inserted as a draft — user reviews copy, then activates.
 */
import type { ExitCriterion } from "./exitCriteria";

export const NURTURE_TEMPLATE_NAME = "New Subscriber Nurture (Email + WhatsApp + SMS)";

export type SeedStep = {
  step_type:
    | "action"
    | "condition"
    | "delay"
    | "branch_yes_start"
    | "branch_yes_end"
    | "branch_no_start"
    | "branch_no_end";
  config: Record<string, unknown>;
};

const EMAIL_WELCOME_BODY = `Hi {{first_name}},

Welcome to Nexusflo24 — we're thrilled to have you on board.

Nexusflo24 helps creators, coaches and small businesses automate their marketing across Email, WhatsApp and SMS — all from one dashboard, powered by AI.

Here's what to do next:
1. Capture your first lead with a Funnel or Form
2. Let our AI write your first follow-up sequence
3. Watch conversions roll in on your Analytics dashboard

Need help getting set up? Just reply to this email — we're here.

— The Nexusflo24 team`;

const EMAIL_TIPS_BODY = `Hi {{first_name}},

Quick one — here are 3 ways our top users are using Nexusflo24 right now:

🚀 Auto-nurture every new lead via Email + WhatsApp fallback
🎯 Trigger AI Sales Closer on high-intent behaviour (pricing visits, link clicks)
📊 Track end-to-end conversion in real time — no spreadsheets

Want a 1:1 walkthrough? Book a slot here: https://nexusflo24.com/book

— Team Nexusflo24`;

const EMAIL_OFFER_BODY = `Hi {{first_name}},

Quick heads-up — for the next 48 hours we're offering 20% off your first month of Nexusflo24.

Use code: WELCOME20 at checkout.

This is the best time to lock in:
✅ Unlimited automations
✅ AI Sales Closer
✅ Multi-channel campaigns
✅ Priority support

Grab it here → https://nexusflo24.com/pricing

— Team Nexusflo24`;

const EMAIL_BREAKUP_BODY = `Hi {{first_name}},

We haven't heard from you in a while, so we'll stop emailing for now.

If Nexusflo24 isn't the right fit, no hard feelings — but if you ever want to automate your marketing properly, we'll be here.

→ https://nexusflo24.com

— Team Nexusflo24`;

export const SUBSCRIBER_NURTURE_STEPS: SeedStep[] = [
  // 1. Welcome score bump
  { step_type: "action", config: { action: "adjust_score", score_delta: 5 } },

  // 2. Welcome email
  { step_type: "action", config: { action: "send_email", subject: "Welcome to Nexusflo24 — let's automate your growth 🚀", body: EMAIL_WELCOME_BODY } },

  // 3. Welcome WhatsApp
  { step_type: "action", config: { action: "send_whatsapp", message: "Hey {{first_name}}, welcome to Nexusflo24 👋\n\nWe just sent you a welcome email with everything you need to get started. Anything we can help with?" } },

  // 4. Wait 1 day
  { step_type: "delay", config: { duration: 1, unit: "days" } },

  // 5. Did they open the welcome email?
  { step_type: "condition", config: { condition: "email_opened", operator: "happened", time_window_days: 1 } },

  // 6. YES → engaged path
  { step_type: "branch_yes_start", config: { label: "Opened welcome email" } },
  { step_type: "action", config: { action: "adjust_score", score_delta: 10 } },
  { step_type: "action", config: { action: "add_tag", tag: "engaged" } },
  { step_type: "branch_yes_end", config: {} },

  // 7. NO → SMS fallback nudge
  { step_type: "branch_no_start", config: { label: "Didn't open welcome email" } },
  { step_type: "action", config: { action: "send_sms", message: "Hi {{first_name}}, did our Nexusflo24 welcome email land? Reply YES if you'd like a quick onboarding call." } },
  { step_type: "branch_no_end", config: {} },

  // 8. Wait 2 days
  { step_type: "delay", config: { duration: 2, unit: "days" } },

  // 9. Educational email (sent to everyone)
  { step_type: "action", config: { action: "send_email", subject: "3 ways creators are 2× their conversions with Nexusflo24", body: EMAIL_TIPS_BODY } },

  // 10. Wait 2 days
  { step_type: "delay", config: { duration: 2, unit: "days" } },

  // 11. Did they click a link?
  { step_type: "condition", config: { condition: "link_clicked", operator: "happened", time_window_days: 4 } },

  // 12. YES → high intent → hand off to AI Sales Closer
  { step_type: "branch_yes_start", config: { label: "High intent — clicked link" } },
  { step_type: "action", config: { action: "adjust_score", score_delta: 30 } },
  { step_type: "action", config: { action: "update_status", new_status: "Hot" } },
  { step_type: "action", config: { action: "add_tag", tag: "ai-closer-handoff" } },
  { step_type: "action", config: { action: "notify_sales", title: "🔥 Hot lead clicked through", message: "{{first_name}} {{last_name}} clicked a link — they're high intent. Reach out now." } },
  { step_type: "branch_yes_end", config: {} },

  // 13. NO → keep nurturing (no extra action — main flow continues)
  { step_type: "branch_no_start", config: { label: "Not yet engaged — keep nurturing" } },
  { step_type: "action", config: { action: "adjust_score", score_delta: 2 } },
  { step_type: "branch_no_end", config: {} },

  // 14. Wait 2 days
  { step_type: "delay", config: { duration: 2, unit: "days" } },

  // 15. Offer email
  { step_type: "action", config: { action: "send_email", subject: "🎁 20% off your first month — 48 hours only", body: EMAIL_OFFER_BODY } },

  // 16. Wait 2 days
  { step_type: "delay", config: { duration: 2, unit: "days" } },

  // 17. WhatsApp nudge on offer
  { step_type: "action", config: { action: "send_whatsapp", message: "Quick nudge {{first_name}} — your 20% off Nexusflo24 code (WELCOME20) is about to expire. Want me to apply it for you?" } },

  // 18. Wait 2 days
  { step_type: "delay", config: { duration: 2, unit: "days" } },

  // 19. Final fork: warm or cold?
  { step_type: "condition", config: { condition: "score_gt", operator: "greater_than", value: 40 } },

  // 20. YES → warm → notify sales for personal touch
  { step_type: "branch_yes_start", config: { label: "Warm — worth a call" } },
  { step_type: "action", config: { action: "notify_sales", title: "Warm lead worth a call", message: "{{first_name}} engaged through the nurture sequence. Score is now {{score}}. Worth a personal touch." } },
  { step_type: "branch_yes_end", config: {} },

  // 21. NO → cold → break-up email + cool-off
  { step_type: "branch_no_start", config: { label: "Cold — break up politely" } },
  { step_type: "action", config: { action: "send_email", subject: "Should we say goodbye, {{first_name}}?", body: EMAIL_BREAKUP_BODY } },
  { step_type: "action", config: { action: "adjust_score", score_delta: -10 } },
  { step_type: "action", config: { action: "add_tag", tag: "cold" } },
  { step_type: "branch_no_end", config: {} },
];

export const SUBSCRIBER_NURTURE_EXIT_CRITERIA: ExitCriterion[] = [
  { type: "purchase_happened" },
  { type: "unsubscribed" },
  { type: "tag_added", tag: "do-not-contact" },
];

export const SUBSCRIBER_NURTURE_DEFINITION = {
  name: NURTURE_TEMPLATE_NAME,
  description:
    "Multi-channel nurture for new Nexusflo24 subscribers with TRUE YES/NO branching: welcomes, educates, forks on engagement, hands hot leads to sales, and politely breaks up with cold ones.",
  trigger_type: "lead_added_to_folder",
  trigger_config: {} as Record<string, unknown>,
  exit_criteria: SUBSCRIBER_NURTURE_EXIT_CRITERIA,
  steps: SUBSCRIBER_NURTURE_STEPS,
};
