// Node palette catalog — what shows up in the left sidebar.
import {
  Zap, MailPlus, MessageSquare, Phone, Clock, TagIcon, UserPlus, Target,
  GitBranch, AlertCircle, CheckCircle2, ArrowRightCircle, BellRing, Webhook,
  StopCircle, FileText, Award, TrendingUp, TrendingDown, FolderInput, ListChecks,
  CalendarCheck, ShoppingCart, MousePointerClick, MailOpen, Users2,
} from "lucide-react";

export interface PaletteItem {
  kind: "trigger" | "action" | "condition" | "delay" | "merge" | "goal";
  subType: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
}

export const TRIGGERS: PaletteItem[] = [
  { kind: "trigger", subType: "new_lead", label: "New lead created", description: "Fires when any new lead is added", icon: UserPlus, group: "Lead" },
  { kind: "trigger", subType: "lead_added_to_folder", label: "Lead added to folder", description: "When a lead lands in a specific folder", icon: FolderInput, group: "Lead" },
  { kind: "trigger", subType: "lead_tagged", label: "Lead tagged (specific tag)", description: "When a specific tag is applied", icon: TagIcon, group: "Lead" },
  { kind: "trigger", subType: "tag_added_any", label: "Any tag added", description: "When any tag is added to a lead", icon: TagIcon, group: "Lead" },
  { kind: "trigger", subType: "score_threshold", label: "Score threshold reached", description: "When score crosses a number", icon: Award, group: "Lead" },
  { kind: "trigger", subType: "email_opened", label: "Email opened", description: "Lead opens any email", icon: MailOpen, group: "Engagement" },
  { kind: "trigger", subType: "email_not_opened", label: "Email NOT opened after X", description: "No open after delay", icon: AlertCircle, group: "Engagement" },
  { kind: "trigger", subType: "link_clicked", label: "Link clicked", description: "Lead clicks a tracked link", icon: MousePointerClick, group: "Engagement" },
  { kind: "trigger", subType: "whatsapp_replied", label: "WhatsApp replied", description: "Lead replies on WhatsApp", icon: MessageSquare, group: "Engagement" },
  { kind: "trigger", subType: "sms_replied", label: "SMS replied", description: "Lead replies via SMS", icon: Phone, group: "Engagement" },
  { kind: "trigger", subType: "campaign_completed", label: "Campaign completed", description: "Lead finishes a campaign", icon: CheckCircle2, group: "Campaigns" },
  { kind: "trigger", subType: "form_submitted", label: "Form submitted", description: "Embed form is filled", icon: FileText, group: "Capture" },
  { kind: "trigger", subType: "funnel_step_completed", label: "Funnel step completed", description: "Step in a funnel finished", icon: Target, group: "Capture" },
  { kind: "trigger", subType: "purchase_event", label: "Purchase event", description: "Lead makes a purchase", icon: ShoppingCart, group: "Sales" },
  { kind: "trigger", subType: "appointment_booked", label: "Appointment booked", description: "Booking confirmed", icon: CalendarCheck, group: "Sales" },
  { kind: "trigger", subType: "trial_started", label: "Trial started", description: "Free trial begins", icon: Zap, group: "Lifecycle" },
  { kind: "trigger", subType: "trial_ending_soon", label: "Trial ending soon", description: "Trial about to expire", icon: AlertCircle, group: "Lifecycle" },
  { kind: "trigger", subType: "subscription_cancelled", label: "Subscription cancelled", description: "User cancels subscription", icon: StopCircle, group: "Lifecycle" },
];

