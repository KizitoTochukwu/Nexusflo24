// Template seed definitions — used both for DB seeding and as a fallback if templates aren't in the DB yet.
import type { WorkflowCanvasJSON } from "./types";

export interface TemplateSeed {
  slug: string;
  name: string;
  category: string;
  description: string;
  is_featured: boolean;
  sort_order: number;
  canvas_json: WorkflowCanvasJSON;
  enrollment_config?: Record<string, unknown>;
}

const pos = (x: number, y: number) => ({ x, y });

// Build helpers
const trigNode = (id: string, subType: string, label: string, x: number, y: number) => ({
  id, type: "trigger" as const, position: pos(x, y),
  data: { kind: "trigger" as const, subType, label, config: {} },
});
const actionNode = (id: string, subType: string, label: string, x: number, y: number, config: Record<string, unknown> = {}) => ({
  id, type: "action" as const, position: pos(x, y),
  data: { kind: "action" as const, subType, label, config },
});
const delayNode = (id: string, label: string, x: number, y: number, duration = 1, unit = "days") => ({
  id, type: "delay" as const, position: pos(x, y),
  data: { kind: "delay" as const, subType: "wait_delay", label, config: { duration, unit } },
});
const condNode = (id: string, subType: string, label: string, x: number, y: number) => ({
  id, type: "condition" as const, position: pos(x, y),
  data: { kind: "condition" as const, subType, label, config: {} },
});
const goalNode = (id: string, label: string, x: number, y: number) => ({
  id, type: "goal" as const, position: pos(x, y),
  data: { kind: "goal" as const, subType: "goal", label, config: {} },
});
const edge = (id: string, source: string, target: string, sourceHandle?: "yes" | "no") => ({
  id, source, target, sourceHandle,
});

// 1. AI Sales System – Master Workflow (the master flow from the brief)
const masterFlow: WorkflowCanvasJSON = {
  nodes: [
    trigNode("t1", "new_lead", "New lead created", 400, 0),
    actionNode("a1", "send_email", "Send welcome email", 400, 120, {
      subject: "Welcome to NexusFlo24, {{first_name|there}}!",
      body: "Hi {{first_name|there}},\n\nThanks for joining. We're excited to help you grow.",
    }),
    delayNode("d1", "Wait 1 day", 400, 240, 1, "days"),
    condNode("c1", "if_email_opened", "If email opened?", 400, 360),
    actionNode("a2", "add_tag", "Tag: engaged", 200, 480, { tag: "engaged" }),
    actionNode("a3", "increase_score", "Score +10", 200, 600, { delta: 10 }),
    actionNode("a4", "send_email", "Send value email", 200, 720, { subject: "Here's something you'll love, {{first_name|there}}", body: "..." }),
    actionNode("a5", "send_email", "Resend with new subject", 600, 480, { subject: "Did you see this, {{first_name|there}}?", body: "..." }),
    delayNode("d2", "Wait 1 day", 400, 840, 1, "days"),
    condNode("c2", "if_link_clicked", "If link clicked?", 400, 960),
    actionNode("a6", "add_tag", "Tag: high-intent", 200, 1080, { tag: "high-intent" }),
    actionNode("a7", "send_whatsapp", "WhatsApp follow-up", 200, 1200, { message: "Hi {{first_name|there}}, quick question..." }),
    actionNode("a8", "send_email", "Send case study", 600, 1080, { subject: "How others got results", body: "..." }),
    delayNode("d3", "Wait 1 day", 400, 1320, 1, "days"),
    actionNode("a9", "send_email", "Sales email with CTA", 400, 1440, { subject: "Ready to take the next step?", body: "..." }),
    condNode("c3", "if_purchase_exists", "If purchase made?", 400, 1560),
    actionNode("a10", "add_tag", "Tag: customer", 200, 1680, { tag: "customer" }),
    actionNode("a11", "update_lifecycle_stage", "Lifecycle: customer", 200, 1800, { stage: "customer" }),
    actionNode("a12", "send_email", "Onboarding email", 200, 1920, { subject: "Welcome aboard!", body: "Let's get you set up." }),
    goalNode("g1", "Goal: Customer", 200, 2040),
    delayNode("d4", "Wait 3 days", 600, 1680, 3, "days"),
    condNode("c4", "if_no_activity", "No engagement?", 600, 1800),
    actionNode("a13", "add_tag", "Tag: re-engagement", 600, 1920, { tag: "re-engagement" }),
    actionNode("a14", "send_email", "Comeback email", 600, 2040, { subject: "We miss you, {{first_name|there}}", body: "..." }),
  ],
  edges: [
    edge("e1", "t1", "a1"),
    edge("e2", "a1", "d1"),
    edge("e3", "d1", "c1"),
    edge("e4", "c1", "a2", "yes"),
    edge("e5", "c1", "a5", "no"),
    edge("e6", "a2", "a3"),
    edge("e7", "a3", "a4"),
    edge("e8", "a4", "d2"),
    edge("e9", "a5", "d2"),
    edge("e10", "d2", "c2"),
    edge("e11", "c2", "a6", "yes"),
    edge("e12", "c2", "a8", "no"),
    edge("e13", "a6", "a7"),
    edge("e14", "a7", "d3"),
    edge("e15", "a8", "d3"),
    edge("e16", "d3", "a9"),
    edge("e17", "a9", "c3"),
    edge("e18", "c3", "a10", "yes"),
    edge("e19", "c3", "d4", "no"),
    edge("e20", "a10", "a11"),
    edge("e21", "a11", "a12"),
    edge("e22", "a12", "g1"),
    edge("e23", "d4", "c4"),
    edge("e24", "c4", "a13", "yes"),
    edge("e25", "a13", "a14"),
  ],
};

