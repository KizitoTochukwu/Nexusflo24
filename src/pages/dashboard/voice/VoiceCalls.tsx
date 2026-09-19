import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PhoneCall, UserPlus, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useVoiceCalls, useVoiceCallContacts, useSyncVoiceCallToCrm, type VoiceCallSession,
} from "@/hooks/useVoice";
import { VoiceEmptyState, VoiceSetupNotice } from "@/components/voice/VoicePrimitives";
import VoiceCallDetail from "@/components/voice/VoiceCallDetail";
import { formatMinutes } from "@/lib/voice/constants";
import { format } from "date-fns";

const OUTCOME_FILTERS = [
  { value: "all", label: "All calls" },
  { value: "booked", label: "Appointment booked" },
  { value: "callback_requested", label: "Callback requested" },
  { value: "transferred", label: "Transferred" },
  { value: "enquiry", label: "Enquiry" },
  { value: "information_given", label: "Information given" },
  { value: "no_answer", label: "No answer" },
  { value: "spam", label: "Spam" },
];

export default function VoiceCalls() {
  const workspaceId = useWorkspaceId();
  const { data: calls = [], isLoading } = useVoiceCalls(workspaceId);
  const { data: contacts = {} } = useVoiceCallContacts(
    workspaceId,
    calls.map((c) => c.contact_id).filter(Boolean) as string[],
  );
  const sync = useSyncVoiceCallToCrm(workspaceId);
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [selected, setSelected] = useState<VoiceCallSession | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return calls.filter((c) => {
      if (outcome !== "all" && (c.outcome ?? "") !== outcome) return false;
      if (!q) return true;
      return [c.from_number, c.to_number, c.summary, c.outcome, c.intent]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [calls, query, outcome]);

  const current = selected ? calls.find((c) => c.id === selected.id) ?? selected : null;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Call Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Every answered call, with what was said, what was captured and the caller's CRM record.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger className="w-48 rounded-full" aria-label="Filter by outcome">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTCOME_FILTERS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calls"
            className="w-full rounded-full sm:w-64"
            aria-label="Search calls"
          />
        </div>
      </div>

      <VoiceSetupNotice compact />

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : filtered.length === 0 ? (
        <VoiceEmptyState
          icon={PhoneCall}
          title={calls.length === 0 ? "No calls yet" : "No calls match that"}
          description={
            calls.length === 0
              ? "Once live calling is connected and a number is assigned to an assistant, every call shows up here — with a transcript, a written summary and the caller saved to your CRM."
              : "Try a different search or outcome."
          }
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
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(c)}
                    >
                      <TableCell className="font-medium">{c.from_number ?? "Unknown"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.started_at ? format(new Date(c.started_at), "d MMM, HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{formatMinutes(c.duration_seconds)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {(c.outcome ?? c.status).replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs" onClick={(e) => e.stopPropagation()}>
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

      <VoiceCallDetail
        call={current}
        workspaceId={workspaceId}
        contactName={current?.contact_id ? contacts[current.contact_id]?.name : undefined}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}


