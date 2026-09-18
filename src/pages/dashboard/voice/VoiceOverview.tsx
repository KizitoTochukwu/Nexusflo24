import { Link } from "react-router-dom";
import { Bot, PhoneCall, Hash, Timer, ArrowRight, CalendarCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useVoiceAssistants, useVoiceCalls, useVoiceNumbers, useVoiceSettings, useVoiceUsage,
} from "@/hooks/useVoice";
import { VoiceKpi, VoiceSetupNotice, VoiceSection, VoiceEmptyState, VoiceStatusBadge } from "@/components/voice/VoicePrimitives";
import { VOICE_STARTER_ENTITLEMENT, formatMinutes } from "@/lib/voice/constants";

export default function VoiceOverview() {
  const workspaceId = useWorkspaceId();
  const { data: assistants = [], isLoading: loadingAssistants } = useVoiceAssistants(workspaceId);
  const { data: numbers = [] } = useVoiceNumbers(workspaceId);
  const { data: calls = [], isLoading: loadingCalls } = useVoiceCalls(workspaceId);
  const { data: settings } = useVoiceSettings(workspaceId);
  const { data: usage } = useVoiceUsage(workspaceId);

  const included = settings?.included_minutes || VOICE_STARTER_ENTITLEMENT.includedMinutes;
  const usedMinutes = usage?.minutes ?? 0;
  const pct = included > 0 ? Math.min(100, Math.round((usedMinutes / included) * 100)) : 0;
  const booked = calls.filter((c) => c.outcome === "booked").length;
  const captured = calls.filter((c) => c.contact_id).length;

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">NexusFlo Voice</h1>
        <p className="text-sm text-muted-foreground">Every call answered. Every opportunity captured.</p>
      </div>

      <VoiceSetupNotice />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VoiceKpi icon={PhoneCall} label="Calls this period" value={loadingCalls ? "—" : calls.length} />
        <VoiceKpi icon={UserPlus} label="Contacts captured" value={captured} hint="Calls linked to a CRM contact" />
        <VoiceKpi icon={CalendarCheck} label="Appointments booked" value={booked} />
        <VoiceKpi
          icon={Timer}
          label="Minutes used"
          value={`${usedMinutes} / ${included}`}
          hint={pct >= 100 ? "Included minutes used up" : pct >= 80 ? "80% of included minutes used" : "This billing period"}
        />
      </div>

      <VoiceSection title="Included minutes" description="Usage warnings are sent at 80% and 100%. Overage billing stays off until pricing is approved.">
        <Progress value={pct} className="h-2" />
        <p className="mt-2 text-xs text-muted-foreground">{usedMinutes} of {included} minutes used ({pct}%).</p>
      </VoiceSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <VoiceSection
          title="Assistants"
          description="Set up how your receptionist greets and handles callers."
          actions={
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to={`/dashboard/${workspaceId}/voice/assistants`}>Manage <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          }
        >
          {loadingAssistants ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : assistants.length === 0 ? (
            <VoiceEmptyState
              icon={Bot}
              title="No assistant yet"
              description="Create your first receptionist to decide how calls are greeted, qualified and routed."
              action={
                <Button asChild size="sm" className="rounded-full">
                  <Link to={`/dashboard/${workspaceId}/voice/assistants`}>Create assistant</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {assistants.slice(0, 4).map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                  <span className="truncate text-sm font-medium">{a.name}</span>
                  <VoiceStatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </VoiceSection>

        <VoiceSection
          title="Recent calls"
          description="Every call is logged against the caller's CRM record."
          actions={
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to={`/dashboard/${workspaceId}/voice/calls`}>Call inbox <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          }
        >
          {calls.length === 0 ? (
            <VoiceEmptyState
              icon={PhoneCall}
              title="No calls yet"
              description="Calls appear here as soon as live calling is connected and a number is assigned."
            />
          ) : (
            <ul className="space-y-2">
              {calls.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm">
                  <span className="truncate">{c.from_number ?? "Unknown caller"}</span>
                  <span className="text-xs text-muted-foreground">{formatMinutes(c.duration_seconds)}</span>
                </li>
              ))}
            </ul>
          )}
        </VoiceSection>
      </div>

      <VoiceSection
        title="Phone numbers"
        description={`${numbers.length} number${numbers.length === 1 ? "" : "s"} in this workspace.`}
        actions={
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to={`/dashboard/${workspaceId}/voice/numbers`}>Numbers <Hash className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          UK numbers come first through Twilio Programmable Voice. Other providers can be added later without changing your setup.
        </p>
      </VoiceSection>
    </div>
  );
}
