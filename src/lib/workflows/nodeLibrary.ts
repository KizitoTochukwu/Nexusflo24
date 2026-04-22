// Node palette catalog — what shows up in the left sidebar.
import {
  Zap, MailPlus, MessageSquare, Phone, Clock, TagIcon, UserPlus, Target,
  GitBranch, AlertCircle, CheckCircle2, ArrowRightCircle, BellRing, Webhook,
  StopCircle, FileText, Award, TrendingUp, TrendingDown, FolderInput, ListChecks,
  CalendarCheck, ShoppingCart, MousePointerClick, MailOpen, Users2,
  Database, Mail, Globe, Workflow as WorkflowIcon, Sparkles,
} from "lucide-react";

/**
 * HubSpot-style category groupings for the left picker.
 * Maps to a colored circular icon in the picker UI.
 */
export type NodeCategory =
  | "data"          // 🟢 emerald — Data values: lead/score/property triggers
  | "comms"         // 🟠 orange  — Emails, calls & communication
  | "web"           // 🟣 violet  — Websites & media
  | "automation"    // 🔵 blue    — Automations triggered
  | "custom"        // 🟡 amber   — Custom & external events
  | "messaging"     // gold       — Send actions
  | "crm"           // navy       — CRM updates
  | "scoring"       // emerald    — Score actions
  | "logic"         // violet     — If/branch
  | "flow";         // muted      — Merge / End / Stop

export interface CategoryMeta {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind classes for the circular badge in the picker */
  badgeClass: string;
  /** Tailwind classes for the small chip on a node card */
  chipClass: string;
}

export const CATEGORY_META: Record<NodeCategory, CategoryMeta> = {
  data: {
    label: "Data values",
    description: "When data is created, changed or meets conditions",
    icon: Database,
    badgeClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    chipClass: "bg-emerald-50 text-emerald-700",
  },
  comms: {
    label: "Emails, calls & communication",
    description: "When information is sent or discussed",
    icon: Mail,
    badgeClass: "bg-orange-100 text-orange-700 ring-orange-200",
    chipClass: "bg-orange-50 text-orange-700",
  },
  web: {
    label: "Websites & media",
    description: "When websites and media are interacted with",
    icon: Globe,
    badgeClass: "bg-violet-100 text-violet-700 ring-violet-200",
    chipClass: "bg-violet-50 text-violet-700",
  },
  automation: {
    label: "Automations triggered",
    description: "When automated steps start or complete",
    icon: WorkflowIcon,
    badgeClass: "bg-sky-100 text-sky-700 ring-sky-200",
    chipClass: "bg-sky-50 text-sky-700",
  },
  custom: {
    label: "Custom events & external events",
    description: "Requires custom configuration",
    icon: Sparkles,
    badgeClass: "bg-amber-100 text-amber-700 ring-amber-200",
    chipClass: "bg-amber-50 text-amber-700",
  },
  messaging: {
    label: "Send a message",
    description: "Email, SMS or WhatsApp delivery",
    icon: MailPlus,
    badgeClass: "bg-accent/15 text-accent ring-accent/30",
    chipClass: "bg-accent/10 text-accent",
  },
  crm: {
    label: "Update CRM",
    description: "Tags, status, lifecycle and ownership",
    icon: ListChecks,
    badgeClass: "bg-primary/10 text-primary ring-primary/20",
    chipClass: "bg-primary/10 text-primary",
  },
  scoring: {
    label: "Score & qualify",
    description: "Adjust lead score",
    icon: TrendingUp,
    badgeClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    chipClass: "bg-emerald-50 text-emerald-700",
  },
  logic: {
    label: "If / then branches",
    description: "Branch the workflow on conditions",
    icon: GitBranch,
    badgeClass: "bg-violet-100 text-violet-700 ring-violet-200",
    chipClass: "bg-violet-50 text-violet-700",
  },
  flow: {
    label: "Flow control",
    description: "Merge, goal, or stop the workflow",
    icon: Award,
    badgeClass: "bg-muted text-muted-foreground ring-border",
    chipClass: "bg-muted text-muted-foreground",
  },
};

export interface PaletteItem {
  kind: "trigger" | "action" | "condition" | "delay" | "merge" | "goal";
  subType: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  /** HubSpot-style category for the left picker */
  category: NodeCategory;
}

