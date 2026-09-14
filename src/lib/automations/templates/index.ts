/**
 * Automation Template Library — 20 ready-made, editable automations.
 *
 * Every template uses only triggers, actions, conditions and delays the
 * execute-automation engine already supports. Installed templates are created
 * as drafts so the user can review copy before activating.
 */
import type { ExitCriterion } from "../exitCriteria";
import type { SeedStep } from "../seedNurtureTemplate";
import { SUBSCRIBER_NURTURE_DEFINITION } from "../seedNurtureTemplate";
import { META_LEAD_AD_DEFINITION } from "../seedMetaLeadAdTemplate";

export type AutomationTemplateCategory =
  | "Lead follow-up"
  | "Nurture"
  | "Sales"
  | "Booking"
  | "E-commerce"
  | "Re-engagement"
  | "Ads"
  | "Admin";

export type AutomationTemplateDefinition = {
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  exit_criteria: ExitCriterion[];
  steps: SeedStep[];
};

export type AutomationTemplate = AutomationTemplateDefinition & {
  slug: string;
  category: AutomationTemplateCategory;
};

const DEFAULT_EXITS: ExitCriterion[] = [
  { type: "purchase_happened" },
  { type: "unsubscribed" },
  { type: "tag_added", tag: "do-not-contact" },
];

const NO_SELL_EXITS: ExitCriterion[] = [
  { type: "unsubscribed" },
  { type: "tag_added", tag: "do-not-contact" },
];

const email = (subject: string, body: string): SeedStep => ({
  step_type: "action",
  config: { action: "send_email", subject, body },
});
const whatsapp = (message: string): SeedStep => ({
  step_type: "action",
  config: { action: "send_whatsapp", message },
});
const sms = (message: string): SeedStep => ({
  step_type: "action",
  config: { action: "send_sms", message },
});
const wait = (duration: number, unit: "minutes" | "hours" | "days"): SeedStep => ({
  step_type: "delay",
  config: { duration, unit },
});
const tag = (t: string): SeedStep => ({ step_type: "action", config: { action: "add_tag", tag: t } });
const untag = (t: string): SeedStep => ({ step_type: "action", config: { action: "remove_tag", tag: t } });
const score = (delta: number): SeedStep => ({ step_type: "action", config: { action: "adjust_score", score_delta: delta } });
const status = (new_status: string): SeedStep => ({ step_type: "action", config: { action: "update_status", new_status } });
const notify = (title: string, message: string): SeedStep => ({
  step_type: "action",
  config: { action: "notify_sales", title, message },
});
const condition = (config: Record<string, unknown>): SeedStep => ({ step_type: "condition", config });
const yes = (label: string): SeedStep => ({ step_type: "branch_yes_start", config: { label } });
const yesEnd: SeedStep = { step_type: "branch_yes_end", config: {} };
const no = (label: string): SeedStep => ({ step_type: "branch_no_start", config: { label } });
const noEnd: SeedStep = { step_type: "branch_no_end", config: {} };

const SIGN_OFF = "\n\n— The Nexusflo24 team";

