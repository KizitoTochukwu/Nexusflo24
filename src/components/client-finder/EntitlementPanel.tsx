import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useClientFinderEntitlements } from "@/hooks/useClientFinderReports";

const ROWS: { key: keyof ReturnType<typeof rowsShape>; label: string; usage: string; limit: string }[] = [] as any;
function rowsShape() {
  return {} as Record<string, never>;
}

const ALLOWANCES = [
  { label: "Emails this month", usage: "emails", limit: "monthly_emails" },
  { label: "AI operations this month", usage: "ai_ops", limit: "monthly_ai_ops" },
  { label: "Email verifications this month", usage: "verifications", limit: "monthly_verifications" },
  { label: "Prospects added this month", usage: "discoveries", limit: "monthly_discoveries" },
  { label: "Active campaigns", usage: "campaigns", limit: "max_campaigns" },
  { label: "Connected mailboxes", usage: "mailboxes", limit: "max_mailboxes" },
] as const;

export default function EntitlementPanel({ workspaceId }: { workspaceId?: string }) {
  const { data, isLoading, error } = useClientFinderEntitlements(workspaceId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Plan allowance</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading your allowance…</CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Plan allowance</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your allowance could not be read right now, so limits are not shown. Sending and AI use are still
          checked on the server before anything runs.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Plan allowance</CardTitle>
        <Badge variant="secondary" className="capitalize">{data.plan} plan</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {(data.suspended || data.enabled === false) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {data.suspended ? "Suspended by the platform team" : "Not enabled for this workspace"}
            </AlertTitle>
            <AlertDescription>
              {data.suspension_reason ||
                "Sending and AI operations are blocked until this is lifted. Contact support for details."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {ALLOWANCES.map((row) => {
            const used = Number((data.usage as any)[row.usage] ?? 0);
            const limit = Number((data.limits as any)[row.limit] ?? 0);
            const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            return (
              <div key={row.usage} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span>{row.label}</span>
                  <span className={pct >= 100 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                    {used} / {limit}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Counted from stored rows since {new Date(data.period_start).toLocaleDateString()}. Limits are enforced
          on the server, not in the browser. Exports are{" "}
          {data.limits.exports_enabled ? "included in your plan" : "not included in your plan"}.
        </p>
      </CardContent>
    </Card>
  );
}
