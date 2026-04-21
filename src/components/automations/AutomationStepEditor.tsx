import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Trash2, GripVertical, Zap, Filter, Play, Clock,
  Mail, MessageCircle, Smartphone, Tag, XCircle, RefreshCw, Bell, ArrowDown
} from "lucide-react";
import { CONDITION_OPTIONS, ACTION_OPTIONS } from "@/hooks/useAutomations";
import AutomationEmailEditor from "./email-editor/AutomationEmailEditor";
import InsertDropdown from "./email-editor/InsertDropdown";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useLeadFolders } from "@/hooks/useLeadFolders";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceInvites";

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
  move_to_stage: <RefreshCw className="h-4 w-4" />,
  assign_to_team: <Bell className="h-4 w-4" />,
  move_to_folder: <Tag className="h-4 w-4" />,
  trigger_ai_closer: <MessageCircle className="h-4 w-4" />,
  create_task: <Bell className="h-4 w-4" />,
  webhook_out: <Zap className="h-4 w-4" />,
  add_to_campaign: <Mail className="h-4 w-4" />,
  notify_sales: <Bell className="h-4 w-4" />,
  delay: <Clock className="h-4 w-4" />,
};

const PIPELINE_STAGES = ["new_lead", "contacted", "engaged", "qualified", "demo_booked", "proposal_sent", "won", "lost"];
const PIPELINE_STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  engaged: "Engaged",
  qualified: "Qualified",
  demo_booked: "Demo Booked",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
};
const LEAD_STATUSES = ["New", "Warm", "Hot", "Won", "Lost"];
const DAYS_OF_WEEK = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "0", label: "Sun" },
];

interface Props {
  steps: StepData[];
  onChange: (steps: StepData[]) => void;
  triggerType: string;
}