const TEMPLATES: AutomationTemplate[] = [
  {
    slug: "new-lead-instant-welcome",
    category: "Lead follow-up",
    name: "New lead — instant welcome (Email + WhatsApp)",
    description: "Greets every new lead within seconds by email and WhatsApp, tags them and scores the first touch.",
    trigger_type: "new_lead",
    trigger_config: {},
    exit_criteria: DEFAULT_EXITS,
    steps: [
      email(
        "Thanks for reaching out, {{first_name}} 👋",
        `Hi {{first_name}},\n\nThanks for getting in touch — we've received your details and someone from the team will be with you shortly.\n\nIn the meantime, reply to this email with what you're hoping to achieve and we'll come prepared.${SIGN_OFF}`,
      ),
      wait(3, "minutes"),
      whatsapp("Hi {{first_name}} 👋 thanks for reaching out. We've just emailed you — anything you'd like to cover first?"),
      tag("new-lead"),
      score(5),
      wait(1, "days"),
      condition({ condition: "email_opened", operator: "not_happened", time_window_days: 1 }),
      yes("No reply yet — nudge by SMS"),
      sms("Hi {{first_name}}, just checking our message reached you. Reply here and we'll help."),
      yesEnd,
      no("Engaged"),
      score(10),
      noEnd,
    ],
  },
  {
    slug: "subscriber-nurture",
    category: "Nurture",
    ...SUBSCRIBER_NURTURE_DEFINITION,
  } as AutomationTemplate,
  {
    slug: "facebook-lead-ad-followup",
    category: "Ads",
    ...META_LEAD_AD_DEFINITION,
  } as AutomationTemplate,
  {
    slug: "form-submission-qualify",
    category: "Lead follow-up",
    name: "Form submission — thank you & qualify",
    description: "Confirms the submission, asks two qualifying questions and routes engaged leads to sales.",
    trigger_type: "form_submitted",
    trigger_config: {},
    exit_criteria: DEFAULT_EXITS,
    steps: [
      email(
        "We've got your details, {{first_name}} ✅",
        `Hi {{first_name}},\n\nThanks for filling in the form — it's landed with us.\n\nSo we can point you in the right direction, could you reply with:\n1. What you're trying to solve\n2. When you'd like it live\n\nWe'll take it from there.${SIGN_OFF}`,
      ),
      tag("form-lead"),
      score(10),
      wait(2, "days"),
      condition({ condition: "email_opened", operator: "happened", time_window_days: 2 }),
      yes("Opened — worth a call"),
      status("Warm"),
      notify("Form lead engaged", "{{first_name}} opened the follow-up email. Good time to reach out."),
      yesEnd,
      no("No open — WhatsApp nudge"),
      whatsapp("Hi {{first_name}}, we received your enquiry. When's a good time for a quick chat?"),
      noEnd,
    ],
  },
  {
    slug: "lead-magnet-delivery",
    category: "Nurture",
    name: "Lead magnet delivery & soft upsell",
    description: "Delivers the download instantly, checks engagement and follows up with an offer for readers.",
    trigger_type: "lead_tagged",
    trigger_config: { tag: "lead-magnet" },
    exit_criteria: DEFAULT_EXITS,
    steps: [
      email(
        "Here's your download, {{first_name}} 📘",
        `Hi {{first_name}},\n\nAs promised, here's your download — enjoy.\n\nIf you get stuck on anything inside, just reply and we'll help.${SIGN_OFF}`,
      ),
      wait(2, "days"),
      email(
        "Did you get a chance to read it?",
        `Hi {{first_name}},\n\nQuick one — did the guide land okay?\n\nMost people tell us the section on follow-up is the part that changes the most for them. If you'd like help applying it to your own business, just reply.${SIGN_OFF}`,
      ),
      wait(3, "days"),
      condition({ condition: "link_clicked", operator: "happened", time_window_days: 5 }),
      yes("Clicked — show the offer"),
      score(20),
      email(
        "Want us to set this up for you?",
        `Hi {{first_name}},\n\nSince the guide was useful, here's the shortcut: we can set the whole thing up with you in one session.\n\nReply "SETUP" and we'll send over the details.${SIGN_OFF}`,
      ),
      yesEnd,
      no("Keep nurturing"),
      score(2),
      noEnd,
    ],
  },
  {
    slug: "webinar-reminders",
    category: "Nurture",
    name: "Webinar registration — reminders & replay",
    description: "Confirms the seat, reminds 24 hours and 1 hour before, then follows up with the replay.",
    trigger_type: "lead_tagged",
    trigger_config: { tag: "webinar" },
    exit_criteria: NO_SELL_EXITS,
    steps: [
      email(
        "You're in — here are your webinar details 🎟️",
        `Hi {{first_name}},\n\nYour seat is confirmed. We'll email the joining link again shortly before we start.\n\nBring your questions — we answer live.${SIGN_OFF}`,
      ),
      wait(1, "days"),
      email(
        "Tomorrow: your webinar seat",
        `Hi {{first_name}},\n\nWe're live tomorrow. Add it to your calendar now so it doesn't slip.\n\nSee you there.${SIGN_OFF}`,
      ),
      wait(1, "days"),
      whatsapp("Hi {{first_name}} — we're going live in about an hour. See you inside 👋"),
      wait(1, "days"),
      email(
        "The replay is ready",
        `Hi {{first_name}},\n\nHere's the replay in case you missed anything.\n\nIf you'd like help putting it into practice, reply and we'll set up a call.${SIGN_OFF}`,
      ),
      score(10),
    ],
  },
  {
    slug: "appointment-confirm-remind",
    category: "Booking",
    name: "Appointment booked — confirm & remind",
    description: "Sends a confirmation, a day-before reminder and an hour-before WhatsApp nudge.",
    trigger_type: "book_appointment",
    trigger_config: {},
    exit_criteria: NO_SELL_EXITS,
    steps: [
      email(
        "Your appointment is confirmed ✅",
        `Hi {{first_name}},\n\nYour appointment is confirmed. You'll find the date, time and joining details in your booking confirmation.\n\nNeed to move it? Just reply.${SIGN_OFF}`,
      ),
      status("Qualified"),
      score(20),
      wait(1, "days"),
      whatsapp("Hi {{first_name}}, looking forward to speaking with you. Anything you'd like us to prepare?"),
      wait(1, "days"),
      sms("Reminder: your appointment with us is coming up shortly. See you soon!"),
    ],
  },
  {
    slug: "no-show-recovery",
    category: "Booking",
    name: "No-show recovery & rebook",
    description: "Reaches out politely after a missed appointment and offers an easy way to rebook.",
    trigger_type: "lead_tagged",
    trigger_config: { tag: "no-show" },
    exit_criteria: [{ type: "appointment_booked" }, ...NO_SELL_EXITS],
    steps: [
      email(
        "Sorry we missed you, {{first_name}}",
        `Hi {{first_name}},\n\nWe were on the call but didn't manage to connect — these things happen.\n\nReply with a couple of times that suit you this week and we'll get it back in the diary.${SIGN_OFF}`,
      ),
      wait(1, "days"),
      whatsapp("Hi {{first_name}}, shall we rebook? Send me a day and time that works and I'll sort it."),
      wait(3, "days"),
      condition({ condition: "appointment_booked", operator: "not_happened", time_window_days: 4 }),
      yes("Still not rebooked"),
      email(
        "Shall we try again another time?",
        `Hi {{first_name}},\n\nNo pressure at all — if now isn't the right time, just say and we'll check back later in the year.${SIGN_OFF}`,
      ),
      score(-5),
      yesEnd,
      no("Rebooked"),
      score(15),
      noEnd,
    ],
  },
  {
    slug: "hot-lead-alert",
    category: "Sales",
    name: "Hot lead alert — score threshold",
    description: "When a lead's score crosses your threshold, marks them Hot and alerts the sales team instantly.",
    trigger_type: "score_threshold",
    trigger_config: { threshold: 50 },
    exit_criteria: [{ type: "purchase_happened" }],
    steps: [
      status("Hot"),
      tag("hot-lead"),
      notify("🔥 Hot lead", "{{first_name}} {{last_name}} has crossed your score threshold. Reach out now."),
      whatsapp("Hi {{first_name}}, it looks like you're weighing things up — happy to answer anything directly. What's on your mind?"),
      wait(1, "days"),
      condition({ condition: "whatsapp_replied", operator: "not_happened", time_window_days: 1 }),
      yes("No reply — try email"),
      email(
        "Anything I can help with, {{first_name}}?",
        `Hi {{first_name}},\n\nI noticed you've been looking around. If it's useful, I can put together a short walkthrough for your situation — just reply with what you're trying to achieve.${SIGN_OFF}`,
      ),
      yesEnd,
      no("Replied — sales takes over"),
      notify("Hot lead replied", "{{first_name}} replied on WhatsApp — pick up the conversation."),
      noEnd,
    ],
  },
  {
    slug: "proposal-followup",
    category: "Sales",
    name: "Quote / proposal follow-up chase",
    description: "Chases an outstanding proposal over a week with email, WhatsApp and a final decision nudge.",
    trigger_type: "lead_tagged",
    trigger_config: { tag: "proposal-sent" },
    exit_criteria: DEFAULT_EXITS,
    steps: [
      wait(2, "days"),
      email(
        "Any questions on the proposal?",
        `Hi {{first_name}},\n\nJust checking the proposal reached you okay.\n\nHappy to walk through anything or adjust the scope — what would make it an easy yes?${SIGN_OFF}`,
      ),
      wait(3, "days"),
      whatsapp("Hi {{first_name}}, any thoughts on the proposal? Happy to tweak it if something isn't quite right."),
      wait(3, "days"),
      condition({ condition: "email_opened", operator: "happened", time_window_days: 5 }),
      yes("Reading it — push for a decision"),
      notify("Proposal being reviewed", "{{first_name}} is opening the proposal emails. Time for a call."),
      yesEnd,
      no("Silent — final nudge"),
      email(
        "Shall I close this off?",
        `Hi {{first_name}},\n\nI don't want to keep chasing — shall I park the proposal for now, or is it still live?\n\nEither answer is completely fine.${SIGN_OFF}`,
      ),
      noEnd,
    ],
  },
  {
    slug: "abandoned-checkout",
    category: "E-commerce",
    name: "Abandoned checkout recovery",
    description: "Wins back shoppers who reached checkout but didn't buy, with a reminder and a time-limited offer.",
    trigger_type: "lead_tagged",
    trigger_config: { tag: "cart-abandoner" },
    exit_criteria: [{ type: "purchase_happened" }, { type: "unsubscribed" }],
    steps: [
      wait(1, "hours"),
      email(
        "You left something behind 🛒",
        `Hi {{first_name}},\n\nYour order is still waiting — we've saved it for you.\n\nIf anything stopped you at checkout, reply and we'll sort it.${SIGN_OFF}`,
      ),
      wait(1, "days"),
      whatsapp("Hi {{first_name}}, your order is still saved. Want me to hold it for you?"),
      wait(1, "days"),
      email(
        "10% off to finish your order",
        `Hi {{first_name}},\n\nHere's 10% off to help you decide — use code SAVE10 at checkout. It's valid for 48 hours.${SIGN_OFF}`,
      ),
      wait(2, "days"),
      condition({ condition: "purchase_happened", operator: "not_happened", time_window_days: 4 }),
      yes("Still no order"),
      untag("cart-abandoner"),
      tag("cold-cart"),
      yesEnd,
      no("Purchased"),
      status("Won"),
      noEnd,
    ],
  },
  {
    slug: "customer-onboarding",
    category: "E-commerce",
    name: "New customer onboarding",
    description: "Welcomes new customers, sets expectations and checks in during the first week.",
    trigger_type: "purchase_event",
    trigger_config: {},
    exit_criteria: [{ type: "unsubscribed" }],
    steps: [
      tag("customer"),
      status("Won"),
      email(
        "Welcome aboard, {{first_name}} 🎉",
        `Hi {{first_name}},\n\nThank you — you're all set.\n\nHere's what happens next:\n1. We'll confirm your details\n2. You'll get your access information\n3. We check in after a few days to make sure it's working for you\n\nAny questions, just reply.${SIGN_OFF}`,
      ),
      wait(2, "days"),
      whatsapp("Hi {{first_name}}, how are you getting on so far? Anything I can help set up?"),
      wait(5, "days"),
      email(
        "One week in — how's it going?",
        `Hi {{first_name}},\n\nYou're a week in. Is everything doing what you hoped?\n\nIf there's anything missing, tell us and we'll fix it.${SIGN_OFF}`,
      ),
    ],
  },
  {
    slug: "review-and-referral",
    category: "E-commerce",
    name: "Post-purchase review & referral request",
    description: "Asks happy customers for a review, then invites them to refer a friend.",
    trigger_type: "purchase_event",
    trigger_config: {},
    exit_criteria: [{ type: "unsubscribed" }, { type: "tag_added", tag: "do-not-contact" }],
    steps: [
      wait(7, "days"),
      email(
        "Would you leave us a quick review?",
        `Hi {{first_name}},\n\nIf we've done a good job, a short review makes a real difference to a small team like ours.\n\nIt takes about a minute — and if anything wasn't right, reply here instead and we'll put it right first.${SIGN_OFF}`,
      ),
      wait(4, "days"),
      whatsapp("Hi {{first_name}}, thanks again for your order. Know anyone who'd find us useful? We look after referrals properly."),
      tag("advocate"),
      score(10),
    ],
  },
  {
    slug: "cold-lead-winback",
    category: "Re-engagement",
    name: "Cold lead re-engagement win-back",
    description: "Reopens the conversation with quiet leads and cleanly closes the loop if they're not interested.",
    trigger_type: "lead_tagged",
    trigger_config: { tag: "cold" },
    exit_criteria: DEFAULT_EXITS,
    steps: [
      email(
        "Still on your list, {{first_name}}?",
        `Hi {{first_name}},\n\nWe spoke a while ago and things went quiet — completely understandable.\n\nIs this still something you're thinking about, or shall we close the file?${SIGN_OFF}`,
      ),
      wait(3, "days"),
      condition({ condition: "email_opened", operator: "happened", time_window_days: 3 }),
      yes("Still warm"),
      score(15),
      status("Warm"),
      whatsapp("Hi {{first_name}}, good to see you're still around. Want to pick up where we left off?"),
      yesEnd,
      no("Truly cold — close politely"),
      email(
        "Closing the file for now",
        `Hi {{first_name}},\n\nWe'll stop emailing for now. If things change, we're one reply away.${SIGN_OFF}`,
      ),
      tag("dormant"),
      score(-10),
      noEnd,
    ],
  },
  {
    slug: "birthday-goodwill",
    category: "Re-engagement",
    name: "Birthday / anniversary goodwill",
    description: "Sends a warm, no-strings message on a special date to keep the relationship alive.",
    trigger_type: "lead_tagged",
    trigger_config: { tag: "birthday" },
    exit_criteria: [{ type: "unsubscribed" }],
    steps: [
      email(
        "Happy birthday, {{first_name}} 🎂",
        `Hi {{first_name}},\n\nJust a quick note to wish you a great day.\n\nNo pitch, no offer — have a good one.${SIGN_OFF}`,
      ),
      whatsapp("Happy birthday {{first_name}} 🎉 Hope you have a brilliant day."),
      score(5),
    ],
  },
  {
    slug: "newsletter-onboarding",
    category: "Nurture",
    name: "Newsletter subscriber onboarding",
    description: "A gentle three-email introduction for new newsletter subscribers.",
    trigger_type: "lead_added_to_folder",
    trigger_config: {},
    exit_criteria: [{ type: "unsubscribed" }],
    steps: [
      email(
        "Welcome to the newsletter 👋",
        `Hi {{first_name}},\n\nThanks for subscribing. Every week you'll get one practical idea you can actually use — no filler.\n\nReply any time with what you'd like us to cover.${SIGN_OFF}`,
      ),
      wait(3, "days"),
      email(
        "The three things most people get wrong",
        `Hi {{first_name}},\n\nHere's the short version of what we see most often — and how to fix each one.\n\nRead it when you have five quiet minutes.${SIGN_OFF}`,
      ),
      wait(4, "days"),
      email(
        "What would be most useful to you?",
        `Hi {{first_name}},\n\nQuick question: what's the one thing you'd like to get sorted this quarter?\n\nHit reply — we read every answer and it shapes what we write.${SIGN_OFF}`,
      ),
      tag("subscriber"),
    ],
  },
  {
    slug: "trial-to-paid",
    category: "Sales",
    name: "Free trial → paid conversion",
    description: "Guides trial users to first value, then makes the upgrade case before the trial ends.",
    trigger_type: "lead_tagged",
    trigger_config: { tag: "trial" },
    exit_criteria: [{ type: "purchase_happened" }, { type: "unsubscribed" }],
    steps: [
      email(
        "Your trial is live — start here",
        `Hi {{first_name}},\n\nYour trial is active. The fastest path to a result is:\n1. Connect your first channel\n2. Import or capture a handful of leads\n3. Turn on one automation\n\nStuck on any step? Reply and we'll do it with you.${SIGN_OFF}`,
      ),
      wait(3, "days"),
      whatsapp("Hi {{first_name}}, how's the trial going? Want me to walk you through the setup?"),
      wait(4, "days"),
      condition({ condition: "link_clicked", operator: "happened", time_window_days: 7 }),
      yes("Active trial — make the upgrade case"),
      score(25),
      email(
        "Keep everything running after your trial",
        `Hi {{first_name}},\n\nYou've been putting the trial to work — nice.\n\nUpgrading keeps every automation, contact and message history exactly as it is. Reply if you'd like a hand choosing the right plan.${SIGN_OFF}`,
      ),
      notify("Trial user is active", "{{first_name}} is engaging with their trial. Good moment for a conversion call."),
      yesEnd,
      no("Quiet trial — offer help"),
      email(
        "Want a hand getting started?",
        `Hi {{first_name}},\n\nYour trial hasn't had much of a run yet. Would a 15-minute setup session help?\n\nReply "YES" and we'll send over some times.${SIGN_OFF}`,
      ),
      noEnd,
    ],
  },
  {
    slug: "whatsapp-reply-routing",
    category: "Admin",
    name: "WhatsApp reply — fast response routing",
    description: "Anyone who replies on WhatsApp is scored, marked engaged and handed straight to the team.",
    trigger_type: "whatsapp_replied",
    trigger_config: {},
    exit_criteria: [{ type: "purchase_happened" }],
    steps: [
      score(15),
      status("Engaged"),
      tag("replied"),
      notify("New WhatsApp reply", "{{first_name}} just replied on WhatsApp — respond while they're live."),
      wait(1, "days"),
      condition({ condition: "score_gt", operator: "greater_than", value: 40 }),
      yes("High intent"),
      status("Hot"),
      notify("High-intent conversation", "{{first_name}} is scoring high after replying. Worth a call today."),
      yesEnd,
      no("Keep in nurture"),
      score(2),
      noEnd,
    ],
  },
  {
    slug: "roi-calculator-followup",
    category: "Lead follow-up",
    name: "ROI calculator — results follow-up",
    description: "Follows up on a calculator submission with the numbers, a nudge and a booking prompt.",
    trigger_type: "roi_calculator_submitted",
    trigger_config: {},
    exit_criteria: DEFAULT_EXITS,
    steps: [
      email(
        "Your results, {{first_name}} 📊",
        `Hi {{first_name}},\n\nThanks for running the numbers.\n\nThe figures are only half the story — the bigger gain usually comes from what you automate first. Reply and we'll tell you where we'd start in your case.${SIGN_OFF}`,
      ),
      score(20),
      tag("roi-calculator"),
      wait(2, "days"),
      whatsapp("Hi {{first_name}}, did your results look about right? Happy to sanity-check them with you."),
      wait(3, "days"),
      condition({ condition: "appointment_booked", operator: "not_happened", time_window_days: 5 }),
      yes("No meeting yet"),
      email(
        "Want to talk through the numbers?",
        `Hi {{first_name}},\n\nA short call is usually the quickest way to turn those numbers into a plan. Reply with a time that suits and we'll set it up.${SIGN_OFF}`,
      ),
      yesEnd,
      no("Meeting booked"),
      notify("Calculator lead booked", "{{first_name}} booked after using the ROI calculator."),
      noEnd,
    ],
  },
  {
    slug: "vip-white-glove",
    category: "Admin",
    name: "VIP lead — white-glove handling",
    description: "Gives VIP-tagged leads a personal welcome, priority scoring and an immediate team alert.",
    trigger_type: "lead_tagged",
    trigger_config: { tag: "vip" },
    exit_criteria: [{ type: "purchase_happened" }, { type: "unsubscribed" }],
    steps: [
      score(30),
      status("Hot"),
      notify("VIP lead added", "{{first_name}} {{last_name}} has been tagged VIP. Personal outreach within the hour, please."),
      email(
        "A personal note, {{first_name}}",
        `Hi {{first_name}},\n\nI wanted to reach out personally rather than send you anything automated-looking.\n\nTell me what you're trying to achieve and I'll make sure the right person on our side handles it.${SIGN_OFF}`,
      ),
      wait(1, "days"),
      whatsapp("Hi {{first_name}}, just making sure my note reached you. I'm your direct contact — anything you need, ask me."),
    ],
  },
  {
    slug: "referral-thank-you",
    category: "Re-engagement",
    name: "Referral received — thank & reward",
    description: "Thanks anyone who sends a referral and keeps them warm as an advocate.",
    trigger_type: "lead_tagged",
    trigger_config: { tag: "referral" },
    exit_criteria: [{ type: "unsubscribed" }],
    steps: [
      email(
        "Thank you for the referral 🙏",
        `Hi {{first_name}},\n\nA referral is the biggest compliment we can get — thank you.\n\nWe'll look after them properly, and we've noted your reward on your account.${SIGN_OFF}`,
      ),
      tag("advocate"),
      score(25),
      wait(14, "days"),
      whatsapp("Hi {{first_name}}, thanks again for the introduction. Anyone else you think we could help?"),
    ],
  },
];

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = TEMPLATES;

export const AUTOMATION_TEMPLATE_CATEGORIES: AutomationTemplateCategory[] = [
  "Lead follow-up",
  "Nurture",
  "Sales",
  "Booking",
  "E-commerce",
  "Re-engagement",
  "Ads",
  "Admin",
];

export function templateChannels(t: AutomationTemplate): string[] {
  const set = new Set<string>();
  for (const s of t.steps) {
    const action = (s.config as { action?: string }).action;
    if (action === "send_email") set.add("Email");
    if (action === "send_whatsapp") set.add("WhatsApp");
    if (action === "send_sms") set.add("SMS");
  }
  return [...set];
}

export function templateStepCount(t: AutomationTemplate): number {
  return t.steps.filter((s) => !s.step_type.startsWith("branch_")).length;
}

export function toDefinition(t: AutomationTemplate): AutomationTemplateDefinition {
  const { slug: _slug, category: _category, ...def } = t;
  return def;
}
