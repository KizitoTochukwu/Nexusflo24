import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

import {
  Plus, Minus, Trash2, GripVertical, Zap, Filter, Play, Clock,
  Mail, MessageCircle, Smartphone, Tag, XCircle, RefreshCw, Bell, ArrowDown, Sparkles, DoorOpen, TrendingUp, X, GitBranch, UserPlus,
  ChevronDown, ArrowRight, Check, CheckCircle2, CircleSlash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONDITION_GROUPS, ACTION_OPTIONS, REPLY_STATUS_OPTIONS, operatorLabel, useAutomations, phraseConditionGroup, type ConditionOperator, type ConditionRow, type ConditionLogic } from "@/hooks/useAutomations";
import { useSmartActionOverrides, resolveSmartActions } from "@/hooks/useSmartActions";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceInvites";
import AutomationEmailEditor from "./email-editor/AutomationEmailEditor";
import InsertDropdown from "./email-editor/InsertDropdown";
import ExitCriteriaEditor from "./ExitCriteriaEditor";
import type { ExitCriterion } from "@/lib/automations/exitCriteria";
import { AUTOMATION_TAG_OPTIONS } from "@/lib/automations/tagOptions";
import { AUTOMATION_SCORE_OPTIONS } from "@/lib/automations/scoreOptions";

export type StepData = {
  step_type:
    | "trigger"
    | "condition"
    | "action"
    | "delay"
    | "branch_yes_start"
    | "branch_yes_end"
    | "branch_no_start"
    | "branch_no_end";
  config: Record<string, unknown>;
};

const STEP_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  trigger: { label: "Trigger", icon: <Zap className="h-4 w-4" />, color: "bg-amber-100 text-amber-800 border-amber-200" },
  condition: { label: "Condition", icon: <Filter className="h-4 w-4" />, color: "bg-blue-100 text-blue-800 border-blue-200" },
  action: { label: "Action", icon: <Play className="h-4 w-4" />, color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  delay: { label: "Delay", icon: <Clock className="h-4 w-4" />, color: "bg-purple-100 text-purple-800 border-purple-200" },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  send_email: <Mail className="h-4 w-4" />,
  send_whatsapp: <MessageCircle className="h-4 w-4" />,
  send_sms: <Smartphone className="h-4 w-4" />,
  add_tag: <Tag className="h-4 w-4" />,
  remove_tag: <XCircle className="h-4 w-4" />,
  update_status: <RefreshCw className="h-4 w-4" />,
  update_pipeline_stage: <GitBranch className="h-4 w-4" />,
  adjust_score: <TrendingUp className="h-4 w-4" />,
  notify_sales: <Bell className="h-4 w-4" />,
  assign_owner: <UserPlus className="h-4 w-4" />,
  enroll_in_automation: <Zap className="h-4 w-4" />,
  delay: <Clock className="h-4 w-4" />,
  end_automation: <DoorOpen className="h-4 w-4" />,
};

const PIPELINE_STAGES = ["New", "Contacted", "Engaged", "Qualified", "Warm", "Hot", "Won", "Customer", "Lost"];
interface Props {
  steps: StepData[];
  onChange: (steps: StepData[]) => void;
  triggerType: string;
  exitCriteria?: ExitCriterion[];
  onExitCriteriaChange?: (criteria: ExitCriterion[]) => void;
}

