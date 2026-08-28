import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useProspectingUsage, useProviderConnections } from "@/hooks/useClientFinder";
import { format } from "date-fns";
import MailboxCard from "@/components/client-finder/MailboxCard";

const CAPABILITIES = [
  { capability: "Company discovery", note: "Finds companies matching an approved profile." },
  { capability: "Contact discovery", note: "Finds decision-makers at a company." },
  { capability: "Email verification", note: "Checks whether a work email is deliverable." },
  { capability: "Mailbox sending", note: "Sends approved sequences from your own mailbox." },
];

export default function CfSettings() {
  const workspaceId = useWorkspaceId();
  const { data: providers = [] } = useProviderConnections(workspaceId);
  const { data: usage = [] } = useProspectingUsage(workspaceId);

  return (
    <div className="space-y-4">
      <MailboxCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Nothing here is simulated. Where no provider is connected, the capability is genuinely
            unavailable and CSV import is used instead.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Capability</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CAPABILITIES.map((cap) => {
                const match = (providers as any[]).find(
                  (p) => p.capability?.toLowerCase() === cap.capability.toLowerCase(),
                );
                return (
                  <TableRow key={cap.capability}>
                    <TableCell>
                      <p className="font-medium">{cap.capability}</p>
                      <p className="text-xs text-muted-foreground">{cap.note}</p>
                    </TableCell>
                    <TableCell className="text-sm">{match?.provider ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={match?.status === "connected" ? "default" : "outline"}>
                        {match?.status?.replace("_", " ") ?? "not configured"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {match?.last_checked_at
                        ? format(new Date(match.last_checked_at), "d MMM yyyy HH:mm")
                        : "Never"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent AI activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usage.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No AI activity recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operation</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usage as any[]).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm">{u.operation.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.model ?? "—"}</TableCell>
                    <TableCell className="text-sm">{u.units}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(u.created_at), "d MMM yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
