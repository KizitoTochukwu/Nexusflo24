import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Minus, Trash2, GripVertical, Zap, Filter, Play, Clock,
  Mail, MessageCircle, Smartphone, Tag, XCircle, RefreshCw, Bell, ArrowDown, Sparkles, DoorOpen, TrendingUp, X, GitBranch, UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONDITION_GROUPS, ACTION_OPTIONS, REPLY_STATUS_OPTIONS, operatorLabel, useAutomations, type ConditionOperator } from "@/hooks/useAutomations";
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
        const condBranchInfo = step.step_type === "condition" ? branchInfoForCondition(i) : null;
        return (
          <div key={i} className={inBranchClass}>
            <div className="flex justify-center py-1">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className={`rounded-lg border p-3 pr-[12px] ml-0 mr-0 ${meta.color}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => moveStep(i, i - 1)} className="cursor-grab opacity-50 hover:opacity-100">
                    <GripVertical className="h-4 w-4" />
                  </button>
                  {meta.icon}
                  <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeStep(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {condBranchInfo && (!condBranchInfo.hasYes || !condBranchInfo.hasNo) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-[11px] font-medium text-muted-foreground inline-flex items-center gap-1">
                    <GitBranch className="h-3 w-3" /> Fork:
                  </span>
                  {!condBranchInfo.hasYes && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      onClick={() => addBranch(i, "yes")}
                    >
                      <Plus className="h-3 w-3" /> If YES branch
                    </Button>
                  )}
                  {!condBranchInfo.hasNo && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] gap-1 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      onClick={() => addBranch(i, "no")}
                    >
                      <Plus className="h-3 w-3" /> If NO branch
                    </Button>
                  )}
                </div>
              )}

              {step.step_type === "condition" && (() => {
                const currentValue = (step.config.condition as string) || "";
                const allOptions = CONDITION_GROUPS.flatMap((g) => g.options);
                const selectedOpt = allOptions.find((o) => o.value === currentValue);
                const currentOperator = (step.config.operator as ConditionOperator) ||
                  (selectedOpt?.operators?.[0] ?? "equals");
                const operatorNeedsValue = !["is_known", "is_unknown", "happened", "not_happened"].includes(currentOperator);
                const isBetween = currentOperator === "between";

                const addSuggested = (sa: { action: string; defaults?: Record<string, unknown> }) => {
                  const newStep: StepData = {
                    step_type: "action",
                    config: { action: sa.action, ...(sa.defaults || {}) },
                  };
                  // Insert immediately after the current condition step
                  const updated = [...steps];
                  updated.splice(i + 1, 0, newStep);
                  onChange(updated);
                };

                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Select
                        value={currentValue}
                        onValueChange={(v) => {
                          const opt = allOptions.find((o) => o.value === v);
                          const defaultOp = opt?.operators?.[0] ?? "equals";
                          if (v === "reply_status") {
                            updateStep(i, { condition: v, operator: undefined, reply_check: "has_replied", value: "", value_to: "", time_window_days: undefined });
                          } else {
                            updateStep(i, { condition: v, operator: defaultOp, reply_check: undefined, value: "", value_to: "", time_window_days: undefined });
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

                      {/* Operator */}
                      {selectedOpt && selectedOpt.operators.length > 0 && (
                        <Select
                          value={currentOperator}
                          onValueChange={(v) => updateStep(i, { operator: v, ...(v === "between" ? {} : { value_to: "" }) })}
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

                      {/* Value(s) */}
                      {selectedOpt && operatorNeedsValue && selectedOpt.input !== "none" && (
                        <Input
                          type={selectedOpt.input === "number" ? "number" : "text"}
                          placeholder={selectedOpt.placeholder || "Value"}
                          className="w-[160px] bg-background"
                          value={(step.config.value as string) || ""}
                          onChange={(e) => updateStep(i, { value: e.target.value })}
                        />
                      )}
                      {selectedOpt && isBetween && selectedOpt.input !== "none" && (
                        <>
                          <span className="text-xs text-muted-foreground">and</span>
                          <Input
                            type={selectedOpt.input === "number" ? "number" : "text"}
                            placeholder="Upper value"
                            className="w-[120px] bg-background"
                            value={(step.config.value_to as string) || ""}
                            onChange={(e) => updateStep(i, { value_to: e.target.value })}
                          />
                        </>
                      )}

                      {/* Time window */}
                      {selectedOpt?.timeWindow && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">in last</span>
                          <Input
                            type="number"
                            min={1}
                            placeholder="∞"
                            className="w-[70px] bg-background"
                            value={(step.config.time_window_days as number | string) ?? ""}
                            onChange={(e) => updateStep(i, { time_window_days: e.target.value === "" ? undefined : parseInt(e.target.value) || undefined })}
                          />
                          <span className="text-xs text-muted-foreground">days</span>
                        </div>
                      )}
                    </div>

                    {currentValue === "reply_status" && (
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

                    {/* Smart actions — curated one-click follow-ups (workspace overrides → defaults) */}
                    {(() => {
                      const effective = selectedOpt ? resolveSmartActions(selectedOpt.value, smartActionOverrides) : [];
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
                    )}
                    {(step.config.action as string) === "adjust_score" && (() => {
                      const delta = Number(step.config.score_delta ?? 5);
                      const reason = (step.config.score_reason as string) || "";
                      const matched = AUTOMATION_SCORE_OPTIONS.find(
                        (o) => o.value === delta && (!reason || o.reason === reason),
                      );
                      const selectValue = matched ? matched.reason : "";
                      return (
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
                      );
                    })()}
                    {(step.config.action as string) === "enroll_in_automation" && (() => {
                      const targetId = (step.config.target_automation_id as string) || "";
                      const options = (allAutomations || []).filter((a) => a.status === "active");
                      return (
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
                      );
                    })()}
                    {(step.config.action as string) === "assign_owner" && (() => {
                      const mode = ((step.config.assign_mode as string) || "round_robin");
                      const userId = (step.config.assign_user_id as string) || "";
                      return (
                        <>
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
                        </>
                      );
                    })()}
                  </div>
                  {["send_whatsapp", "send_sms"].includes(step.config.action as string) && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded p-2">
                      Tip: leads from email-only forms (newsletter, lead magnets) usually have no phone — this step will be auto-skipped for them. Add a <strong>Condition: phone_known</strong> earlier if you want to branch instead.
                    </div>
                  )}
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
                  {(step.config.action as string) && !["send_email", "send_whatsapp", "send_sms"].includes(step.config.action as string) && (
                    <InsertDropdown onInsert={(v) => {
                      const action = step.config.action as string;
                      if (action === "add_tag" || action === "remove_tag") {
                        updateStep(i, { tag: ((step.config.tag as string) || "") + v });
                      } else if (action === "notify_sales") {
                        updateStep(i, { message: ((step.config.message as string) || "") + v });
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
        {onExitCriteriaChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800">
                <DoorOpen className="h-3.5 w-3.5" />
                Exit criteria
                {exitCriteria && exitCriteria.length > 0 && (
                  <Badge variant="outline" className="ml-1 h-5 px-1.5 bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                    {exitCriteria.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[480px] p-0 max-h-[70vh] overflow-y-auto" align="end">
              <div className="p-3">
                <ExitCriteriaEditor
                  value={exitCriteria ?? []}
                  onChange={onExitCriteriaChange}
                  triggerType={triggerType}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