export default function AutomationStepEditor({ steps, onChange, triggerType, exitCriteria, onExitCriteriaChange }: Props) {
  const workspaceId = useWorkspaceId();
  const { data: smartActionOverrides } = useSmartActionOverrides(workspaceId);
  const { data: allAutomations } = useAutomations(workspaceId || "");
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceId || "");

  const addStep = (type: StepData["step_type"]) => {
    const newStep: StepData = { step_type: type, config: {} };
    if (type === "delay") newStep.config = { duration: 60, unit: "minutes" };
    onChange([...steps, newStep]);
  };

  const updateStep = (index: number, config: Record<string, unknown>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], config: { ...updated[index].config, ...config } };
    onChange(updated);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) return;
    const updated = [...steps];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated);
  };

  // Drag-and-drop reordering for non-branch steps
  const isBranchMarker = (t: StepData["step_type"]) =>
    t === "branch_yes_start" || t === "branch_yes_end" ||
    t === "branch_no_start" || t === "branch_no_end";

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (i: number) => (e: React.DragEvent) => {
    if (isBranchMarker(steps[i].step_type)) { e.preventDefault(); return; }
    setDraggedIndex(i);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", String(i)); } catch { /* noop */ }
  };

  const handleDragOver = (i: number) => (e: React.DragEvent) => {
    if (draggedIndex === null) return;
    if (isBranchMarker(steps[i].step_type)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== i) setDragOverIndex(i);
  };

  const handleDrop = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = draggedIndex;
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (from === null || from === i) return;
    if (isBranchMarker(steps[i].step_type)) return;
    moveStep(from, i);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Find matching branch end index for a start at `startIdx`. Returns -1 if not found.
  const findBranchEnd = (startIdx: number): number => {
    const startType = steps[startIdx]?.step_type;
    const endType = startType === "branch_yes_start" ? "branch_yes_end"
      : startType === "branch_no_start" ? "branch_no_end" : null;
    if (!endType) return -1;
    let depth = 1;
    for (let j = startIdx + 1; j < steps.length; j++) {
      if (steps[j].step_type === startType) depth++;
      else if (steps[j].step_type === endType) {
        depth--;
        if (depth === 0) return j;
      }
    }
    return -1;
  };

  // Detect whether a condition at index i already has a YES/NO branch immediately following
  // (allowing other branch of opposite kind in between).
  const branchInfoForCondition = (i: number) => {
    let hasYes = false, hasNo = false;
    let j = i + 1;
    while (j < steps.length) {
      const t = steps[j].step_type;
      if (t === "branch_yes_start") {
        hasYes = true;
        const end = findBranchEnd(j);
        j = end === -1 ? steps.length : end + 1;
      } else if (t === "branch_no_start") {
        hasNo = true;
        const end = findBranchEnd(j);
        j = end === -1 ? steps.length : end + 1;
      } else {
        break;
      }
    }
    return { hasYes, hasNo };
  };

  // 1-based step numbers for non-branch, non-trigger steps (trigger isn't in steps[])
  const stepNumbers: Record<number, number> = (() => {
    const map: Record<number, number> = {};
    let n = 0;
    steps.forEach((s, idx) => {
      if (!isBranchMarker(s.step_type)) { n++; map[idx] = n; }
    });
    return map;
  })();

  // Human-readable summary of a single step (used inside branch summaries)
  const summarizeStep = (s: StepData): string => {
    const cfg = (s.config ?? {}) as any;
    if (s.step_type === "delay") return `Wait ${cfg.duration ?? "?"} ${cfg.unit ?? "min"}`;
    if (s.step_type === "condition") return "Condition";
    if (s.step_type === "action") {
      const a = cfg.action as string | undefined;
      if (!a) return "Action";
      if (a === "send_email") return "Send Email";
      if (a === "send_whatsapp") return "Send WhatsApp";
      if (a === "send_sms") return "Send SMS";
      if (a === "add_tag") return `Add Tag\n${cfg.tag || "…"}`;
      if (a === "remove_tag") return `Remove tag: ${cfg.tag || "…"}`;
      if (a === "adjust_score") {
        const d = Number(cfg.score_delta ?? 5);
        const r = (cfg.score_reason as string) || "";
        const matched = AUTOMATION_SCORE_OPTIONS.find(o => o.value === d && (!r || o.reason === r));
        return `Adjust Lead Score\n${matched?.label || `${d >= 0 ? "+" : ""}${d} score`}`;
      }
      if (a === "update_status") return `Update Lead Status\n${cfg.new_status || "…"}`;
      if (a === "update_pipeline_stage") return `Update Pipeline Stage\n${cfg.new_pipeline_stage || "…"}`;
      if (a === "notify_sales") return "Notify sales";
      if (a === "assign_owner") {
        const mode = (cfg.assign_mode as string) === "round_robin" ? "Round-robin" : "Specific user";
        let userPart = "";
        if (cfg.assign_mode === "specific" && cfg.assign_user_id) {
          const member = (workspaceMembers || []).find((m: any) => m.user_id === cfg.assign_user_id);
          userPart = `\n${member?.profile?.full_name || member?.profile?.email || "Unknown user"}`;
        }
        const notifyPart = cfg.notify_new_owner !== false ? "\nNotify the new owner when assigned" : "";
        const channels = (cfg.channels as string[]) || ["inapp", "email"];
        const channelNames = channels.map(c => c === "inapp" ? "In-app" : c.charAt(0).toUpperCase() + c.slice(1)).join("\n");
        const alsoNotify = (cfg.also_notify as string[]) || [];
        const alsoNames = alsoNotify.map(n => n.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())).join("\n");
        
        let summary = `Assign Owner\n${mode}${userPart}${notifyPart}\n\nCHANNELS\n${channelNames}`;
        if (alsoNames) summary += `\n\nALSO NOTIFY\n${alsoNames}`;
        if (cfg.notify_title) summary += `\n\nTITLE\n${cfg.notify_title}`;
        if (cfg.notify_message) summary += `\n\nMESSAGE\n${cfg.notify_message}`;
        
        return summary;
      }
      if (a === "enroll_in_automation") {
        const targetId = (cfg.target_automation_id as string) || "";
        const target = (allAutomations || []).find(a => a.id === targetId);
        return `Enroll in Automation\n${target?.name || "…"}`;
      }
      if (a === "end_automation") return "End Automation (stop here)\n\n\n\n";
      return a.replace(/_/g, " ");
    }
    return s.step_type;
  };

  const findBranchStartFor = (conditionIdx: number, kind: "yes" | "no"): number => {
    const target = kind === "yes" ? "branch_yes_start" : "branch_no_start";
    let j = conditionIdx + 1;
    while (j < steps.length) {
      const t = steps[j].step_type;
      if (t === target) return j;
      if (t === "branch_yes_start" || t === "branch_no_start") {
        const end = findBranchEnd(j);
        j = end === -1 ? steps.length : end + 1;
      } else break;
    }
    return -1;
  };

  const collectBranchSteps = (startIdx: number): StepData[] => {
    const end = findBranchEnd(startIdx);
    if (end === -1) return [];
    return steps.slice(startIdx + 1, end).filter((s) => !isBranchMarker(s.step_type));
  };

  // 1-based step number of the next step execution falls through to after this condition's branches
  const nextFallthroughStepNumber = (conditionIdx: number): number | null => {
    let j = conditionIdx + 1;
    while (j < steps.length) {
      const t = steps[j].step_type;
      if (t === "branch_yes_start" || t === "branch_no_start") {
        const end = findBranchEnd(j);
        j = end === -1 ? steps.length : end + 1;
      } else break;
    }
    if (j >= steps.length) return null;
    return stepNumbers[j] ?? null;
  };

  // Remove a branch INCLUDING its inner contents (vs. removeBranch which keeps inner steps)
  const removeBranchWithContents = (startIdx: number) => {
    const end = findBranchEnd(startIdx);
    if (end === -1) return;
    const updated = [...steps];
    updated.splice(startIdx, end - startIdx + 1);
    onChange(updated);
  };

  const setOutcomeProceed = (conditionIdx: number, kind: "yes" | "no") => {
    const existing = findBranchStartFor(conditionIdx, kind);
    if (existing !== -1) removeBranchWithContents(existing);
  };

  const setOutcomeStop = (conditionIdx: number, kind: "yes" | "no") => {
    // Remove any existing branch of this kind, then insert one containing end_automation
    const existing = findBranchStartFor(conditionIdx, kind);
    let working = [...steps];
    if (existing !== -1) {
      const end = findBranchEnd(existing);
      working.splice(existing, end - existing + 1);
    }
    // Recompute insert location after remaining branches of the opposite kind
    let insertAt = conditionIdx + 1;
    while (insertAt < working.length) {
      const t = working[insertAt].step_type;
      if (t === "branch_yes_start" || t === "branch_no_start") {
        const sType = t;
        const eType = t === "branch_yes_start" ? "branch_yes_end" : "branch_no_end";
        let d = 1, k = insertAt + 1;
        while (k < working.length && d > 0) {
          if (working[k].step_type === sType) d++;
          else if (working[k].step_type === eType) d--;
          k++;
        }
        insertAt = k;
      } else break;
    }
    const startType = kind === "yes" ? "branch_yes_start" : "branch_no_start";
    const endType = kind === "yes" ? "branch_yes_end" : "branch_no_end";
    working.splice(insertAt, 0,
      { step_type: startType, config: {} },
      { step_type: "action", config: { action: "end_automation", reason: kind === "yes" ? "Condition met — stopping" : "Condition not met — stopping" } },
      { step_type: endType, config: {} },
    );
    onChange(working);
  };



  const addBranch = (conditionIdx: number, kind: "yes" | "no") => {
    // Insert after any existing branches that already follow this condition
    let insertAt = conditionIdx + 1;
    while (insertAt < steps.length) {
      const t = steps[insertAt].step_type;
      if (t === "branch_yes_start" || t === "branch_no_start") {
        const end = findBranchEnd(insertAt);
        insertAt = end === -1 ? steps.length : end + 1;
      } else break;
    }
    const startType = kind === "yes" ? "branch_yes_start" : "branch_no_start";
    const endType = kind === "yes" ? "branch_yes_end" : "branch_no_end";
    const updated = [...steps];
    updated.splice(insertAt, 0, { step_type: startType, config: {} }, { step_type: endType, config: {} });
    onChange(updated);
  };

  const removeBranch = (startIdx: number) => {
    const endIdx = findBranchEnd(startIdx);
    if (endIdx === -1) return;
    const updated = [...steps];
    // Remove end first (higher index), then start, preserving inner steps
    updated.splice(endIdx, 1);
    updated.splice(startIdx, 1);
    onChange(updated);
  };

  const insertStepInsideBranch = (endIdx: number, type: StepData["step_type"]) => {
    const newStep: StepData = { step_type: type, config: {} };
    if (type === "delay") newStep.config = { duration: 60, unit: "minutes" };
    const updated = [...steps];
    updated.splice(endIdx, 0, newStep);
    onChange(updated);
  };

  // Compute branch nesting (kind) for each index, for visual tinting
  const branchStackPerIndex: Array<"yes" | "no" | null> = (() => {
    const out: Array<"yes" | "no" | null> = [];
    const stack: Array<"yes" | "no"> = [];
    steps.forEach((s) => {
      if (s.step_type === "branch_yes_start") { stack.push("yes"); out.push("yes"); }
      else if (s.step_type === "branch_no_start") { stack.push("no"); out.push("no"); }
      else if (s.step_type === "branch_yes_end" || s.step_type === "branch_no_end") {
        out.push(stack[stack.length - 1] ?? null);
        stack.pop();
      } else {
        out.push(stack[stack.length - 1] ?? null);
      }
    });
    return out;
  })();

  return (
    <div className="space-y-2">
      {/* Visual trigger block */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <Zap className="h-5 w-5 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          When: <span className="font-semibold">{triggerType.replace(/_/g, " ")}</span>
        </span>
      </div>

      {steps.map((step, i) => {
        const branchKind = branchStackPerIndex[i];
        const inBranchClass = branchKind === "yes"
          ? "border-l-2 border-emerald-300 bg-emerald-50/30 pl-3 ml-2"
          : branchKind === "no"
          ? "border-l-2 border-rose-300 bg-rose-50/30 pl-3 ml-2"
          : "";

        // Branch start marker — visual + remove control
        if (step.step_type === "branch_yes_start" || step.step_type === "branch_no_start") {
          const isYes = step.step_type === "branch_yes_start";
          const label = (step.config as any)?.label as string | undefined;
          return (
            <div key={i} className={cn("flex justify-center items-center gap-2 py-2", inBranchClass)}>
              <Badge variant="outline" className={isYes ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}>
                {isYes ? "▼ If YES" : "▼ If NO"}{label ? ` — ${label}` : ""}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => removeBranch(i)}
                title="Remove branch (keeps steps inside)"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        }
        if (step.step_type === "branch_yes_end" || step.step_type === "branch_no_end") {
          const isYes = step.step_type === "branch_yes_end";
          return (
            <div key={i} className={cn("py-1", inBranchClass)}>
              <div className="flex flex-wrap gap-1.5 justify-center pb-1">
                <Button variant="outline" size="sm" className="h-6 text-[11px] gap-1 bg-background/70" onClick={() => insertStepInsideBranch(i, "action")}>
                  <Plus className="h-3 w-3" /> Action in branch
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-[11px] gap-1 bg-background/70" onClick={() => insertStepInsideBranch(i, "delay")}>
                  <Plus className="h-3 w-3" /> Delay in branch
                </Button>
              </div>
              <div className={cn(
                "border-t border-dashed mx-8",
                isYes ? "border-emerald-300" : "border-rose-300",
              )} />
              <div className="text-center text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                end {isYes ? "YES" : "NO"} branch
              </div>
            </div>
          );
        }
        const meta = STEP_TYPE_META[step.step_type] || STEP_TYPE_META.action;
        // condition branch state is rendered inline by the new outcome rows below
        return (
          <div key={i} className={inBranchClass}>
            <div className="flex justify-center py-1">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
            <div
              draggable
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver(i)}
              onDrop={handleDrop(i)}
              onDragEnd={handleDragEnd}
              className={cn(
                `rounded-lg border p-3 pr-[12px] ml-0 mr-0 ${meta.color} transition-all`,
                draggedIndex === i && "opacity-40",
                dragOverIndex === i && draggedIndex !== i && "ring-2 ring-primary ring-offset-1",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100"
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  {meta.icon}
                  <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                  {stepNumbers[i] !== undefined && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                      Step {stepNumbers[i]}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeStep(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {step.step_type === "condition" && (() => {
                const allOptions = CONDITION_GROUPS.flatMap((g) => g.options);

                // Normalize legacy single-row config into rows[] without writing to disk yet.
                const legacyRow: ConditionRow | null = step.config.condition
                  ? {
                      condition: step.config.condition as string,
                      operator: step.config.operator as ConditionOperator | undefined,
                      value: (step.config.value as string) || "",
                      value_to: (step.config.value_to as string) || "",
                      time_window_days: step.config.time_window_days as number | undefined,
                      reply_check: step.config.reply_check as string | undefined,
                    }
                  : null;
                const rawRows = (step.config.conditions as ConditionRow[] | undefined);
                const rows: ConditionRow[] = rawRows && rawRows.length
                  ? rawRows
                  : legacyRow
                  ? [legacyRow]
                  : [{ condition: "", operator: undefined, value: "", value_to: "", time_window_days: undefined }];
                const logic: ConditionLogic = (step.config.logic as ConditionLogic) || "AND";
                const isReplyStatusFirst = rows[0]?.condition === "reply_status";

                const writeRows = (next: ConditionRow[], nextLogic?: ConditionLogic) => {
                  // Persist as rows[] + mirror first row into legacy fields for back-compat with existing UI bits.
                  const first: Partial<ConditionRow> = next[0] || {};
                  updateStep(i, {
                    conditions: next,
                    logic: nextLogic ?? logic,
                    condition: first.condition,
                    operator: first.operator,
                    value: first.value ?? "",
                    value_to: first.value_to ?? "",
                    time_window_days: first.time_window_days,
                    reply_check: first.reply_check,
                  });
                };

                const updateRow = (idx: number, patch: Partial<ConditionRow>) => {
                  const next = rows.map((r, k) => (k === idx ? { ...r, ...patch } : r));
                  writeRows(next);
                };
                const addRow = () => writeRows([...rows, { condition: "", operator: undefined, value: "", value_to: "", time_window_days: undefined }]);
                const removeRow = (idx: number) => writeRows(rows.filter((_, k) => k !== idx));

                const firstOpt = allOptions.find((o) => o.value === rows[0]?.condition);

                const addSuggested = (sa: { action: string; defaults?: Record<string, unknown> }) => {
                  const newStep: StepData = {
                    step_type: "action",
                    config: { action: sa.action, ...(sa.defaults || {}) },
                  };
                  const updated = [...steps];
                  updated.splice(i + 1, 0, newStep);
                  onChange(updated);
                };

                return (
                  <div className="space-y-2 mb-2">
                    {rows.map((row, idx) => {
                      const selectedOpt = allOptions.find((o) => o.value === row.condition);
                      const currentOperator: ConditionOperator =
                        row.operator || (selectedOpt?.operators?.[0] ?? "equals");
                      const operatorNeedsValue = !["is_known", "is_unknown", "happened", "not_happened"].includes(currentOperator);
                      const isBetween = currentOperator === "between";

                      return (
                        <div key={idx} className="space-y-1.5">
                          {idx > 0 && (
                            <div className="flex items-center gap-2 pl-1">
                              <div className="h-px flex-1 bg-blue-200" />
                              <div className="inline-flex rounded-full border border-blue-300 bg-background/70 overflow-hidden text-[10px] font-semibold">
                                {(["AND", "OR"] as ConditionLogic[]).map((l) => (
                                  <button
                                    key={l}
                                    type="button"
                                    onClick={() => writeRows(rows, l)}
                                    className={cn(
                                      "px-2.5 py-0.5 transition-colors",
                                      logic === l
                                        ? "bg-blue-600 text-white"
                                        : "text-blue-700 hover:bg-blue-50",
                                    )}
                                  >
                                    {l}
                                  </button>
                                ))}
                              </div>
                              <div className="h-px flex-1 bg-blue-200" />
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 items-center">
                            <Select
                              value={row.condition}
                              onValueChange={(v) => {
                                const opt = allOptions.find((o) => o.value === v);
                                const defaultOp = opt?.operators?.[0] ?? "equals";
                                if (v === "reply_status") {
                                  // Reply status is exclusive — collapse to single row
                                  writeRows([{ condition: v, operator: undefined, reply_check: "has_replied", value: "", value_to: "", time_window_days: undefined }]);
                                } else {
                                  updateRow(idx, { condition: v, operator: defaultOp, reply_check: undefined, value: "", value_to: "", time_window_days: undefined });
                                }
                              }}
                            >
                              <SelectTrigger className="w-[200px] bg-background">
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[360px]">
                                {CONDITION_GROUPS.map((group) => (
                                  <SelectGroup key={group.label}>
                                    <SelectLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                                      {group.label}
                                    </SelectLabel>
                                    {group.options.map((c) => (
                                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </Select>

                            {selectedOpt && selectedOpt.operators.length > 0 && (
                              <Select
                                value={currentOperator}
                                onValueChange={(v) =>
                                  updateRow(idx, { operator: v as ConditionOperator, ...(v === "between" ? {} : { value_to: "" }) })
                                }
                              >
                                <SelectTrigger className="w-[170px] bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedOpt.operators.map((op) => (
                                    <SelectItem key={op} value={op}>{operatorLabel(op)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {selectedOpt && operatorNeedsValue && selectedOpt.input !== "none" && (
                              <Input
                                type={selectedOpt.input === "number" ? "number" : "text"}
                                placeholder={selectedOpt.placeholder || "Value"}
                                className="w-[160px] bg-background"
                                value={row.value || ""}
                                onChange={(e) => updateRow(idx, { value: e.target.value })}
                              />
                            )}
                            {selectedOpt && isBetween && selectedOpt.input !== "none" && (
                              <>
                                <span className="text-xs text-muted-foreground">and</span>
                                <Input
                                  type={selectedOpt.input === "number" ? "number" : "text"}
                                  placeholder="Upper value"
                                  className="w-[120px] bg-background"
                                  value={row.value_to || ""}
                                  onChange={(e) => updateRow(idx, { value_to: e.target.value })}
                                />
                              </>
                            )}

                            {selectedOpt?.timeWindow && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">in last</span>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="∞"
                                  className="w-[70px] bg-background"
                                  value={row.time_window_days ?? ""}
                                  onChange={(e) =>
                                    updateRow(idx, {
                                      time_window_days: e.target.value === "" ? undefined : parseInt(e.target.value) || undefined,
                                    })
                                  }
                                />
                                <span className="text-xs text-muted-foreground">days</span>
                              </div>
                            )}

                            {rows.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeRow(idx)}
                                title="Remove this condition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add condition + natural-language preview */}
                    {!isReplyStatusFirst && (
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs bg-background/60 border-dashed"
                          onClick={addRow}
                        >
                          <Plus className="h-3 w-3" /> Add condition
                        </Button>
                        {rows.some((r) => r.condition) && (
                          <span className="text-[11px] text-muted-foreground italic truncate">
                            {phraseConditionGroup(rows, logic)}
                          </span>
                        )}
                      </div>
                    )}

                    {rows[0]?.condition === "reply_status" && (
                      <div className="w-full space-y-2 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium min-w-[100px]">If replied →</span>
                          <Select
                            value={(step.config.replied_action as string) || ""}
                            onValueChange={(v) => updateStep(i, { replied_action: v })}
                          >
                            <SelectTrigger className="w-[160px] bg-background">
                              <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {PIPELINE_STAGES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium min-w-[100px]">If no reply →</span>
                          <Select
                            value={(step.config.no_reply_action as string) || "continue"}
                            onValueChange={(v) => updateStep(i, { no_reply_action: v })}
                          >
                            <SelectTrigger className="w-[180px] bg-background">
                              <SelectValue placeholder="Choose action..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="continue">Continue sequence</SelectItem>
                              {PIPELINE_STAGES.map((s) => (
                                <SelectItem key={s} value={s}>Move to {s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Smart actions — driven by the first selected condition */}
                    {(() => {
                      const effective = firstOpt ? resolveSmartActions(firstOpt.value, smartActionOverrides) : [];
                      if (!effective.length) return null;
                      return (
                        <div className="pt-1.5 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            Smart actions
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {effective.map((sa, idx) => (
                              <Button
                                key={idx}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 bg-background/60 border-dashed text-xs"
                                onClick={() => addSuggested(sa)}
                              >
                                {ACTION_ICONS[sa.action] ?? <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                                {sa.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}


              {step.step_type === "condition" && (() => {
                const fallthroughN = nextFallthroughStepNumber(i);
                const renderOutcome = (kind: "yes" | "no") => {
                  const startIdx = findBranchStartFor(i, kind);
                  const hasBranch = startIdx !== -1;
                  const branchSteps = hasBranch ? collectBranchSteps(startIdx) : [];
                  const isStopBranch =
                    hasBranch &&
                    branchSteps.length === 1 &&
                    branchSteps[0].step_type === "action" &&
                    (branchSteps[0].config as any)?.action === "end_automation";

                  let summary: string;
                  let mode: "proceed" | "branch" | "stop";
                  if (!hasBranch) {
                    summary = fallthroughN ? `Proceed to Step ${fallthroughN}` : "Select Action";
                    mode = "proceed";
                  } else if (isStopBranch) {
                    summary = "Stop automation";
                    mode = "stop";
                  } else if (branchSteps.length === 0) {
                    summary = "Custom branch (empty — add steps below)";
                    mode = "branch";
                  } else {
                    summary = branchSteps.map(summarizeStep).join(" · ");
                    mode = "branch";
                  }

                  const isYes = kind === "yes";
                  const tone = isYes
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800";
                  const pill = isYes
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-rose-100 text-rose-700 border-rose-200";
                  const Icon = isYes ? CheckCircle2 : CircleSlash;

                  return (
                    <div
                      key={kind}
                      className={cn("flex items-center gap-2 rounded-md border px-2.5 py-1.5", tone)}
                      title={summary}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] font-semibold", pill)}>
                        If {isYes ? "YES" : "NO"}
                      </Badge>
                      <ArrowRight className="h-3 w-3 opacity-60 shrink-0" />
                      <span className="text-xs font-medium truncate flex-1 min-w-0 whitespace-pre-line">{summary}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] gap-1 shrink-0 hover:bg-background/60"
                          >
                            Change <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-popover">
                          <DropdownMenuLabel className="text-[11px]">
                            If condition is {isYes ? "TRUE" : "FALSE"}…
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setOutcomeProceed(i, kind)}>
                            {mode === "proceed" && <Check className="h-3.5 w-3.5 mr-2" />}
                            <span className={mode !== "proceed" ? "ml-[22px]" : ""}>
                              Proceed to next step
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (mode === "stop") {
                                // Already stop — convert to empty custom branch
                                const s = findBranchStartFor(i, kind);
                                if (s !== -1) removeBranchWithContents(s);
                                addBranch(i, kind);
                              } else if (!hasBranch) {
                                addBranch(i, kind);
                              }
                            }}
                          >
                            {mode === "branch" && <Check className="h-3.5 w-3.5 mr-2" />}
                            <span className={mode !== "branch" ? "ml-[22px]" : ""}>
                              Build a custom branch
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setOutcomeStop(i, kind)}>
                            {mode === "stop" && <Check className="h-3.5 w-3.5 mr-2" />}
                            <span className={mode !== "stop" ? "ml-[22px]" : ""}>
                              Stop automation
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                };

                return (
                  <div className="space-y-1.5 mb-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <GitBranch className="h-3 w-3" /> Branching (Logic)
                    </div>
                    {renderOutcome("yes")}
                    {renderOutcome("no")}
                  </div>
                );
              })()}

              {step.step_type === "action" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Select
                      value={(step.config.action as string) || ""}
                      onValueChange={(v) => updateStep(i, { action: v })}
                    >
                      <SelectTrigger className="w-[200px] bg-background">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_OPTIONS.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            <span className="flex items-center gap-2">{ACTION_ICONS[a.value]} {a.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {((step.config.action as string) === "add_tag" || (step.config.action as string) === "remove_tag") && (
                      <>
                        <div className="basis-full h-0" />
                        <Select
                          value={(step.config.tag as string) || ""}
                          onValueChange={(v) => updateStep(i, { tag: v })}
                        >
                          <SelectTrigger className="w-[160px] bg-background">
                            <SelectValue placeholder="Select tag" />
                          </SelectTrigger>
                          <SelectContent>
                            {AUTOMATION_TAG_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    {(step.config.action as string) === "end_automation" && (
                      <Input
                        value={(step.config.reason as string) || ""}
                        onChange={(e) => updateStep(i, { reason: e.target.value })}
                        placeholder="Optional reason (e.g. Lead converted)"
                        className="w-[280px] bg-background"
                      />
                    )}
                    {(step.config.action as string) === "update_status" && (
                      <>
                        <div className="basis-full h-0" />
                        <Select
                          value={(step.config.new_status as string) || ""}
                          onValueChange={(v) => updateStep(i, { new_status: v })}
                        >
                          <SelectTrigger className="w-[140px] bg-background">
                            <SelectValue placeholder="New status" />
                          </SelectTrigger>
                          <SelectContent>
                            {["New", "Warm", "Hot", "Won", "Customer", "Lost"].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    {(step.config.action as string) === "adjust_score" && (() => {
                      const delta = Number(step.config.score_delta ?? 5);
                      const reason = (step.config.score_reason as string) || "";
                      const matched = AUTOMATION_SCORE_OPTIONS.find(
                        (o) => o.value === delta && (!reason || o.reason === reason),
                      );
                      const selectValue = matched ? matched.reason : "";
                      return (
                        <>
                          <div className="basis-full h-0" />
                          <Select
                          value={selectValue}
                          onValueChange={(v) => {
                            const opt = AUTOMATION_SCORE_OPTIONS.find((o) => o.reason === v);
                            if (opt) updateStep(i, { score_delta: opt.value, score_reason: opt.reason });
                          }}
                        >
                          <SelectTrigger className="w-[260px] bg-background">
                            <SelectValue placeholder="Select scoring reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {AUTOMATION_SCORE_OPTIONS.map((o) => (
                              <SelectItem key={o.reason} value={o.reason}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    );
                  })()}
                    {(step.config.action as string) === "enroll_in_automation" && (() => {
                      const targetId = (step.config.target_automation_id as string) || "";
                      const options = (allAutomations || []).filter((a) => a.status === "active");
                      return (
                        <>
                          <div className="basis-full h-0" />
                        <Select
                          value={targetId}
                          onValueChange={(v) => updateStep(i, { target_automation_id: v })}
                        >
                          <SelectTrigger className="w-[260px] bg-background">
                            <SelectValue placeholder="Select automation to enroll in" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.length === 0 && (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                No active automations available
                              </div>
                            )}
                            {options.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    );
                  })()}
                    {(step.config.action as string) === "assign_owner" && (() => {
                      const mode = ((step.config.assign_mode as string) || "round_robin");
                      const userId = (step.config.assign_user_id as string) || "";
                      const notifyNewOwner = step.config.notify_new_owner !== false;
                      const channels = (step.config.channels as string[]) || ["inapp", "email"];
                      const alsoNotify = (step.config.also_notify as string[]) || [];
                      const toggle = (list: string[], val: string) =>
                        list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
                      const CHANNEL_OPTS: Array<[string, string]> = [
                        ["inapp", "In-app"], ["email", "Email"], ["sms", "SMS"], ["whatsapp", "WhatsApp"],
                      ];
                      const ALSO_OPTS: Array<[string, string]> = [
                        ["creator", "Automation creator"],
                        ["previous_owner", "Previous owner"],
                        ["all_admins", "All admins"],
                      ];
                      return (
                        <>
                          <div className="basis-full h-0" />
                          <Select
                            value={mode}
                            onValueChange={(v) => updateStep(i, { assign_mode: v, ...(v === "round_robin" ? { assign_user_id: "" } : {}) })}
                          >
                            <SelectTrigger className="w-[160px] bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="round_robin">Round-robin</SelectItem>
                              <SelectItem value="specific">Specific user</SelectItem>
                            </SelectContent>
                          </Select>
                          {mode === "specific" && (
                            <Select
                              value={userId}
                              onValueChange={(v) => updateStep(i, { assign_user_id: v })}
                            >
                              <SelectTrigger className="w-[220px] bg-background">
                                <SelectValue placeholder="Select team member" />
                              </SelectTrigger>
                              <SelectContent>
                                {(workspaceMembers || []).length === 0 && (
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                    No members found
                                  </div>
                                )}
                                {(workspaceMembers || []).map((m: any) => (
                                  <SelectItem key={m.user_id} value={m.user_id}>
                                    {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div className="basis-full" />
                          <div className="w-full space-y-3 rounded-md border border-border bg-background/40 p-3">
                            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mt-2">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5"
                                checked={notifyNewOwner}
                                onChange={(e) => updateStep(i, { notify_new_owner: e.target.checked })}
                              />
                              Notify the new owner when assigned
                            </label>
                            {notifyNewOwner && (
                              <>
                                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-3">CHANNELS</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {CHANNEL_OPTS.map(([val, label]) => (
                                    <Button
                                      key={val}
                                      type="button"
                                      size="sm"
                                      variant={channels.includes(val) ? "default" : "outline"}
                                      className="h-7 text-xs"
                                      onClick={() => updateStep(i, { channels: toggle(channels, val) })}
                                    >
                                      {label}
                                    </Button>
                                  ))}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  Email/SMS/WhatsApp use each recipient's profile contact info. Missing contacts are skipped.
                                </p>

                                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-3">ALSO NOTIFY</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {ALSO_OPTS.map(([val, label]) => (
                                    <Button
                                      key={val}
                                      type="button"
                                      size="sm"
                                      variant={alsoNotify.includes(val) ? "default" : "outline"}
                                      className="h-7 text-xs"
                                      onClick={() => updateStep(i, { also_notify: toggle(alsoNotify, val) })}
                                    >
                                      {label}
                                    </Button>
                                  ))}
                                </div>
                                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-3">TITLE</div>
                                <Input
                                  className="bg-background"
                                  placeholder="New lead assigned to you"
                                  value={(step.config.notify_title as string) || ""}
                                  onChange={(e) => updateStep(i, { notify_title: e.target.value })}
                                />
                                <div className="flex items-center justify-between mt-3">
                                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">MESSAGE</div>
                                  <InsertDropdown onInsert={(v) =>
                                    updateStep(i, { notify_message: ((step.config.notify_message as string) || "") + v })
                                  } />
                                </div>
                                <textarea
                                  className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  placeholder="{{lead.full_name}} ({{lead.email}}) was just assigned to you."
                                  value={(step.config.notify_message as string) || ""}
                                  onChange={(e) => updateStep(i, { notify_message: e.target.value })}
                                />
                              </>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {["send_email", "send_whatsapp", "send_sms"].includes(step.config.action as string) && (
                    <AutomationEmailEditor
                      isEmail={(step.config.action as string) === "send_email"}
                      channel={
                        (step.config.action as string) === "send_email"
                          ? "email"
                          : (step.config.action as string) === "send_whatsapp"
                            ? "whatsapp"
                            : "sms"
                      }
                      subject={(step.config.subject as string) || ""}
                      message={(step.config.message as string) || ""}
                      onSubjectChange={(v) => updateStep(i, { subject: v })}
                      onMessageChange={(v) => updateStep(i, { message: v })}
                      templateSettings={step.config.templateSettings as any}
                      onTemplateSettingsChange={(ts) => updateStep(i, { templateSettings: ts })}
                    />
                  )}
                  {(step.config.action as string) === "notify_sales" && (() => {
                    const recipients = (step.config.recipients as string[]) || ["lead_owner", "creator"];
                    const channels = (step.config.channels as string[]) || ["inapp", "email"];
                    const specificIds = (step.config.recipient_user_ids as string[]) || [];
                    const toggle = (list: string[], val: string) =>
                      list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
                    const RECIPIENT_OPTS: Array<[string, string]> = [
                      ["lead_owner", "Lead owner"],
                      ["creator", "Automation creator"],
                      ["all_admins", "All admins"],
                      ["all_members", "All members"],
                      ["specific", "Specific user(s)"],
                    ];
                    const CHANNEL_OPTS: Array<[string, string]> = [
                      ["inapp", "In-app"],
                      ["email", "Email"],
                      ["sms", "SMS"],
                      ["whatsapp", "WhatsApp"],
                    ];
                    return (
                      <div className="space-y-3 rounded-md border border-border bg-background/40 p-3">
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recipients</div>
                          <div className="flex flex-wrap gap-1.5">
                            {RECIPIENT_OPTS.map(([val, label]) => (
                              <Button
                                key={val}
                                type="button"
                                size="sm"
                                variant={recipients.includes(val) ? "default" : "outline"}
                                className="h-7 text-xs"
                                onClick={() => updateStep(i, { recipients: toggle(recipients, val) })}
                              >
                                {label}
                              </Button>
                            ))}
                          </div>
                          {recipients.includes("specific") && (
                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                              {(workspaceMembers || []).map((m: any) => {
                                const checked = specificIds.includes(m.user_id);
                                return (
                                  <Button
                                    key={m.user_id}
                                    type="button"
                                    size="sm"
                                    variant={checked ? "default" : "outline"}
                                    className="h-6 text-[11px]"
                                    onClick={() => updateStep(i, { recipient_user_ids: toggle(specificIds, m.user_id) })}
                                  >
                                    {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Channels</div>
                          <div className="flex flex-wrap gap-1.5">
                            {CHANNEL_OPTS.map(([val, label]) => (
                              <Button
                                key={val}
                                type="button"
                                size="sm"
                                variant={channels.includes(val) ? "default" : "outline"}
                                className="h-7 text-xs"
                                onClick={() => updateStep(i, { channels: toggle(channels, val) })}
                              >
                                {label}
                              </Button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Email/SMS/WhatsApp use each recipient's profile contact info. Missing contacts are skipped.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Title</div>
                          </div>
                          <Input
                            className="bg-background"
                            placeholder="e.g. 🔥 Hot lead — {{lead.full_name}}"
                            value={(step.config.title as string) || ""}
                            onChange={(e) => updateStep(i, { title: e.target.value })}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Message</div>
                            <InsertDropdown onInsert={(v) =>
                              updateStep(i, { message: ((step.config.message as string) || "") + v })
                            } />
                          </div>
                          <textarea
                            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Note for sales — supports {{lead.first_name}}, {{lead.email}}, etc."
                            value={(step.config.message as string) || ""}
                            onChange={(e) => updateStep(i, { message: e.target.value })}
                          />
                        </div>
                      </div>
                    );
                  })()}
                  {(step.config.action as string) && !["send_email", "send_whatsapp", "send_sms", "notify_sales", "add_tag", "remove_tag", "update_status", "adjust_score", "assign_owner", "enroll_in_automation", "end_automation"].includes(step.config.action as string) && (
                    <InsertDropdown onInsert={(v) => {
                      const action = step.config.action as string;
                      if (action === "add_tag" || action === "remove_tag") {
                        updateStep(i, { tag: ((step.config.tag as string) || "") + v });
                      }
                    }} />
                  )}
                </div>
              )}

              {step.step_type === "delay" && (
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={1}
                    className="w-[80px] bg-background"
                    value={(step.config.duration as number) || 60}
                    onChange={(e) => updateStep(i, { duration: parseInt(e.target.value) || 1 })}
                  />
                  <Select
                    value={(step.config.unit as string) || "minutes"}
                    onValueChange={(v) => updateStep(i, { unit: v })}
                  >
                    <SelectTrigger className="w-[120px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add step buttons */}
      <div className="flex justify-center py-1">
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={() => addStep("condition")} className="gap-1.5">
          <Filter className="h-3.5 w-3.5" /> Add Condition
        </Button>
        <Button variant="outline" size="sm" onClick={() => addStep("action")} className="gap-1.5">
          <Play className="h-3.5 w-3.5" /> Add Action
        </Button>
        <Button variant="outline" size="sm" onClick={() => addStep("delay")} className="gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Add Delay
        </Button>
      </div>
    </div>
  );
}
