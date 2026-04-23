import { useMemo, useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Trash2, Save, RotateCcw, Mail, MessageCircle, Smartphone, Tag, XCircle, RefreshCw, Bell, Clock, Download, AlertTriangle } from "lucide-react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { CONDITION_GROUPS, ACTION_OPTIONS } from "@/hooks/useAutomations";
import { useSmartActionOverrides, useSaveSmartActions, useResetSmartActions, useResetAllSmartActions, resolveSmartActions, type SmartAction } from "@/hooks/useSmartActions";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ACTION_ICON: Record<string, React.ReactNode> = {
  send_email: <Mail className="h-3.5 w-3.5" />,
  send_whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
  send_sms: <Smartphone className="h-3.5 w-3.5" />,
  add_tag: <Tag className="h-3.5 w-3.5" />,
  remove_tag: <XCircle className="h-3.5 w-3.5" />,
  update_status: <RefreshCw className="h-3.5 w-3.5" />,
  notify_sales: <Bell className="h-3.5 w-3.5" />,
  delay: <Clock className="h-3.5 w-3.5" />,
};

const PIPELINE_STAGES = ["New", "Contacted", "Engaged", "Qualified", "Warm", "Hot", "Won", "Lost"];

function defaultsEditorFields(action: string, defaults: Record<string, unknown>, onChange: (d: Record<string, unknown>) => void) {
  const set = (k: string, v: unknown) => onChange({ ...defaults, [k]: v });
  switch (action) {
    case "send_email":
      return (
        <div className="grid gap-2">
          <Input placeholder="Subject" value={(defaults.subject as string) || ""} onChange={(e) => set("subject", e.target.value)} />
          <Textarea placeholder="Message body (optional, supports {{first_name}})" value={(defaults.message as string) || ""} onChange={(e) => set("message", e.target.value)} className="min-h-[80px]" />
        </div>
      );
    case "send_whatsapp":
    case "send_sms":
      return (
        <Textarea placeholder="Message body (supports {{first_name}})" value={(defaults.message as string) || ""} onChange={(e) => set("message", e.target.value)} className="min-h-[70px]" />
      );
    case "add_tag":
    case "remove_tag":
      return <Input placeholder="Tag name" value={(defaults.tag as string) || ""} onChange={(e) => set("tag", e.target.value)} />;
    case "update_status":
      return (
        <Select value={(defaults.new_status as string) || ""} onValueChange={(v) => set("new_status", v)}>
          <SelectTrigger><SelectValue placeholder="Pipeline stage" /></SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "notify_sales":
      return <Input placeholder="Note for sales (optional)" value={(defaults.message as string) || ""} onChange={(e) => set("message", e.target.value)} />;
    default:
      return null;
  }
}

export default function AdminSmartActions() {
  const workspaceId = useWorkspaceId();
  const { data: overrides, isLoading } = useSmartActionOverrides(workspaceId);
  const save = useSaveSmartActions();
  const reset = useResetSmartActions();
  const resetAll = useResetAllSmartActions();

  const allConditions = useMemo(() => CONDITION_GROUPS.flatMap((g) => g.options.map((o) => ({ ...o, group: g.label }))), []);
  const [selectedCondition, setSelectedCondition] = useState<string>(allConditions[0]?.value ?? "");
  const [draft, setDraft] = useState<SmartAction[]>([]);

  const selectedOpt = allConditions.find((o) => o.value === selectedCondition);
  const isOverridden = !!(overrides && overrides[selectedCondition]);
  const codeDefaults: SmartAction[] = (selectedOpt?.suggestedActions as SmartAction[] | undefined) ?? [];
  const overriddenCount = overrides ? Object.keys(overrides).length : 0;

  // Drift = saved override differs from the current code defaults (i.e. defaults have evolved).
  const driftFromDefaults = useMemo(() => {
    if (!isOverridden) return false;
    return JSON.stringify(overrides![selectedCondition]) !== JSON.stringify(codeDefaults);
  }, [isOverridden, overrides, selectedCondition, codeDefaults]);

  // Load current effective list into draft when condition or overrides change
  useEffect(() => {
    if (!selectedCondition) return;
    setDraft(resolveSmartActions(selectedCondition, overrides));
  }, [selectedCondition, overrides]);

  const updateAction = (idx: number, patch: Partial<SmartAction>) => {
    setDraft((d) => d.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };
  const removeAction = (idx: number) => setDraft((d) => d.filter((_, i) => i !== idx));
  const addAction = () =>
    setDraft((d) => [...d, { action: "send_email", label: "New action", defaults: {} }]);
  const moveAction = (from: number, to: number) => {
    if (to < 0 || to >= draft.length) return;
    const next = [...draft];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setDraft(next);
  };

  const handleSave = () => {
    save.mutate({ workspace_id: workspaceId, condition_value: selectedCondition, actions: draft });
  };
  const handleReset = () => {
    // Removes the override row so the builder uses the latest code defaults.
    reset.mutate({ workspace_id: workspaceId, condition_value: selectedCondition });
  };
  const handleLoadLatestDefaults = () => {
    // Local preview: load current code defaults into the editor (still need Save to persist).
    setDraft(codeDefaults.map((a) => ({ ...a, defaults: { ...(a.defaults || {}) } })));
  };
  const handleResetAll = () => {
    resetAll.mutate({ workspace_id: workspaceId });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" /> Smart Actions Editor
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize the one-click follow-up chips shown in the Automation builder for each condition.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={overriddenCount === 0 || resetAll.isPending}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset all to latest defaults
              {overriddenCount > 0 && <Badge variant="secondary" className="ml-2">{overriddenCount}</Badge>}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Reset all custom smart actions?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This removes <strong>{overriddenCount}</strong> custom override{overriddenCount === 1 ? "" : "s"} for this workspace.
                Every condition will fall back to the latest built-in defaults — including any improvements shipped in future releases.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetAll}>Reset all</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Condition picker */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conditions</CardTitle>
            <CardDescription className="text-xs">Pick a condition to edit its smart actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
            {CONDITION_GROUPS.map((group) => (
              <div key={group.label} className="mb-3">
                <div className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground px-2 mb-1">
                  {group.label}
                </div>
                {group.options.map((o) => {
                  const overridden = !!(overrides && overrides[o.value]);
                  const isActive = o.value === selectedCondition;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setSelectedCondition(o.value)}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded-md flex items-center justify-between gap-2 ${
                        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{o.label}</span>
                      {overridden && (
                        <Badge variant="outline" className={isActive ? "border-primary-foreground/40 text-primary-foreground" : "text-amber-700 border-amber-200 bg-amber-50"}>
                          custom
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card>
          <CardHeader className="pb-3 flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {selectedOpt?.label}
                {isOverridden ? (
                  <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">Custom</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Default</Badge>
                )}
                {driftFromDefaults && (
                  <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                    New defaults available
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                These chips appear under the condition in the automation builder. Click one to insert the action with its pre-filled values.
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadLatestDefaults}
                disabled={codeDefaults.length === 0}
                title="Load the latest built-in defaults into the editor (does not save)"
              >
                <Download className="h-3.5 w-3.5 mr-1" /> Load latest defaults
              </Button>
              {isOverridden && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={reset.isPending}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to latest defaults
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset “{selectedOpt?.label}” to latest defaults?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your custom version will be removed and the condition will use the latest built-in defaults — including any future improvements shipped in releases.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button size="sm" onClick={handleSave} disabled={save.isPending || isLoading}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {driftFromDefaults && (
              <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  We've shipped updated defaults for this condition since you last customized it.
                  Use <strong>Load latest defaults</strong> to preview them, or <strong>Reset to latest defaults</strong> to adopt them now.
                </div>
              </div>
            )}

            {draft.length === 0 && (
              <div className="text-sm text-muted-foreground border border-dashed rounded-md p-6 text-center">
                No smart actions yet for this condition.
              </div>
            )}

            {draft.map((sa, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={sa.action} onValueChange={(v) => updateAction(idx, { action: v, defaults: {} })}>
                    <SelectTrigger className="w-[200px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          <span className="flex items-center gap-2">
                            {ACTION_ICON[a.value]} {a.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1 min-w-[180px] bg-background"
                    placeholder="Chip label (e.g. Send discount email)"
                    value={sa.label}
                    onChange={(e) => updateAction(idx, { label: e.target.value })}
                  />
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveAction(idx, idx - 1)} disabled={idx === 0}>↑</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveAction(idx, idx + 1)} disabled={idx === draft.length - 1}>↓</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeAction(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>{defaultsEditorFields(sa.action, sa.defaults || {}, (d) => updateAction(idx, { defaults: d }))}</div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addAction} className="w-full border-dashed">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add smart action
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
