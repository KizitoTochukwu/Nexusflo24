// Shared "Enrollment trigger" card used in the Workflows editor and the
// Automations create dialog / details drawer. Renders the gold trigger tile,
// configured/incomplete/error status pill, one-line summary, scope chips, and
// an "Edit trigger" button that opens EnrollmentTriggerDrawer.
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, FlaskConical, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EnrollmentTriggerDrawer, { type EnrollmentTriggerPatch } from "./EnrollmentTriggerDrawer";
import TriggerActivityPanel from "./TriggerActivityPanel";
import {
  ENROLLMENT_OBJECTS,
  TRIGGER_SOURCES,
  configurationStatus,
  friendlyTriggerLabel,
  scopeSummary,
  type EnrollmentObject,
} from "@/lib/workflows/triggerCatalog";

export interface EnrollmentTriggerRecord {
  id?: string;
  workspace_id?: string;
  name?: string;
  enrollment_object_type?: string | null;
  enrollment_method?: string | null;
  trigger_source?: string | null;
  trigger_event?: string | null;
  trigger_config?: Record<string, any> | null;
  filter_groups?: any[] | null;
  reenrollment_config?: { mode?: string; wait_amount?: number; wait_unit?: string } | null;
  trigger_summary?: string | null;
}

interface Props {
  record: EnrollmentTriggerRecord;
  enrollmentObject: EnrollmentObject;
  recordKind?: "workflow" | "automation";
  onChange: (patch: EnrollmentTriggerPatch) => Promise<void> | void;
}

export default function EnrollmentTriggerCard({
  record,
  enrollmentObject,
  recordKind = "workflow",
  onChange,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [testing, setTesting] = useState(false);

  const status = configurationStatus(record);
  const friendly = friendlyTriggerLabel(record.trigger_source, record.trigger_event);
  const scope = scopeSummary(record);
  const objDef = ENROLLMENT_OBJECTS.find((o) => o.key === enrollmentObject);
  const srcDef = record.trigger_source
    ? TRIGGER_SOURCES.find((s) => s.key === record.trigger_source)
    : undefined;

  const runTest = async () => {
    if (!record.trigger_event) return;
    setTesting(true);
    try {
      const body: Record<string, any> = {
        trigger_source: record.trigger_source,
        trigger_event: record.trigger_event,
        trigger_config: record.trigger_config || {},
        filter_groups: record.filter_groups || [],
        record_kind: recordKind,
        workspace_id: record.workspace_id,
      };
      if (record.id) {
        if (recordKind === "automation") body.automation_id = record.id;
        else body.workflow_id = record.id;
      }
      const { data, error } = await supabase.functions.invoke("test-workflow-trigger", { body });
      if (error) throw error;
      toast[data?.passed ? "success" : "message"](
        data?.passed ? "Test passed" : "Test ran — filters did not pass"
      );
    } catch (e: any) {
      toast.error(e?.message || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const statusPill =
    status === "configured" ? (
      <Badge className="bg-green-600 hover:bg-green-600">Configured</Badge>
    ) : status === "error" ? (
      <Badge variant="destructive">Error</Badge>
    ) : (
      <Badge variant="outline" className="border-amber-500/60 text-amber-700">Incomplete</Badge>
    );

  return (
    <>
      <div className="rounded-lg border-2 border-accent/60 bg-accent/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Enrollment trigger
            </div>
          </div>
          {statusPill}
        </div>
        <div>
          <div className="text-sm font-medium text-primary">{friendly}</div>
          <div className="text-xs text-muted-foreground">
            {objDef?.label ?? "Record"} · {srcDef?.label ?? "No source selected"}
          </div>
          {scope && <div className="mt-1 text-[11px] text-muted-foreground">{scope}</div>}
          <div className="mt-1 text-[11px] text-muted-foreground">
            Re-enrollment: {record.reenrollment_config?.mode || "never"}
          </div>
          {record.trigger_summary && (
            <p className="mt-2 text-xs italic text-foreground/80">"{record.trigger_summary}"</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setDrawerOpen(true)}>
            Edit trigger
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={runTest}
            disabled={testing || !record.trigger_event}
          >
            {testing ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FlaskConical className="mr-1 h-3.5 w-3.5" />
            )}
            Test
          </Button>
        </div>
      </div>

      {record.id && recordKind === "workflow" && (
        <div className="mt-3">
          <TriggerActivityPanel
            recordId={record.id}
            recordKind={recordKind}
            workspaceId={record.workspace_id}
          />
        </div>
      )}

      <EnrollmentTriggerDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        workflow={record}
        enrollmentObject={enrollmentObject}
        recordKind={recordKind}
        onSave={async (patch) => {
          await onChange(patch);
        }}
      />
    </>
  );
}
