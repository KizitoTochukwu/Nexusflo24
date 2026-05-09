import { z } from "zod";
import type { SmartAction } from "@/hooks/useSmartActions";

const PIPELINE_STAGES = ["New", "Contacted", "Engaged", "Qualified", "Warm", "Hot", "Won", "Customer", "Lost"] as const;

const VALID_ACTIONS = [
  "send_email", "send_whatsapp", "send_sms",
  "add_tag", "remove_tag", "update_status", "notify_sales", "delay",
  "assign_owner", "enroll_in_automation", "adjust_score",
] as const;

const TAG_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,49}$/;

/** Per-action defaults schemas */
const sendEmailDefaults = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be ≤ 200 chars"),
  message: z.string().trim().max(5000, "Message must be ≤ 5000 chars").optional(),
}).passthrough();

const sendMessageDefaults = z.object({
  message: z.string().trim().min(1, "Message is required").max(1000, "Message must be ≤ 1000 chars"),
}).passthrough();

const tagDefaults = z.object({
  tag: z.string()
    .trim()
    .min(1, "Tag is required")
    .max(50, "Tag must be ≤ 50 chars")
    .regex(TAG_REGEX, "Tag must start with a letter/number and only contain letters, numbers, _ or -"),
}).passthrough();

const statusDefaults = z.object({
  new_status: z.enum(PIPELINE_STAGES, { errorMap: () => ({ message: "Pick a valid pipeline stage" }) }),
}).passthrough();

const notifySalesDefaults = z.object({
  title: z.string().trim().max(120, "Title must be ≤ 120 chars").optional(),
  message: z.string().trim().max(500, "Note must be ≤ 500 chars").optional(),
  recipients: z.array(z.enum(["lead_owner", "creator", "specific", "all_admins", "all_members"])).optional(),
  recipient_user_ids: z.array(z.string().uuid()).optional(),
  channels: z.array(z.enum(["inapp", "email", "sms", "whatsapp"])).optional(),
}).passthrough();

const delayDefaults = z.object({
  duration: z.number().int().positive("Duration must be > 0").max(10000, "Duration too large"),
  unit: z.enum(["minutes", "hours", "days"]),
}).passthrough();

const assignOwnerDefaults = z.object({
  mode: z.enum(["round_robin", "specific"]).default("round_robin"),
  user_id: z.string().uuid().optional(),
  notify_new_owner: z.boolean().optional(),
  channels: z.array(z.enum(["inapp", "email", "sms", "whatsapp"])).optional(),
  also_notify: z.array(z.enum(["creator", "previous_owner", "all_admins"])).optional(),
  notify_title: z.string().trim().max(120, "Title must be ≤ 120 chars").optional(),
  notify_message: z.string().trim().max(500, "Message must be ≤ 500 chars").optional(),
}).passthrough();

const enrollDefaults = z.object({
  target_automation_id: z.string().uuid().optional(),
}).passthrough();

const adjustScoreDefaults = z.object({
  score_delta: z.number().int().optional(),
}).passthrough();

const DEFAULTS_BY_ACTION: Record<string, z.ZodTypeAny> = {
  send_email: sendEmailDefaults,
  send_whatsapp: sendMessageDefaults,
  send_sms: sendMessageDefaults,
  add_tag: tagDefaults,
  remove_tag: tagDefaults,
  update_status: statusDefaults,
  notify_sales: notifySalesDefaults,
  delay: delayDefaults,
  assign_owner: assignOwnerDefaults,
  enroll_in_automation: enrollDefaults,
  adjust_score: adjustScoreDefaults,
};

const baseSmartActionSchema = z.object({
  action: z.enum(VALID_ACTIONS, { errorMap: () => ({ message: "Choose a valid action type" }) }),
  label: z.string()
    .trim()
    .min(1, "Label is required")
    .max(60, "Label must be ≤ 60 chars"),
  defaults: z.record(z.unknown()).optional(),
});

/** Validate a single chip including its action-specific defaults. */
export function validateSmartAction(action: SmartAction): string | null {
  const base = baseSmartActionSchema.safeParse(action);
  if (!base.success) {
    return base.error.errors[0]?.message ?? "Invalid action";
  }
  const defaultsSchema = DEFAULTS_BY_ACTION[action.action];
  if (!defaultsSchema) return "Unknown action type";
  const result = defaultsSchema.safeParse(action.defaults ?? {});
  if (!result.success) {
    const issue = result.error.errors[0];
    return issue?.message ?? "Invalid configuration";
  }
  return null;
}

export type SmartActionValidationResult = {
  /** Per-row error message, indexed by chip position. null = valid. */
  rowErrors: (string | null)[];
  /** Form-level error (e.g. duplicate labels). */
  formError: string | null;
  isValid: boolean;
};

/** Validate the full list: per-chip config + duplicate label detection (case-insensitive). */
export function validateSmartActions(actions: SmartAction[]): SmartActionValidationResult {
  const rowErrors = actions.map(validateSmartAction);

  // Duplicate label detection (case-insensitive, trimmed). Marks every duplicate row.
  const labelMap = new Map<string, number[]>();
  actions.forEach((a, idx) => {
    const key = (a.label ?? "").trim().toLowerCase();
    if (!key) return;
    const list = labelMap.get(key) ?? [];
    list.push(idx);
    labelMap.set(key, list);
  });

  let dupCount = 0;
  for (const [, indices] of labelMap) {
    if (indices.length > 1) {
      dupCount += indices.length;
      for (const i of indices) {
        // Don't overwrite a more specific config error; only set if currently valid.
        if (rowErrors[i] === null) rowErrors[i] = "Duplicate label — must be unique";
      }
    }
  }

  const formError = dupCount > 0
    ? `${dupCount} chip${dupCount === 1 ? "" : "s"} share a label. Labels must be unique.`
    : null;

  const isValid = rowErrors.every((e) => e === null) && !formError;
  return { rowErrors, formError, isValid };
}
