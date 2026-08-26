import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Stethoscope } from "lucide-react";
import type { Automation } from "@/hooks/useAutomations";

type Finding = {
  automationId: string;
  automationName: string;
  severity: "warning" | "info";
  title: string;
  detail: string;
};

/**
 * Workspace-level configuration health for automations. Findings are surfaced
 * only — nothing is auto-disabled or auto-edited.
 */
export default function AutomationHealthPanel({
  workspaceId,
  automations,
  onOpen,
}: {
  workspaceId: string;
  automations: Automation[];
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: steps, isLoading } = useQuery({
    queryKey: ["automation-health-steps", workspaceId, automations.length],
    queryFn: async () => {
      const ids = automations.map((a) => a.id);
      if (!ids.length) return [] as any[];
      const { data, error } = await supabase
        .from("automation_steps")
        .select("automation_id, step_type, config, step_order")
        .in("automation_id", ids);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId && automations.length > 0,
    staleTime: 30_000,
  });

  const findings = useMemo<Finding[]>(() => {
    if (!steps) return [];
    const byAutomation = new Map<string, any[]>();
    for (const s of steps) {
      const arr = byAutomation.get(s.automation_id) ?? [];
      arr.push(s);
      byAutomation.set(s.automation_id, arr);
    }

    const nameCounts = new Map<string, number>();
    for (const a of automations) {
      const key = a.name.trim().toLowerCase();
      nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    }

    const triggerCounts = new Map<string, number>();
    for (const a of automations.filter((x) => x.status === "active")) {
      const key = `${a.trigger_event || a.trigger_type}`;
      triggerCounts.set(key, (triggerCounts.get(key) ?? 0) + 1);
    }

    const out: Finding[] = [];
    for (const a of automations) {
      const mySteps = (byAutomation.get(a.id) ?? []).sort((x, y) => (x.step_order ?? 0) - (y.step_order ?? 0));
      const push = (severity: Finding["severity"], title: string, detail: string) =>
        out.push({ automationId: a.id, automationName: a.name, severity, title, detail });

      if (a.status === "active" && mySteps.length === 0)
        push("warning", "Active with no steps", "This automation is live but will do nothing when it fires.");

      if (a.status === "active" && (!a.exit_criteria || (a.exit_criteria as unknown[]).length === 0))
        push("warning", "No exit criteria", "Contacts keep receiving messages after they buy or unsubscribe.");

      const sends = mySteps.filter((s) =>
        ["send_email", "send_sms", "send_whatsapp"].includes(String((s.config as any)?.action ?? s.step_type)),
      );
      const emptySend = sends.find((s) => {
        const cfg = (s.config as any) ?? {};
        return !String(cfg.message ?? cfg.body ?? cfg.html ?? cfg.content_sid ?? cfg.template_id ?? "").trim();
      });
      if (emptySend) push("warning", "Empty message step", "One or more send steps have no message content configured.");

      const badDelay = mySteps.find((s) => {
        const cfg = (s.config as any) ?? {};
        if (String(s.step_type) !== "delay" && String(cfg.action) !== "delay") return false;
        const dur = Number(cfg.duration ?? cfg.delay_duration ?? cfg.value ?? 0);
        return !dur || dur <= 0;
      });
      if (badDelay) push("warning", "Invalid delay", "A wait step has no valid duration and will be skipped.");

      const tagSteps = mySteps.filter((s) =>
        ["add_tag", "remove_tag"].includes(String((s.config as any)?.action ?? s.step_type)),
      );
      if (tagSteps.some((s) => !String((s.config as any)?.tag ?? "").trim()))
        push("warning", "Tag step without a tag", "Pick a workspace tag or the step will do nothing.");

      if (mySteps.some((s) => String((s.config as any)?.action) === "enroll_in_automation" && (s.config as any)?.automation_id === a.id))
        push("warning", "Recursive enrolment", "This automation enrols contacts into itself, which can loop.");

      if (a.status === "draft" && mySteps.length > 0)
        push("info", "Draft never activated", "Steps are configured but the automation is not live.");

      if ((nameCounts.get(a.name.trim().toLowerCase()) ?? 0) > 1)
        push("info", "Duplicate name", "Another automation shares this name — reporting will be hard to read.");

      const trigKey = `${a.trigger_event || a.trigger_type}`;
      if (a.status === "active" && (triggerCounts.get(trigKey) ?? 0) > 1)
        push("info", "Overlapping trigger", `${triggerCounts.get(trigKey)} active automations fire on the same trigger.`);
    }
    return out;
  }, [steps, automations]);

  if (automations.length === 0) return null;

  const warnings = findings.filter((f) => f.severity === "warning");
  const visible = expanded ? findings : findings.slice(0, 3);

  return (
    <div className="mt-4 rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Automation health</h2>
          {isLoading ? null : findings.length === 0 ? (
            <Badge variant="outline" className="gap-1 text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> All clear
            </Badge>
          ) : (
            <Badge variant={warnings.length ? "destructive" : "secondary"}>
              {findings.length} finding{findings.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        {findings.length > 3 && (
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Show less" : `Show all ${findings.length}`}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : findings.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No configuration problems detected across your automations.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((f, i) => (
            <li
              key={`${f.automationId}-${f.title}-${i}`}
              className="flex items-start justify-between gap-3 rounded-lg border p-2.5"
            >
              <div className="flex min-w-0 items-start gap-2">
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${f.severity === "warning" ? "text-amber-600" : "text-muted-foreground"}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {f.title} <span className="font-normal text-muted-foreground">· {f.automationName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{f.detail}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => onOpen(f.automationId)}>
                Review
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
