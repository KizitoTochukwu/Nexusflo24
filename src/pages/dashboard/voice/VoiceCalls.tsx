import { useMemo, useState } from "react";
import { PhoneCall } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useVoiceCalls } from "@/hooks/useVoice";
import { VoiceEmptyState, VoiceSetupNotice } from "@/components/voice/VoicePrimitives";
import { formatMinutes } from "@/lib/voice/constants";
import { format } from "date-fns";

export default function VoiceCalls() {
  const workspaceId = useWorkspaceId();
  const { data: calls = [], isLoading } = useVoiceCalls(workspaceId);
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
          <p className="text-sm text-muted-foreground">Every answered call, with its summary and CRM link.</p>
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
          description="Once live calling is connected and a number is assigned to an assistant, every call shows up here with a transcript, summary and the caller's CRM record."
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
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.from_number ?? "Unknown"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.started_at ? format(new Date(c.started_at), "d MMM, HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{formatMinutes(c.duration_seconds)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{c.outcome ?? c.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[360px] truncate text-xs text-muted-foreground">
                      {c.summary ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