export const TRIGGERS: PaletteItem[] = [
  { kind: "trigger", subType: "new_lead", label: "New lead created", description: "Fires when any new lead is added", icon: UserPlus, group: "Lead", category: "data" },
  { kind: "trigger", subType: "lead_added_to_folder", label: "Lead added to folder", description: "When a lead lands in a specific folder", icon: FolderInput, group: "Lead", category: "data" },
  { kind: "trigger", subType: "lead_tagged", label: "Lead tagged (specific tag)", description: "When a specific tag is applied", icon: TagIcon, group: "Lead", category: "data" },
  { kind: "trigger", subType: "tag_added_any", label: "Any tag added", description: "When any tag is added to a lead", icon: TagIcon, group: "Lead", category: "data" },
  { kind: "trigger", subType: "score_threshold", label: "Score threshold reached", description: "When score crosses a number", icon: Award, group: "Lead", category: "data" },
  { kind: "trigger", subType: "email_opened", label: "Email opened", description: "Lead opens any email", icon: MailOpen, group: "Engagement", category: "comms" },
  { kind: "trigger", subType: "email_not_opened", label: "Email NOT opened after X", description: "No open after delay", icon: AlertCircle, group: "Engagement", category: "comms" },
  { kind: "trigger", subType: "link_clicked", label: "Link clicked", description: "Lead clicks a tracked link", icon: MousePointerClick, group: "Engagement", category: "web" },
  { kind: "trigger", subType: "whatsapp_replied", label: "WhatsApp replied", description: "Lead replies on WhatsApp", icon: MessageSquare, group: "Engagement", category: "comms" },
  { kind: "trigger", subType: "sms_replied", label: "SMS replied", description: "Lead replies via SMS", icon: Phone, group: "Engagement", category: "comms" },
  { kind: "trigger", subType: "campaign_completed", label: "Campaign completed", description: "Lead finishes a campaign", icon: CheckCircle2, group: "Campaigns", category: "automation" },
  { kind: "trigger", subType: "form_submitted", label: "Form submitted", description: "Embed form is filled", icon: FileText, group: "Capture", category: "web" },
  { kind: "trigger", subType: "funnel_step_completed", label: "Funnel step completed", description: "Step in a funnel finished", icon: Target, group: "Capture", category: "web" },
  { kind: "trigger", subType: "purchase_event", label: "Purchase event", description: "Lead makes a purchase", icon: ShoppingCart, group: "Sales", category: "data" },
  { kind: "trigger", subType: "appointment_booked", label: "Appointment booked", description: "Booking confirmed", icon: CalendarCheck, group: "Sales", category: "data" },
  { kind: "trigger", subType: "trial_started", label: "Trial started", description: "Free trial begins", icon: Zap, group: "Lifecycle", category: "automation" },
  { kind: "trigger", subType: "trial_ending_soon", label: "Trial ending soon", description: "Trial about to expire", icon: AlertCircle, group: "Lifecycle", category: "automation" },
  { kind: "trigger", subType: "subscription_cancelled", label: "Subscription cancelled", description: "User cancels subscription", icon: StopCircle, group: "Lifecycle", category: "automation" },
];

export const ACTIONS: PaletteItem[] = [
  { kind: "action", subType: "send_email", label: "Send Email", description: "Send templated email", icon: MailPlus, group: "Messaging", category: "messaging" },
  { kind: "action", subType: "send_sms", label: "Send SMS", description: "Send SMS via Twilio", icon: Phone, group: "Messaging", category: "messaging" },
  { kind: "action", subType: "send_whatsapp", label: "Send WhatsApp", description: "Send WhatsApp message", icon: MessageSquare, group: "Messaging", category: "messaging" },
  { kind: "delay", subType: "wait_delay", label: "Wait / Delay", description: "Pause for time period", icon: Clock, group: "Timing", category: "flow" },
  { kind: "action", subType: "add_tag", label: "Add tag", description: "Tag this lead", icon: TagIcon, group: "CRM", category: "crm" },
  { kind: "action", subType: "remove_tag", label: "Remove tag", description: "Remove a tag", icon: TagIcon, group: "CRM", category: "crm" },
  { kind: "action", subType: "update_status", label: "Update status", description: "Set lead status", icon: ListChecks, group: "CRM", category: "crm" },
  { kind: "action", subType: "update_lifecycle_stage", label: "Update lifecycle stage", description: "Change lifecycle", icon: ListChecks, group: "CRM", category: "crm" },
  { kind: "action", subType: "update_pipeline_stage", label: "Update pipeline stage", description: "Move pipeline stage", icon: ArrowRightCircle, group: "CRM", category: "crm" },
  { kind: "action", subType: "increase_score", label: "Increase score (+N)", description: "Add to lead score", icon: TrendingUp, group: "Scoring", category: "scoring" },
  { kind: "action", subType: "decrease_score", label: "Decrease score (−N)", description: "Subtract from score", icon: TrendingDown, group: "Scoring", category: "scoring" },
  { kind: "action", subType: "assign_owner", label: "Assign owner", description: "Round-robin or specific", icon: Users2, group: "CRM", category: "crm" },
  { kind: "action", subType: "create_task", label: "Create task", description: "Internal follow-up", icon: ListChecks, group: "Internal", category: "crm" },
  { kind: "action", subType: "move_to_folder", label: "Move to folder", description: "Move lead to folder", icon: FolderInput, group: "CRM", category: "crm" },
  { kind: "action", subType: "add_note", label: "Add note", description: "Internal note on lead", icon: FileText, group: "Internal", category: "crm" },
  { kind: "action", subType: "notify_team", label: "Notify team", description: "In-app + email alert", icon: BellRing, group: "Internal", category: "crm" },
  { kind: "action", subType: "webhook", label: "Webhook POST", description: "Send HTTP POST", icon: Webhook, group: "Integration", category: "custom" },
  { kind: "action", subType: "stop_workflow", label: "Stop workflow", description: "Exit lead from flow", icon: StopCircle, group: "Flow", category: "flow" },
];

