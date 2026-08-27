import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertTriangle, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WhatsAppTestSubmission {
  waMessageId: string | null;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  senderOwnership?: string | null;
  templateUsed?: string | null;
  to: string;
}

type Step = "queued" | "submitted" | "sent" | "delivered" | "read";

const STEPS: { key: Step; label: string }[] = [
  { key: "queued", label: "Queued" },
  { key: "submitted", label: "Submitted to Meta" },
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "read", label: "Read" },
];

const RANK: Record<string, number> = { queued: 0, submitted: 1, sent: 2, delivered: 3, read: 4 };

/** Threshold after which a message with no further Meta callback is reported as unconfirmed. */
const AWAITING_THRESHOLD_MS = 90_000;

interface MessageRow {
  status: string | null;
  submitted_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error: string | null;
  error_code: number | null;
  error_title: string | null;
  error_details: string | null;
  fbtrace_id: string | null;
}

/**
 * Shows the *real* Meta status lifecycle for a test message. Nothing here is
 * inferred: each step only lights up when a genuine Meta status webhook has
 * written it to the message record.
 */
export function WhatsAppDeliveryTimeline({ submission }: { submission: WhatsAppTestSubmission }) {
  const [row, setRow] = useState<MessageRow | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!submission.waMessageId) return;
    let cancelled = false;

    const poll = async () => {
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("status, submitted_at, sent_at, delivered_at, read_at, failed_at, error, error_code, error_title, error_details, fbtrace_id")
        .eq("wa_message_id", submission.waMessageId!)
        .maybeSingle();
      if (!cancelled && data) setRow(data as MessageRow);
    };

    poll();
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
      poll();
    }, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [submission.waMessageId, startedAt]);

  const status = (row?.status || "submitted").toLowerCase();
  const failed = status === "failed";
  const currentRank = RANK[status] ?? 1;
  const awaiting = !failed && currentRank < RANK.delivered && elapsed > AWAITING_THRESHOLD_MS;

  const timeFor = (key: Step) => {
    if (!row) return null;
    if (key === "submitted") return row.submitted_at;
    if (key === "sent") return row.sent_at;
    if (key === "delivered") return row.delivered_at;
    if (key === "read") return row.read_at;
    return null;
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Delivery status
          {failed ? (
            <Badge variant="destructive">Failed</Badge>
          ) : awaiting ? (
            <Badge variant="outline">Awaiting confirmation</Badge>
          ) : (
            <Badge variant="secondary" className="capitalize">{status}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-2">
          {STEPS.map((step) => {
            const reached = !failed && currentRank >= RANK[step.key];
            const ts = timeFor(step.key);
            return (
              <li key={step.key} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border",
                    reached ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground",
                  )}
                >
                  {reached ? (
                    step.key === "read" ? <Eye className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />
                  ) : failed ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                </span>
                <span className={cn(reached ? "font-medium" : "text-muted-foreground")}>{step.label}</span>
                {ts && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(ts).toLocaleTimeString()}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {failed && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" /> Meta rejected or failed this message
            </div>
            <p className="mt-1 text-muted-foreground">{row?.error_details || row?.error || row?.error_title || "No detail returned by Meta."}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {row?.error_code ? `Code ${row.error_code}` : null}
              {row?.fbtrace_id ? ` · fbtrace ${row.fbtrace_id}` : null}
            </p>
          </div>
        )}

        {!failed && awaiting && (
          <p className="text-sm text-muted-foreground">
            Submitted to Meta — no delivery confirmation received yet. This usually means the webhook
            subscription is missing, or the recipient's device has not received the message.
          </p>
        )}

        <dl className="grid gap-1 border-t pt-3 text-xs text-muted-foreground">
          <div className="flex justify-between gap-4"><dt>Recipient</dt><dd className="font-mono">{submission.to}</dd></div>
          <div className="flex justify-between gap-4"><dt>WAMID</dt><dd className="font-mono break-all">{submission.waMessageId || "—"}</dd></div>
          {submission.wabaId && <div className="flex justify-between gap-4"><dt>WABA</dt><dd className="font-mono">{submission.wabaId}</dd></div>}
          {submission.phoneNumberId && <div className="flex justify-between gap-4"><dt>Phone number ID</dt><dd className="font-mono">{submission.phoneNumberId}</dd></div>}
          {submission.senderOwnership && <div className="flex justify-between gap-4"><dt>Sender</dt><dd className="capitalize">{submission.senderOwnership}-owned</dd></div>}
          {submission.templateUsed && <div className="flex justify-between gap-4"><dt>Template</dt><dd>{submission.templateUsed}</dd></div>}
        </dl>
      </CardContent>
    </Card>
  );
}
