import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useClientFinderReport } from "@/hooks/useClientFinderReports";
import EntitlementPanel from "@/components/client-finder/EntitlementPanel";

const RANGES = [7, 30, 90] as const;

function Metric({
  label,
  value,
  definition,
  to,
}: {
  label: string;
  value: string | number;
  definition?: string;
  to?: string;
}) {
  const body = (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {label}
          {definition && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3" aria-label={`How ${label} is calculated`} />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{definition}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-2xl font-bold leading-none">{value}</p>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function CfReports() {
  const workspaceId = useWorkspaceId();
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, error } = useClientFinderReport(workspaceId, days);
  const base = `/dashboard/${workspaceId}/client-finder`;

  const def = (k: string) => data?.definitions?.[k];
  const replies = Object.entries(data?.replies ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">
            Every number below is counted from stored rows in this workspace — nothing is estimated.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? "default" : "ghost"}
              onClick={() => setDays(r)}
            >
              {r} days
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            The report could not be loaded. {(error as any).message}
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading report…</p>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Prospect companies" value={data.prospects.companies} definition={def("companies")} to={`${base}/prospects`} />
            <Metric label="Approved" value={data.prospects.approved} definition={def("approved")} to={`${base}/prospects`} />
            <Metric label="Contacts" value={data.contacts.total} to={`${base}/prospects`} />
            <Metric label="Verified emails" value={data.contacts.verified} to={`${base}/prospects`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Emails sent" value={data.emails.sent} definition={def("sent")} to={`${base}/outreach`} />
            <Metric label="Queued" value={data.emails.queued} to={`${base}/outreach`} />
            <Metric label="Failed" value={data.emails.failed} to={`${base}/outreach`} />
            <Metric label="Replies" value={data.reply_total} definition={def("replies")} to={`${base}/inbox`} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Reply outcomes</CardTitle></CardHeader>
              <CardContent>
                {replies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No replies logged in this range.{" "}
                    <Link className="text-accent underline" to={`${base}/inbox`}>Open the inbox</Link>
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {replies.map(([cls, n]) => (
                      <li key={cls} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{cls.replace(/_/g, " ")}</span>
                        <Badge variant="secondary">{n}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Pipeline from Client Finder</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Deals created</span>
                  <span className="font-medium">{data.crm.deals}</span>
                </div>
                <div className="flex justify-between">
                  <span>Open pipeline value</span>
                  <span className="font-medium">{Number(data.crm.open_value).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Won value</span>
                  <span className="font-medium">{Number(data.crm.won_value).toLocaleString()}</span>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">{def("deals")}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Campaigns</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {data.campaigns.total} campaign(s) — {data.campaigns.active} active, {data.campaigns.paused} paused.{" "}
              <Link className="text-accent underline" to={`${base}/outreach`}>Manage outreach</Link>
            </CardContent>
          </Card>
        </>
      )}

      <EntitlementPanel workspaceId={workspaceId} />
    </div>
  );
}