// Smaller templates — keep them simple but complete
const welcomeFlow: WorkflowCanvasJSON = {
  nodes: [
    trigNode("t1", "new_lead", "New lead created", 400, 0),
    actionNode("a1", "send_email", "Welcome email", 400, 120, { subject: "Welcome, {{first_name|there}}!", body: "Glad you're here." }),
    delayNode("d1", "Wait 2 days", 400, 240, 2, "days"),
    actionNode("a2", "send_email", "Helpful resources", 400, 360, { subject: "5 quick wins for {{first_name|there}}", body: "Here are some tips." }),
    delayNode("d2", "Wait 3 days", 400, 480, 3, "days"),
    actionNode("a3", "send_email", "Check-in", 400, 600, { subject: "How's it going, {{first_name|there}}?", body: "Need help?" }),
    goalNode("g1", "Onboarded", 400, 720),
  ],
  edges: [
    edge("e1", "t1", "a1"), edge("e2", "a1", "d1"), edge("e3", "d1", "a2"),
    edge("e4", "a2", "d2"), edge("e5", "d2", "a3"), edge("e6", "a3", "g1"),
  ],
};

const leadMagnetFlow: WorkflowCanvasJSON = {
  nodes: [
    trigNode("t1", "form_submitted", "Lead magnet downloaded", 400, 0),
    actionNode("a1", "send_email", "Deliver the magnet", 400, 120, { subject: "Your free guide is here", body: "Download link: ..." }),
    delayNode("d1", "Wait 1 day", 400, 240, 1, "days"),
    actionNode("a2", "send_email", "How to use it", 400, 360, { subject: "Get the most from your guide", body: "..." }),
    delayNode("d2", "Wait 2 days", 400, 480, 2, "days"),
    condNode("c1", "if_email_opened", "If engaged?", 400, 600),
    actionNode("a3", "add_tag", "Tag: nurture-engaged", 200, 720, { tag: "nurture-engaged" }),
    actionNode("a4", "send_email", "Soft pitch", 200, 840, { subject: "Ready to go further?", body: "..." }),
    actionNode("a5", "add_tag", "Tag: cold-lead", 600, 720, { tag: "cold-lead" }),
  ],
  edges: [
    edge("e1", "t1", "a1"), edge("e2", "a1", "d1"), edge("e3", "d1", "a2"),
    edge("e4", "a2", "d2"), edge("e5", "d2", "c1"),
    edge("e6", "c1", "a3", "yes"), edge("e7", "a3", "a4"),
    edge("e8", "c1", "a5", "no"),
  ],
};

const webinarFlow: WorkflowCanvasJSON = {
  nodes: [
    trigNode("t1", "form_submitted", "Webinar registration", 400, 0),
    actionNode("a1", "send_email", "Confirmation", 400, 120, { subject: "You're registered, {{first_name|there}}!", body: "Save the date." }),
    delayNode("d1", "Wait 1 day", 400, 240, 1, "days"),
    actionNode("a2", "send_email", "Reminder", 400, 360, { subject: "Tomorrow: your webinar", body: "..." }),
    delayNode("d2", "Wait 1 day", 400, 480, 1, "days"),
    actionNode("a3", "send_whatsapp", "Final reminder", 400, 600, { message: "Hi {{first_name|there}}, reminder: webinar starts soon!" }),
    delayNode("d3", "Wait 1 day", 400, 720, 1, "days"),
    actionNode("a4", "send_email", "Replay link", 400, 840, { subject: "Did you miss it? Here's the replay", body: "..." }),
  ],
  edges: [
    edge("e1", "t1", "a1"), edge("e2", "a1", "d1"), edge("e3", "d1", "a2"),
    edge("e4", "a2", "d2"), edge("e5", "d2", "a3"),
    edge("e6", "a3", "d3"), edge("e7", "d3", "a4"),
  ],
};