export default function AutomationStepEditor({ steps, onChange, triggerType }: Props) {
  const workspaceId = useWorkspaceId();
  const { data: folders = [] } = useLeadFolders(workspaceId || "");
  const { data: campaigns = [] } = useCampaigns(workspaceId || "");
  const { data: members = [] } = useWorkspaceMembers(workspaceId || "");

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

  const renderConditionInputs = (i: number, step: StepData) => {
    const conditionType = (step.config.condition as string) || "";
    const meta = CONDITION_OPTIONS.find((c) => c.value === conditionType) as
      | { value: string; label: string; configKey: string; secondaryConfigKey?: string }
      | undefined;

    if (!conditionType || conditionType === "reply_status") return null;

    // Boolean conditions — no input
    if (["has_booked_appointment", "has_unsubscribed", "has_email", "has_phone"].includes(conditionType)) {
      return null;
    }

    // Pipeline stage picker
    if (conditionType === "pipeline_stage_equals") {
      return (
        <Select
          value={(step.config.stage as string) || ""}
          onValueChange={(v) => updateStep(i, { stage: v })}
        >
          <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Pipeline stage" /></SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{PIPELINE_STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Status picker
    if (conditionType === "status_equals") {
      return (
        <Select
          value={(step.config.status as string) || ""}
          onValueChange={(v) => updateStep(i, { status: v })}
        >
          <SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Lead status" /></SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    // Folder picker
    if (conditionType === "in_folder") {
      return (
        <Select
          value={(step.config.folder_id as string) || ""}
          onValueChange={(v) => updateStep(i, { folder_id: v })}
        >
          <SelectTrigger className="w-[200px] bg-background"><SelectValue placeholder="Pick folder" /></SelectTrigger>
          <SelectContent>
            {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    // Day-of-week multi (comma list)
    if (conditionType === "day_of_week_is") {
      const selected = ((step.config.days_of_week as string) || "").split(",").filter(Boolean);
      const toggle = (v: string) => {
        const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
        updateStep(i, { days_of_week: next.join(",") });
      };
      return (
        <div className="flex flex-wrap gap-1">
          {DAYS_OF_WEEK.map((d) => (
            <Button
              key={d.value}
              type="button"
              size="sm"
              variant={selected.includes(d.value) ? "default" : "outline"}
              onClick={() => toggle(d.value)}
              className="h-7 px-2 text-xs"
            >{d.label}</Button>
          ))}
        </div>
      );
    }

    // Score range
    if (conditionType === "score_between") {
      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            placeholder="Min"
            className="w-[80px] bg-background"
            value={(step.config.min as string) ?? ""}
            onChange={(e) => updateStep(i, { min: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="Max"
            className="w-[80px] bg-background"
            value={(step.config.max as string) ?? ""}
            onChange={(e) => updateStep(i, { max: e.target.value })}
          />
        </div>
      );
    }

    // Numeric inputs (days/threshold)
    if (meta && (meta.configKey === "days" || meta.configKey === "threshold")) {
      const isDays = meta.configKey === "days";
      const key = meta.configKey;
      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            placeholder={isDays ? "N days" : "Score"}
            className="w-[120px] bg-background"
            value={(step.config[key] as string) ?? ""}
            onChange={(e) => updateStep(i, { [key]: e.target.value })}
          />
          {isDays && <span className="text-xs text-muted-foreground">days</span>}
        </div>
      );
    }

    // Default text input
    return (
      <Input
        placeholder="Value"
        className="w-[160px] bg-background"
        value={(step.config.value as string) || ""}
        onChange={(e) => updateStep(i, { value: e.target.value })}
      />
    );
  };

  const renderActionInputs = (i: number, step: StepData) => {
    const action = (step.config.action as string) || "";

    if (action === "add_tag" || action === "remove_tag") {
      return (
        <Input
          placeholder="Tag name"
          className="w-[160px] bg-background"
          value={(step.config.tag as string) || ""}
          onChange={(e) => updateStep(i, { tag: e.target.value })}
        />
      );
    }

    if (action === "update_status") {
      return (
        <Select value={(step.config.new_status as string) || ""} onValueChange={(v) => updateStep(i, { new_status: v })}>
          <SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="New status" /></SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    if (action === "move_to_stage") {
      return (
        <Select value={(step.config.stage as string) || ""} onValueChange={(v) => updateStep(i, { stage: v })}>
          <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Pipeline stage" /></SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{PIPELINE_STAGE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    if (action === "move_to_folder") {
      return (
        <Select value={(step.config.folder_id as string) || ""} onValueChange={(v) => updateStep(i, { folder_id: v })}>
          <SelectTrigger className="w-[200px] bg-background"><SelectValue placeholder="Pick folder" /></SelectTrigger>
          <SelectContent>
            {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    if (action === "assign_to_team") {
      return (
        <Select value={(step.config.assignee as string) || "round_robin"} onValueChange={(v) => updateStep(i, { assignee: v })}>
          <SelectTrigger className="w-[220px] bg-background"><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="round_robin">Round-robin</SelectItem>
            {members.map((m: any) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.profile?.full_name || m.profile?.email || m.user_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (action === "add_to_campaign") {
      return (
        <Select value={(step.config.campaign_id as string) || ""} onValueChange={(v) => updateStep(i, { campaign_id: v })}>
          <SelectTrigger className="w-[240px] bg-background"><SelectValue placeholder="Pick campaign" /></SelectTrigger>
          <SelectContent>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    if (action === "webhook_out") {
      return (
        <div className="flex flex-col gap-2 w-full">
          <Input
            placeholder="https://hook.example.com/lead"
            className="bg-background"
            value={(step.config.webhook_url as string) || ""}
            onChange={(e) => updateStep(i, { webhook_url: e.target.value })}
          />
          <Input
            placeholder='Optional headers JSON: {"X-Token":"..."}'
            className="bg-background text-xs"
            value={(step.config.webhook_headers as string) || ""}
            onChange={(e) => updateStep(i, { webhook_headers: e.target.value })}
          />
        </div>
      );
    }

    if (action === "create_task") {
      return (
        <div className="flex flex-col gap-2 w-full">
          <Input
            placeholder="Task title"
            className="bg-background"
            value={(step.config.task_title as string) || ""}
            onChange={(e) => updateStep(i, { task_title: e.target.value })}
          />
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min={0}
              placeholder="Due in days"
              className="w-[140px] bg-background"
              value={(step.config.due_in_days as string) ?? ""}
              onChange={(e) => updateStep(i, { due_in_days: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">days from now</span>
          </div>
        </div>
      );
    }

    if (action === "trigger_ai_closer") {
      return (
        <div className="text-xs text-muted-foreground">
          Hands lead off to Nexus AI Sales Closer using your workspace settings.
        </div>
      );
    }

    return null;
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

              {step.step_type === "condition" && (
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={(step.config.condition as string) || ""}
                    onValueChange={(v) => {
                      if (v === "reply_status") {
                        updateStep(i, { condition: v, reply_check: "has_replied", value: "" });
                      } else {
                        updateStep(i, { condition: v, reply_check: undefined });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[240px] bg-background">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px]">
                      {CONDITION_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(step.config.condition as string) === "reply_status" && (
                    <div className="w-full space-y-2 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium min-w-[100px]">If replied →</span>
                        <Select
                          value={(step.config.replied_action as string) || ""}
                          onValueChange={(v) => updateStep(i, { replied_action: v })}
                        >
                          <SelectTrigger className="w-[180px] bg-background">
                            <SelectValue placeholder="Move to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((s) => (
                              <SelectItem key={s} value={s}>{PIPELINE_STAGE_LABELS[s]}</SelectItem>
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
                          <SelectTrigger className="w-[200px] bg-background">
                            <SelectValue placeholder="Choose action..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="continue">Continue sequence</SelectItem>
                            {PIPELINE_STAGES.map((s) => (
                              <SelectItem key={s} value={s}>Move to {PIPELINE_STAGE_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {renderConditionInputs(i, step)}
                </div>
              )}

              {step.step_type === "action" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Select
                      value={(step.config.action as string) || ""}
                      onValueChange={(v) => updateStep(i, { action: v })}
                    >
                      <SelectTrigger className="w-[220px] bg-background">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[320px]">
                        {ACTION_OPTIONS.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            <span className="flex items-center gap-2">{ACTION_ICONS[a.value]} {a.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {renderActionInputs(i, step)}
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
                      } else if (action === "notify_sales" || action === "create_task") {
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
