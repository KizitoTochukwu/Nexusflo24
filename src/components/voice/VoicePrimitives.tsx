import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, type LucideIcon } from "lucide-react";
import { VOICE_SETUP_STEPS, VOICE_STATUS_TONE } from "@/lib/voice/constants";

export function VoiceKpi({
  icon: Icon, label, value, hint,
}: { icon: LucideIcon; label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-start gap-3 p-5">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function VoiceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={`capitalize ${VOICE_STATUS_TONE[status] ?? ""}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

/** Honest banner: nothing can take a live call until the later milestones land. */
export function VoiceSetupNotice({ compact = false }: { compact?: boolean }) {
  return (
    <Alert className="rounded-2xl border-accent/40 bg-accent/5">
      <Info className="h-4 w-4 text-accent" />
      <AlertTitle className="text-sm font-semibold">Live calling is not connected yet</AlertTitle>
      <AlertDescription className="text-xs text-muted-foreground">
        You can set everything up here now. Calls start being answered once these are in place:
        {!compact && (
          <ul className="mt-2 space-y-1">
            {VOICE_SETUP_STEPS.map((s) => (
              <li key={s.key} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span><span className="font-medium text-foreground">{s.label}</span> — {s.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function VoiceEmptyState({
  icon: Icon, title, description, action,
}: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="rounded-2xl border-dashed">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="rounded-2xl bg-muted p-3 text-muted-foreground"><Icon className="h-6 w-6" /></span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function VoiceSection({
  title, description, children, actions,
}: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