const highIntentFlow: WorkflowCanvasJSON = {
  nodes: [
    trigNode("t1", "score_threshold", "Score ≥ 80", 400, 0),
    actionNode("a1", "notify_team", "Notify sales team", 400, 120, { title: "Hot lead!", message: "{{full_name}} just hit 80." }),
    actionNode("a2", "assign_owner", "Assign owner (round-robin)", 400, 240, { mode: "round_robin" }),
    actionNode("a3", "send_email", "Personal outreach", 400, 360, { subject: "{{first_name|there}}, can we chat?", body: "..." }),
    delayNode("d1", "Wait 1 day", 400, 480, 1, "days"),
    actionNode("a4", "send_whatsapp", "WhatsApp follow-up", 400, 600, { message: "Hi {{first_name|there}}, quick question..." }),
    goalNode("g1", "Goal: Replied / Booked", 400, 720),
  ],
  edges: [
    edge("e1", "t1", "a1"), edge("e2", "a1", "a2"), edge("e3", "a2", "a3"),
    edge("e4", "a3", "d1"), edge("e5", "d1", "a4"), edge("e6", "a4", "g1"),
  ],
};

const trialActivationFlow: WorkflowCanvasJSON = {
  nodes: [
    trigNode("t1", "trial_started", "Trial started", 400, 0),
    actionNode("a1", "send_email", "Day 0 — Get started", 400, 120, { subject: "Welcome to your trial!", body: "..." }),
    delayNode("d1", "Wait 1 day", 400, 240, 1, "days"),
    actionNode("a2", "send_email", "Day 1 — Quick win", 400, 360, { subject: "Try this in 5 minutes", body: "..." }),
    delayNode("d2", "Wait 3 days", 400, 480, 3, "days"),
    actionNode("a3", "send_email", "Day 4 — Feature highlight", 400, 600, { subject: "Did you try this yet?", body: "..." }),
    delayNode("d3", "Wait 3 days", 400, 720, 3, "days"),
    actionNode("a4", "send_email", "Day 7 — Customer story", 400, 840, { subject: "How a customer like you got results", body: "..." }),
  ],
  edges: [
    edge("e1", "t1", "a1"), edge("e2", "a1", "d1"), edge("e3", "d1", "a2"),
    edge("e4", "a2", "d2"), edge("e5", "d2", "a3"),
    edge("e6", "a3", "d3"), edge("e7", "d3", "a4"),
  ],
};

const trialExpiryFlow: WorkflowCanvasJSON = {
  nodes: [
    trigNode("t1", "trial_ending_soon", "Trial ending in 3 days", 400, 0),
    actionNode("a1", "send_email", "3 days left", 400, 120, { subject: "Your trial ends in 3 days", body: "..." }),
    delayNode("d1", "Wait 1 day", 400, 240, 1, "days"),
    actionNode("a2", "send_email", "2 days left + offer", 400, 360, { subject: "20% off if you upgrade today", body: "..." }),
    delayNode("d2", "Wait 1 day", 400, 480, 1, "days"),
    actionNode("a3", "send_whatsapp", "Last chance", 400, 600, { message: "Final day, {{first_name|there}}! Upgrade here: ..." }),
    condNode("c1", "if_purchase_exists", "Upgraded?", 400, 720),
    goalNode("g1", "Converted", 200, 840),
    actionNode("a4", "add_tag", "Tag: expired-trial", 600, 840, { tag: "expired-trial" }),
  ],
  edges: [
    edge("e1", "t1", "a1"), edge("e2", "a1", "d1"), edge("e3", "d1", "a2"),
    edge("e4", "a2", "d2"), edge("e5", "d2", "a3"), edge("e6", "a3", "c1"),
    edge("e7", "c1", "g1", "yes"), edge("e8", "c1", "a4", "no"),
  ],
};

const onboardingFlow: WorkflowCanvasJSON = {
  nodes: [
    trigNode("t1", "purchase_event", "New customer", 400, 0),
    actionNode("a1", "add_tag", "Tag: customer", 400, 120, { tag: "customer" }),
    actionNode("a2", "send_email", "Welcome aboard", 400, 240, { subject: "Welcome, customer!", body: "Let's get started." }),
    delayNode("d1", "Wait 1 day", 400, 360, 1, "days"),
    actionNode("a3", "send_email", "Setup guide", 400, 480, { subject: "Your setup checklist", body: "..." }),
    delayNode("d2", "Wait 3 days", 400, 600, 3, "days"),
    actionNode("a4", "send_email", "Check-in & support", 400, 720, { subject: "Need help?", body: "Our team is here." }),
  ],
  edges: [
    edge("e1", "t1", "a1"), edge("e2", "a1", "a2"), edge("e3", "a2", "d1"),
    edge("e4", "d1", "a3"), edge("e5", "a3", "d2"), edge("e6", "d2", "a4"),
  ],
};

