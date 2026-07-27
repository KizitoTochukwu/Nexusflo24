import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { McpActivity } from "@/hooks/useAiAgentConnections";
import { Eye } from "lucide-react";

const ALL = "all";

function statusVariant(status: string) {
  if (status === "success") return "default" as const;
  if (status === "rejected") return "secondary" as const;
  return "destructive" as const;
}

export default function McpActivityLog({ activity }: { activity: McpActivity[] }) {
  const [tool, setTool] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [risk, setRisk] = useState(ALL);
  const [since, setSince] = useState("");
  const [detail, setDetail] = useState<McpActivity | null>(null);

  const tools = useMemo(() => Array.from(new Set(activity.map((a) => a.tool_name))).sort(), [activity]);

  const rows = useMemo(
    () =>
      activity.filter(
        (a) =>
          (tool === ALL || a.tool_name === tool) &&
          (status === ALL || a.execution_status === status) &&
          (risk === ALL || a.risk_level === risk) &&
          (!since || new Date(a.created_at) >= new Date(since)),
      ),
    [activity, tool, status, risk, since],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity log</CardTitle>
        <CardDescription>
          Every AI assistant request against this workspace — allowed, rejected and failed. Tokens and
          secrets are never recorded.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="w-[160px]" />
          <Select value={tool} onValueChange={setTool}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tool" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tools</SelectItem>
              {tools.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risk" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All risk</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No AI assistant activity yet. Requests appear here as soon as a connected assistant uses NexusFlo24.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">When</th>
                  <th className="p-3">Tool</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3">Approval</th>
                  <th className="p-3">Result</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="whitespace-nowrap p-3">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="p-3 font-medium">{a.tool_name}</td>
                    <td className="p-3 capitalize">{a.risk_level}</td>
                    <td className="p-3 capitalize">{a.approval_status.replace("_", " ")}</td>
                    <td className="p-3">
                      <Badge variant={statusVariant(a.execution_status)} className="capitalize">
                        {a.execution_status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetail(a)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>Request details</SheetTitle></SheetHeader>
          {detail && (
            <dl className="mt-6 space-y-3 text-sm">
              {[
                ["Date and time", new Date(detail.created_at).toLocaleString()],
                ["Assistant", detail.client_key ?? detail.oauth_client_id ?? "Unknown client"],
                ["Workspace", detail.workspace_id ?? "—"],
                ["Tool called", detail.tool_name],
                ["Action summary", detail.summary ?? "—"],
                ["Risk level", detail.risk_level],
                ["Approval status", detail.approval_status.replace("_", " ")],
                ["Execution status", detail.execution_status],
                ["Error code", detail.error_code ?? "—"],
                ["Duration", detail.duration_ms ? `${detail.duration_ms} ms` : "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium break-all">{v as string}</dd>
                </div>
              ))}
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
