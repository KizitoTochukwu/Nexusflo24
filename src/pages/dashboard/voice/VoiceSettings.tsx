import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useVoiceSettings, useUpdateVoiceSettings } from "@/hooks/useVoice";
import { VoiceSection, VoiceSetupNotice } from "@/components/voice/VoicePrimitives";
import {
  VOICE_SETUP_STEPS, VOICE_STARTER_ENTITLEMENT, VOICE_PROVIDER_LABEL,
} from "@/lib/voice/constants";
import { Badge } from "@/components/ui/badge";

export default function VoiceSettings() {
  const workspaceId = useWorkspaceId();
  const { data: settings, isLoading } = useVoiceSettings(workspaceId);
  const save = useUpdateVoiceSettings(workspaceId);

  const [enabled, setEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [retention, setRetention] = useState(90);
  const [transferNumber, setTransferNumber] = useState("");
  const [includedMinutes, setIncludedMinutes] = useState(VOICE_STARTER_ENTITLEMENT.includedMinutes);
  const [concurrent, setConcurrent] = useState(VOICE_STARTER_ENTITLEMENT.maxConcurrentCalls);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setRecording(settings.recording_enabled);
    setRetention(settings.recording_retention_days);
    setTransferNumber(settings.transfer_number ?? "");
    setIncludedMinutes(settings.included_minutes);
    setConcurrent(settings.max_concurrent_calls);
  }, [settings]);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Voice Settings</h1>
        <p className="text-sm text-muted-foreground">Recording, transfers and your monthly allowance.</p>
      </div>

      <VoiceSetupNotice />

      <VoiceSection title="Availability" description="Turn Voice on for this workspace once your setup is complete.">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Voice enabled for this workspace</p>
            <p className="text-xs text-muted-foreground">Calls are only answered when this is on and the calling service is connected.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable voice" />
        </div>
      </VoiceSection>

      <VoiceSection title="Call recording" description="Off by default. When on, callers hear a clear recording announcement before the conversation begins.">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Record calls</p>
              <p className="text-xs text-muted-foreground">Recordings are stored privately and only your workspace can listen to them.</p>
            </div>
            <Switch checked={recording} onCheckedChange={setRecording} aria-label="Enable call recording" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vs-retention">Keep recordings for (days)</Label>
            <Input
              id="vs-retention" type="number" min={1} max={3650} value={retention}
              onChange={(e) => setRetention(Number(e.target.value) || 0)} className="max-w-[160px]"
            />
            <p className="text-xs text-muted-foreground">After this, recordings are deleted automatically. Admins can delete any recording sooner.</p>
          </div>
        </div>
      </VoiceSection>

      <VoiceSection title="Transfer to a person" description="Where a caller is put through when they ask for a human.">
        <div className="space-y-1.5">
          <Label htmlFor="vs-transfer">Transfer number</Label>
          <Input
            id="vs-transfer" value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)}
            placeholder="+44 20 1234 5678" className="max-w-sm"
          />
        </div>
      </VoiceSection>

      <VoiceSection title="Allowance" description="Warnings are sent at 80% and 100% of your included minutes. Charges for extra minutes stay switched off until pricing is approved.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="vs-minutes">Included minutes per billing period</Label>
            <Input id="vs-minutes" type="number" min={0} value={includedMinutes}
              onChange={(e) => setIncludedMinutes(Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vs-concurrent">Calls at the same time</Label>
            <Input id="vs-concurrent" type="number" min={1} value={concurrent}
              onChange={(e) => setConcurrent(Number(e.target.value) || 1)} />
          </div>
        </div>
      </VoiceSection>

      <VoiceSection title="Connections" description={`Telephone calls run on ${VOICE_PROVIDER_LABEL}.`}>
        <ul className="space-y-2">
          {VOICE_SETUP_STEPS.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="truncate text-xs text-muted-foreground">{s.detail}</p>
              </div>
              <Badge variant="secondary">Setup required</Badge>
            </li>
          ))}
        </ul>
      </VoiceSection>

      <div className="flex justify-end">
        <Button
          className="rounded-full"
          disabled={save.isPending}
          onClick={() => save.mutate({
            enabled,
            recording_enabled: recording,
            recording_retention_days: retention,
            transfer_number: transferNumber.trim() || null,
            included_minutes: includedMinutes,
            max_concurrent_calls: concurrent,
          })}
        >
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
