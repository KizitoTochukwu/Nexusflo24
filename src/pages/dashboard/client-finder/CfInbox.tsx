import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2, Plus, Sparkles, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  POSITIVE_CLASSES, REPLY_CLASSES, REPLY_CLASS_LABELS, ReplyClass,
  useCfReplies, useCfReplyActions,
} from "@/hooks/useClientFinderInbox";
import { useCfCampaigns } from "@/hooks/useClientFinderOutreach";

export default function CfInbox() {
  const workspaceId = useWorkspaceId();
  const { data: replies = [], isLoading } = useCfReplies(workspaceId);
  const { data: campaigns = [] } = useCfCampaigns(workspaceId);
  const { logReply, classify, correct, setHandled, syncCrm, draftReply } = useCfReplyActions(workspaceId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ from_email: "", subject: "", body_text: "", campaign_id: "" });
  const [filter, setFilter] = useState<string>("all");
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return replies;
    if (filter === "unhandled") return replies.filter((r) => !r.handled);
    if (filter === "positive") {
      return replies.filter((r) =>
        POSITIVE_CLASSES.includes((r.corrected_classification || r.classification) as ReplyClass));
    }
    return replies;
  }, [replies, filter]);

  const submit = () => {
    logReply.mutate(
      {
        from_email: form.from_email.trim(),
        subject: form.subject.trim() || undefined,
        body_text: form.body_text.trim(),
        campaign_id: form.campaign_id || null,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({ from_email: "", subject: "", body_text: "", campaign_id: "" });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Replies are classified by AI and every classification can be corrected. Nothing is written to your
          CRM until you choose to save it, and AI reply drafts are suggestions you send yourself.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Replies</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All replies</SelectItem>
                <SelectItem value="unhandled">Needs attention</SelectItem>
                <SelectItem value="positive">Positive only</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Log a reply
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log a reply</DialogTitle>
                  <DialogDescription>
                    Paste a reply you received. It is matched to the prospect's sequence by email address.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>From email</Label>
                    <Input
                      value={form.from_email}
                      onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                      placeholder="name@company.com"
                    />
                  </div>
                  <div>
                    <Label>Subject (optional)</Label>
                    <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                  </div>
                  <div>
                    <Label>Campaign (optional)</Label>
                    <Select
                      value={form.campaign_id}
                      onValueChange={(v) => setForm({ ...form, campaign_id: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Match automatically" /></SelectTrigger>
                      <SelectContent>
                        {campaigns.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reply text</Label>
                    <Textarea
                      rows={6}
                      value={form.body_text}
                      onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                      placeholder="Paste what they wrote back…"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button
                    onClick={submit}
                    disabled={logReply.isPending || !form.from_email.trim() || !form.body_text.trim()}
                  >
                    {logReply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save reply
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading replies…</p>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No replies recorded yet.
            </p>
          ) : (
            visible.map((r) => {
              const cls = (r.corrected_classification || r.classification) as ReplyClass | null;
              return (
                <div key={r.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{r.from_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.subject || "(no subject)"} · {format(new Date(r.received_at), "d MMM yyyy HH:mm")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {cls ? (
                        <Badge variant={POSITIVE_CLASSES.includes(cls) ? "default" : "outline"}>
                          {REPLY_CLASS_LABELS[cls] ?? cls}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not classified</Badge>
                      )}
                      {r.corrected_classification && <Badge variant="secondary">Corrected by a person</Badge>}
                      {r.crm_synced_at && <Badge variant="secondary">In CRM</Badge>}
                      {r.handled && <Badge variant="secondary">Handled</Badge>}
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{r.body_text}</p>

                  {r.classification_reason && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Why: {r.classification_reason}
                      {r.classification_confidence != null
                        ? ` (confidence ${Math.round(Number(r.classification_confidence) * 100)}%)`
                        : ""}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => classify.mutate(r.id)}
                      disabled={classify.isPending}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {r.classification ? "Re-classify" : "Classify with AI"}
                    </Button>

                    <Select
                      value={cls ?? ""}
                      onValueChange={(v) => correct.mutate({ replyId: r.id, classification: v as ReplyClass })}
                    >
                      <SelectTrigger className="h-9 w-[190px]">
                        <SelectValue placeholder="Set outcome manually" />
                      </SelectTrigger>
                      <SelectContent>
                        {REPLY_CLASSES.map((c) => (
                          <SelectItem key={c} value={c}>{REPLY_CLASS_LABELS[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncCrm.mutate(r.id)}
                      disabled={syncCrm.isPending || !!r.crm_synced_at}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {r.crm_synced_at ? "Saved to CRM" : "Save to CRM"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        draftReply.mutate(r.id, { onSuccess: (res: any) => setDraft(res.draft) })}
                      disabled={draftReply.isPending}
                    >
                      Draft a reply
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setHandled.mutate({ replyId: r.id, handled: !r.handled })}
                    >
                      {r.handled ? "Mark unhandled" : "Mark handled"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggested reply</DialogTitle>
            <DialogDescription>
              Review, edit and send this yourself. NexusFlo24 does not send it for you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Subject</Label>
              <Input readOnly value={draft?.subject ?? ""} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea readOnly rows={9} value={draft?.body ?? ""} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${draft?.subject ?? ""}\n\n${draft?.body ?? ""}`);
              }}
            >
              Copy
            </Button>
            <Button onClick={() => setDraft(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
