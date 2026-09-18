import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PhoneCall, UserPlus, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useVoiceCalls, useVoiceCallContacts, useSyncVoiceCallToCrm } from "@/hooks/useVoice";
import { VoiceEmptyState, VoiceSetupNotice } from "@/components/voice/VoicePrimitives";
import { formatMinutes } from "@/lib/voice/constants";
import { format } from "date-fns";

export default function VoiceCalls() {
  const workspaceId = useWorkspaceId();
  const { data: calls = [], isLoading } = useVoiceCalls(workspaceId);
  const { data: contacts = {} } = useVoiceCallContacts(
    workspaceId,
    calls.map((c) => c.contact_id).filter(Boolean) as string[],
  );
  const sync = useSyncVoiceCallToCrm(workspaceId);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return calls;
    return calls.filter((c) =>
      [c.from_number, c.to_number, c.summary, c.outcome, c.intent]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [calls, query]);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Call Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Every answered call, with its summary and the caller's CRM record.
          </p>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search calls"
          className="w-full rounded-full sm:w-64"
          aria-label="Search calls"
        />
      </div>

      <VoiceSetupNotice compact />

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : filtered.length === 0 ? (
        <VoiceEmptyState
          icon={PhoneCall}
          title="No calls yet"
          description="Once live calling is connected and a number is assigned to an assistant, every call shows up here — and the caller is saved to your CRM with the call written onto their timeline."
        />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>CRM record</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const contact = c.contact_id ? contacts[c.contact_id] : undefined;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.from_number ?? "Unknown"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.started_at ? format(new Date(c.started_at), "d MMM, HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{formatMinutes(c.duration_seconds)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {c.outcome ?? c.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.contact_id ? (
                          <div className="flex items-center gap-1">
                            <Link
                              className="font-medium text-primary underline-offset-2 hover:underline"
                              to={`/dashboard/${workspaceId}/crm/contacts/${c.contact_id}`}
                            >
                              {contact?.name ?? "View contact"}
                            </Link>
                            <Button
                              size="icon" variant="ghost" className="h-6 w-6"
                              aria-label="Refresh this caller's CRM record"
                              disabled={sync.isPending}
                              onClick={() => sync.mutate(c.id)}
                            >
                              <RefreshCw className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm" variant="ghost" className="h-7 rounded-full text-xs"
                            disabled={sync.isPending}
                            onClick={() => sync.mutate(c.id)}
                          >
                            <UserPlus className="mr-1 h-3 w-3" /> Save to CRM
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">
                        {c.summary ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

