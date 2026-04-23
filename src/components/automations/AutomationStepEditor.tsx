import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, GripVertical, Zap, Filter, Play, Clock,
  Mail, MessageCircle, Smartphone, Tag, XCircle, RefreshCw, Bell, ArrowDown, Sparkles
} from "lucide-react";
import { CONDITION_GROUPS, ACTION_OPTIONS, REPLY_STATUS_OPTIONS, operatorLabel, type ConditionOperator } from "@/hooks/useAutomations";
import { useSmartActionOverrides, resolveSmartActions } from "@/hooks/useSmartActions";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import AutomationEmailEditor from "./email-editor/AutomationEmailEditor";
import InsertDropdown from "./email-editor/InsertDropdown";

export type StepData = {
  step_type: "trigger" | "condition" | "action" | "delay";
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
  notify_sales: <Bell className="h-4 w-4" />,
  delay: <Clock className="h-4 w-4" />,
};

const PIPELINE_STAGES = ["New", "Contacted", "Engaged", "Qualified", "Warm", "Hot", "Won", "Lost"];
interface Props {
  steps: StepData[];
  onChange: (steps: StepData[]) => void;
  triggerType: string;
}

export default function AutomationStepEditor({ steps, onChange, triggerType }: Props) {
  const workspaceId = useWorkspaceId();
  const { data: smartActionOverrides } = useSmartActionOverrides(workspaceId);

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
        const meta = STEP_TYPE_META[step.step_type];
        return (
          <div key={i}>
            <div className="flex justify-center py-1">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className={`rounded-lg border p-3 ${meta.color}`}>
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
                      <Input
                        placeholder="Tag name"
                        className="w-[140px] bg-background"
                        value={(step.config.tag as string) || ""}
                        onChange={(e) => updateStep(i, { tag: e.target.value })}
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
                          {["New", "Warm", "Hot", "Won", "Lost"].map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {["send_email", "send_whatsapp", "send_sms"].includes(step.config.action as string) && (
                    <AutomationEmailEditor
                      isEmail={(step.config.action as string) === "send_email"}
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
      </div>
    </div>
  );
}
