import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { RefreshCw, Sparkles, Trash2, Play, UserPlus } from "lucide-react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useVoiceCallTranscript, useVoiceCallRecording, useVoiceRecordingLink,
  useDeleteVoiceRecording, useProcessVoiceCall, useSyncVoiceCallToCrm,
  type VoiceCallSession,
} from "@/hooks/useVoice";
import { formatMinutes } from "@/lib/voice/constants";

function prettyKey(key: string) {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function sentimentTone(sentiment: string | null) {
  if (sentiment === "positive") return "bg-primary/10 text-primary";
  if (sentiment === "negative") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

export default function VoiceCallDetail({
  call,
  workspaceId,
  contactName,
  open,
  onOpenChange,
}: {
  call: VoiceCallSession | null;
  workspaceId?: string;
  contactName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: turns = [], isLoading: turnsLoading } = useVoiceCallTranscript(call?.id);
  const { data: recording } = useVoiceCallRecording(call?.id);
  const link = useVoiceRecordingLink();
  const removeRecording = useDeleteVoiceRecording(call?.id);
  const process = useProcessVoiceCall(workspaceId);
  const sync = useSyncVoiceCallToCrm(workspaceId);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => { setAudioUrl(null); }, [call?.id]);

  if (!call) return null;

  const details = Object.entries(call.extracted_fields ?? {}).filter(
    ([, v]) => v !== null && v !== "" && typeof v !== "object",
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="text-left">
          <SheetTitle>{call.from_number ?? "Unknown caller"}</SheetTitle>
          <SheetDescription>
            {call.started_at ? format(new Date(call.started_at), "EEEE d MMMM, HH:mm") : "Time unknown"}
            {" · "}
            {formatMinutes(call.duration_seconds)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="capitalize">
            {(call.outcome ?? call.status).replace(/_/g, " ")}
          </Badge>
          {call.intent && <Badge variant="outline" className="capitalize">{call.intent}</Badge>}
          {call.sentiment && (
            <Badge className={`capitalize ${sentimentTone(call.sentiment)}`} variant="secondary">
              {call.sentiment}
            </Badge>
          )}
        </div>

        <div className="mt-5 space-y-5">
          <section>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Summary</h3>
              <Button
                size="sm" variant="ghost" className="h-7 rounded-full text-xs"
                disabled={process.isPending}
                onClick={() => process.mutate({ callSessionId: call.id, force: true })}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                {call.summary ? "Redo summary" : "Summarise"}
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {call.summary ?? "No summary yet. Summaries are written automatically when a call ends."}
            </p>
          </section>

          {details.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold">Captured during the call</h3>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                {details.map(([k, v]) => (
                  <div key={k} className="rounded-xl border bg-muted/30 p-3">
                    <dt className="text-xs text-muted-foreground">{prettyKey(k)}</dt>
                    <dd className="text-sm font-medium break-words">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <Separator />

          <section>
            <h3 className="text-sm font-semibold">CRM record</h3>
            {call.contact_id ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                  to={`/dashboard/${workspaceId}/crm/contacts/${call.contact_id}`}
                >
                  {contactName ?? "View contact"}
                </Link>
                <Button
                  size="sm" variant="ghost" className="h-7 rounded-full text-xs"
                  disabled={sync.isPending}
                  onClick={() => sync.mutate(call.id)}
                >
                  <RefreshCw className="mr-1 h-3 w-3" /> Refresh
                </Button>
              </div>
            ) : (
              <Button
                size="sm" variant="outline" className="mt-2 h-8 rounded-full text-xs"
                disabled={sync.isPending}
                onClick={() => sync.mutate(call.id)}
              >
                <UserPlus className="mr-1 h-3 w-3" /> Save caller to CRM
              </Button>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold">Recording</h3>
            {!recording ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No recording kept for this call. Recording is off unless you switch it on in Voice settings.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {audioUrl ? (
                  <audio controls src={audioUrl} className="w-full" />
                ) : (
                  <Button
                    size="sm" variant="outline" className="h-8 rounded-full text-xs"
                    disabled={link.isPending}
                    onClick={async () => setAudioUrl(await link.mutateAsync(recording.id))}
                  >
                    <Play className="mr-1 h-3 w-3" /> Play recording
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Stored privately{recording.retention_expires_at
                    ? ` · deleted automatically on ${format(new Date(recording.retention_expires_at), "d MMM yyyy")}`
                    : ""}
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs text-destructive">
                      <Trash2 className="mr-1 h-3 w-3" /> Delete recording
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this recording?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The audio is removed permanently. The call, its transcript and summary stay.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep it</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeRecording.mutate(recording.id)}>
                        Delete recording
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-semibold">Transcript</h3>
            {turnsLoading ? (
              <Skeleton className="mt-2 h-32 w-full rounded-xl" />
            ) : turns.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No transcript for this call.
              </p>
            ) : (
              <ol className="mt-2 space-y-2">
                {turns.map((t) => (
                  <li
                    key={t.id}
                    className={`rounded-xl p-3 text-sm ${
                      t.speaker === "caller" ? "bg-muted/40" : "bg-primary/5"
                    }`}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {t.speaker === "caller" ? "Caller" : "Receptionist"}
                    </p>
                    <p className="mt-0.5 break-words">{t.content}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