export const CONDITIONS: PaletteItem[] = [
  { kind: "condition", subType: "if_email_opened", label: "If email opened", description: "Branch on email open", icon: MailOpen, group: "Engagement", category: "logic" },
  { kind: "condition", subType: "if_email_not_opened", label: "If email NOT opened", description: "Branch on no-open", icon: AlertCircle, group: "Engagement", category: "logic" },
  { kind: "condition", subType: "if_link_clicked", label: "If link clicked", description: "Branch on click", icon: MousePointerClick, group: "Engagement", category: "logic" },
  { kind: "condition", subType: "if_link_not_clicked", label: "If link NOT clicked", description: "Branch on no-click", icon: AlertCircle, group: "Engagement", category: "logic" },
  { kind: "condition", subType: "if_whatsapp_replied", label: "If WhatsApp replied", description: "Branch on WhatsApp reply", icon: MessageSquare, group: "Engagement", category: "logic" },
  { kind: "condition", subType: "if_sms_replied", label: "If SMS replied", description: "Branch on SMS reply", icon: Phone, group: "Engagement", category: "logic" },
  { kind: "condition", subType: "if_has_tag", label: "If lead has tag", description: "Match by tag", icon: TagIcon, group: "CRM", category: "logic" },
  { kind: "condition", subType: "if_not_has_tag", label: "If lead does NOT have tag", description: "Tag absent", icon: TagIcon, group: "CRM", category: "logic" },
  { kind: "condition", subType: "if_source_equals", label: "If source equals", description: "Match by source", icon: Target, group: "CRM", category: "logic" },
  { kind: "condition", subType: "if_status_equals", label: "If status equals", description: "Match by status", icon: ListChecks, group: "CRM", category: "logic" },
  { kind: "condition", subType: "if_score_gt", label: "If score >", description: "Branch on score", icon: TrendingUp, group: "Scoring", category: "logic" },
  { kind: "condition", subType: "if_score_lt", label: "If score <", description: "Branch on score", icon: TrendingDown, group: "Scoring", category: "logic" },
  { kind: "condition", subType: "if_purchase_exists", label: "If purchase exists", description: "Has purchased", icon: ShoppingCart, group: "Sales", category: "logic" },
  { kind: "condition", subType: "if_appointment_booked", label: "If appointment booked", description: "Has booking", icon: CalendarCheck, group: "Sales", category: "logic" },
  { kind: "condition", subType: "if_property_matches", label: "If property matches (custom)", description: "AND/OR criteria builder", icon: GitBranch, group: "Custom", category: "logic" },
  { kind: "condition", subType: "if_no_activity", label: "If no activity after X days", description: "Inactivity branch", icon: Clock, group: "Engagement", category: "logic" },
];

export const FLOW_NODES: PaletteItem[] = [
  { kind: "merge", subType: "merge", label: "Merge branches", description: "Rejoin YES/NO arms", icon: GitBranch, group: "Flow", category: "flow" },
  { kind: "goal", subType: "goal", label: "Goal reached", description: "Successful exit", icon: Award, group: "Flow", category: "flow" },
];

export const ALL_PALETTE_ITEMS = [...TRIGGERS, ...ACTIONS, ...CONDITIONS, ...FLOW_NODES];

export function findPaletteItem(subType: string): PaletteItem | undefined {
  return ALL_PALETTE_ITEMS.find((p) => p.subType === subType);
}
