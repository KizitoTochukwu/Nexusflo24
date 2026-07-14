// Shared workflow types — used by both UI and serializer.

export type WorkflowStatus = "draft" | "active" | "paused" | "archived";

export type NodeKind =
  | "trigger"
  | "action"
  | "condition"
  | "delay"
  | "merge"
  | "goal"
  | "end";

export type TriggerSubType =
  | "new_lead"
  | "lead_added_to_folder"
  | "lead_tagged"
  | "tag_added_any"
  | "score_threshold"
  | "email_opened"
  | "email_not_opened"
  | "link_clicked"
  | "whatsapp_replied"
  | "sms_replied"
  | "campaign_completed"
  | "form_submitted"
  | "funnel_step_completed"
  | "purchase_event"
  | "appointment_booked"
  | "trial_started"
  | "trial_ending_soon"
  | "subscription_cancelled";

export type ActionSubType =
  | "send_email"
  | "send_sms"
  | "send_whatsapp"
  | "wait_delay"
  | "add_tag"
  | "remove_tag"
  | "update_status"
  | "update_lifecycle_stage"
  | "update_pipeline_stage"
  | "increase_score"
  | "decrease_score"
  | "assign_owner"
  | "create_task"
  | "move_to_folder"
  | "add_note"
  | "notify_team"
  | "webhook"
  | "stop_workflow"
  | "jump_to_step";

export type ConditionSubType =
  | "if_email_opened"
  | "if_email_not_opened"
  | "if_link_clicked"
  | "if_link_not_clicked"
  | "if_whatsapp_replied"
  | "if_sms_replied"
  | "if_has_tag"
  | "if_not_has_tag"
  | "if_source_equals"
  | "if_lifecycle_equals"
  | "if_status_equals"
  | "if_score_gt"
  | "if_score_lt"
  | "if_purchase_exists"
  | "if_appointment_booked"
  | "if_property_matches"
  | "if_no_activity"
  | "split_test";

export interface CriteriaRule {
  field: string;
  operator: "equals" | "not_equals" | "gt" | "lt" | "contains" | "not_contains" | "exists" | "not_exists";
  value?: string | number;
}

export interface CriteriaGroup {
  combinator: "AND" | "OR";
  rules: (CriteriaRule | CriteriaGroup)[];
}

export interface NodeData {
  kind: NodeKind;
  subType?: string;
  label?: string;
  config?: Record<string, unknown>;
  criteria?: CriteriaGroup;
}

export interface WorkflowCanvasJSON {
  nodes: Array<{
    id: string;
    type: NodeKind;
    position: { x: number; y: number };
    data: NodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: "yes" | "no" | "out" | string;
    label?: string;
  }>;
}

export interface EnrollmentConfig {
  reEnrollment: boolean;
  reEnrollmentTriggers?: string[];
}

export interface SuppressionConfig {
  tags?: string[];
  lifecycleStages?: string[];
  smartListIds?: string[];
}

export interface QuietHours {
  enabled: boolean;
  start: string; // "21:00"
  end: string; // "08:00"
  timezone: string;
}

export interface Workflow {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  canvas_json: WorkflowCanvasJSON;
  enrollment_config: EnrollmentConfig;
  suppression_config: SuppressionConfig;
  unenrollment_triggers: string[];
  quiet_hours: QuietHours;
  daily_send_cap: number;
  goal_node_id: string | null;
  template_slug: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  // Enrollment trigger (structured, replaces raw canvas trigger metadata)
  enrollment_object_type?: string;
  enrollment_method?: string;
  trigger_source?: string | null;
  trigger_event?: string | null;
  trigger_config?: Record<string, any>;
  filter_groups?: Array<{ combinator: "AND" | "OR"; conditions: Array<{ property: string; operator: string; value?: string }> }>;
  reenrollment_config?: { mode: string; wait_amount?: number; wait_unit?: string };
  deduplication_key?: string | null;
  trigger_summary?: string | null;
  last_tested_at?: string | null;
  folder_id?: string | null;
}