export const ACTIONS: PaletteItem[] = [
  { kind: "action", subType: "send_email", label: "Send Email", description: "Send templated email", icon: MailPlus, group: "Messaging" },
  { kind: "action", subType: "send_sms", label: "Send SMS", description: "Send SMS via Twilio", icon: Phone, group: "Messaging" },
  { kind: "action", subType: "send_whatsapp", label: "Send WhatsApp", description: "Send WhatsApp message", icon: MessageSquare, group: "Messaging" },
  { kind: "delay", subType: "wait_delay", label: "Wait / Delay", description: "Pause for time period", icon: Clock, group: "Timing" },
  { kind: "action", subType: "add_tag", label: "Add tag", description: "Tag this lead", icon: TagIcon, group: "CRM" },
  { kind: "action", subType: "remove_tag", label: "Remove tag", description: "Remove a tag", icon: TagIcon, group: "CRM" },
  { kind: "action", subType: "update_status", label: "Update status", description: "Set lead status", icon: ListChecks, group: "CRM" },
  { kind: "action", subType: "update_lifecycle_stage", label: "Update lifecycle stage", description: "Change lifecycle", icon: ListChecks, group: "CRM" },
  { kind: "action", subType: "update_pipeline_stage", label: "Update pipeline stage", description: "Move pipeline stage", icon: ArrowRightCircle, group: "CRM" },
  { kind: "action", subType: "increase_score", label: "Increase score (+N)", description: "Add to lead score", icon: TrendingUp, group: "Scoring" },
  { kind: "action", subType: "decrease_score", label: "Decrease score (−N)", description: "Subtract from score", icon: TrendingDown, group: "Scoring" },
  { kind: "action", subType: "assign_owner", label: "Assign owner", description: "Round-robin or specific", icon: Users2, group: "CRM" },
  { kind: "action", subType: "create_task", label: "Create task", description: "Internal follow-up", icon: ListChecks, group: "Internal" },
  { kind: "action", subType: "move_to_folder", label: "Move to folder", description: "Move lead to folder", icon: FolderInput, group: "CRM" },
  { kind: "action", subType: "add_note", label: "Add note", description: "Internal note on lead", icon: FileText, group: "Internal" },
  { kind: "action", subType: "notify_team", label: "Notify team", description: "In-app + email alert", icon: BellRing, group: "Internal" },
  { kind: "action", subType: "webhook", label: "Webhook POST", description: "Send HTTP POST", icon: Webhook, group: "Integration" },
  { kind: "action", subType: "stop_workflow", label: "Stop workflow", description: "Exit lead from flow", icon: StopCircle, group: "Flow" },
];

export const CONDITIONS: PaletteItem[] = [
  { kind: "condition", subType: "if_email_opened", label: "If email opened", description: "Branch on email open", icon: MailOpen, group: "Engagement" },
  { kind: "condition", subType: "if_email_not_opened", label: "If email NOT opened", description: "Branch on no-open", icon: AlertCircle, group: "Engagement" },
  { kind: "condition", subType: "if_link_clicked", label: "If link clicked", description: "Branch on click", icon: MousePointerClick, group: "Engagement" },
  { kind: "condition", subType: "if_link_not_clicked", label: "If link NOT clicked", description: "Branch on no-click", icon: AlertCircle, group: "Engagement" },
  { kind: "condition", subType: "if_whatsapp_replied", label: "If WhatsApp replied", description: "Branch on WhatsApp reply", icon: MessageSquare, group: "Engagement" },
  { kind: "condition", subType: "if_sms_replied", label: "If SMS replied", description: "Branch on SMS reply", icon: Phone, group: "Engagement" },
  { kind: "condition", subType: "if_has_tag", label: "If lead has tag", description: "Match by tag", icon: TagIcon, group: "CRM" },
  { kind: "condition", subType: "if_not_has_tag", label: "If lead does NOT have tag", description: "Tag absent", icon: TagIcon, group: "CRM" },
  { kind: "condition", subType: "if_source_equals", label: "If source equals", description: "Match by source", icon: Target, group: "CRM" },
  { kind: "condition", subType: "if_status_equals", label: "If status equals", description: "Match by status", icon: ListChecks, group: "CRM" },
  { kind: "condition", subType: "if_score_gt", label: "If score >", description: "Branch on score", icon: TrendingUp, group: "Scoring" },
  { kind: "condition", subType: "if_score_lt", label: "If score <", description: "Branch on score", icon: TrendingDown, group: "Scoring" },
  { kind: "condition", subType: "if_purchase_exists", label: "If purchase exists", description: "Has purchased", icon: ShoppingCart, group: "Sales" },
  { kind: "condition", subType: "if_appointment_booked", label: "If appointment booked", description: "Has booking", icon: CalendarCheck, group: "Sales" },
  { kind: "condition", subType: "if_property_matches", label: "If property matches (custom)", description: "AND/OR criteria builder", icon: GitBranch, group: "Custom" },
  { kind: "condition", subType: "if_no_activity", label: "If no activity after X days", description: "Inactivity branch", icon: Clock, group: "Engagement" },
];

export const FLOW_NODES: PaletteItem[] = [
  { kind: "merge", subType: "merge", label: "Merge branches", description: "Rejoin YES/NO arms", icon: GitBranch, group: "Flow" },
  { kind: "goal", subType: "goal", label: "Goal reached", description: "Successful exit", icon: Award, group: "Flow" },
];

export const ALL_PALETTE_ITEMS = [...TRIGGERS, ...ACTIONS, ...CONDITIONS, ...FLOW_NODES];

export function findPaletteItem(subType: string): PaletteItem | undefined {
  return ALL_PALETTE_ITEMS.find((p) => p.subType === subType);
}