const reEngagementFlow: WorkflowCanvasJSON = {
  nodes: [
    trigNode("t1", "score_threshold", "No activity 30 days", 400, 0),
    actionNode("a1", "send_email", "We miss you", 400, 120, { subject: "We miss you, {{first_name|there}}", body: "..." }),
    delayNode("d1", "Wait 3 days", 400, 240, 3, "days"),
    condNode("c1", "if_email_opened", "Did they re-engage?", 400, 360),
    actionNode("a2", "add_tag", "Tag: re-engaged", 200, 480, { tag: "re-engaged" }),
    actionNode("a3", "decrease_score", "Score −20", 600, 480, { delta: 20 }),
    actionNode("a4", "add_tag", "Tag: cold-lead", 600, 600, { tag: "cold-lead" }),
  ],
  edges: [
    edge("e1", "t1", "a1"), edge("e2", "a1", "d1"), edge("e3", "d1", "c1"),
    edge("e4", "c1", "a2", "yes"),
    edge("e5", "c1", "a3", "no"), edge("e6", "a3", "a4"),
  ],
};

const winBackFlow: WorkflowCanvasJSON = {
  nodes: [
    trigNode("t1", "subscription_cancelled", "Subscription cancelled", 400, 0),
    delayNode("d1", "Wait 7 days", 400, 120, 7, "days"),
    actionNode("a1", "send_email", "Why we'd love you back", 400, 240, { subject: "Come back, {{first_name|there}}?", body: "..." }),
    delayNode("d2", "Wait 7 days", 400, 360, 7, "days"),
    actionNode("a2", "send_email", "Special offer", 400, 480, { subject: "Exclusive: 30% off to come back", body: "..." }),
    delayNode("d3", "Wait 7 days", 400, 600, 7, "days"),
    actionNode("a3", "send_email", "Last attempt", 400, 720, { subject: "We're sorry to see you go", body: "..." }),
  ],
  edges: [
    edge("e1", "t1", "d1"), edge("e2", "d1", "a1"), edge("e3", "a1", "d2"),
    edge("e4", "d2", "a2"), edge("e5", "a2", "d3"), edge("e6", "d3", "a3"),
  ],
};

export const TEMPLATE_SEEDS: TemplateSeed[] = [
  { slug: "ai-sales-master", name: "AI Sales System — Master Workflow", category: "Featured", description: "The complete sales nurture flow with branching, scoring, and re-engagement.", is_featured: true, sort_order: 1, canvas_json: masterFlow },
  { slug: "welcome-new-lead", name: "Welcome New Lead", category: "Onboarding", description: "Greet new leads and introduce your brand over 5 days.", is_featured: false, sort_order: 2, canvas_json: welcomeFlow },
  { slug: "lead-magnet-nurture", name: "Lead Magnet Nurture", category: "Nurture", description: "Deliver a free resource and nurture into a soft pitch.", is_featured: false, sort_order: 3, canvas_json: leadMagnetFlow },
  { slug: "webinar-followup", name: "Webinar Registration Follow-up", category: "Events", description: "Confirm, remind, and replay-deliver for webinar attendees.", is_featured: false, sort_order: 4, canvas_json: webinarFlow },
  { slug: "high-intent-sales", name: "High-Intent Sales Follow-up", category: "Sales", description: "Trigger when score ≥ 80 — alert sales, assign, and outreach.", is_featured: false, sort_order: 5, canvas_json: highIntentFlow },
  { slug: "trial-activation", name: "Free Trial Activation", category: "Trial", description: "Day-by-day onboarding to activate trial users.", is_featured: false, sort_order: 6, canvas_json: trialActivationFlow },
  { slug: "trial-expiry-conversion", name: "Trial Expiry Conversion", category: "Trial", description: "Push to upgrade in the final 3 days of trial.", is_featured: false, sort_order: 7, canvas_json: trialExpiryFlow },
  { slug: "customer-onboarding", name: "Customer Onboarding", category: "Customer", description: "Welcome new customers and help them get set up.", is_featured: false, sort_order: 8, canvas_json: onboardingFlow },
  { slug: "re-engagement", name: "Re-engagement", category: "Retention", description: "Wake up cold leads with a 3-day pulse.", is_featured: false, sort_order: 9, canvas_json: reEngagementFlow },
  { slug: "win-back", name: "Win-back", category: "Retention", description: "Bring back cancelled subscribers over 3 weeks.", is_featured: false, sort_order: 10, canvas_json: winBackFlow },
];
