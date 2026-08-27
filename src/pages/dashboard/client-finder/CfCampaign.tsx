import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle, ArrowLeft, Check, CircleSlash, Loader2, Pause, Play, Plus, Sparkles, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useProspectContacts } from "@/hooks/useClientFinder";
import {
  useCampaignAction, useCfCampaign, useCfEnrolments, useCfOutbound, useCfReadiness,
  useCfSteps, useDeleteCfStep, useGenerateSequence, useSaveCfStep, useUpdateCfCampaign,
} from "@/hooks/useClientFinderOutreach";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CfCampaign() {
  const workspaceId = useWorkspaceId();
  const { campaignId } = useParams<{ campaignId: string }>();

  const { data: campaign, isLoading } = useCfCampaign(campaignId);
  const { data: steps = [] } = useCfSteps(campaignId);
  const { data: enrolments = [] } = useCfEnrolments(campaignId);
  const { data: outbound = [] } = useCfOutbound(campaignId);
  const { data: readiness } = useCfReadiness(workspaceId, campaignId);
  const { data: contacts = [] } = useProspectContacts(workspaceId);

  const updateCampaign = useUpdateCfCampaign();
  const saveStep = useSaveCfStep();
  const deleteStep = useDeleteCfStep();
  const generate = useGenerateSequence(workspaceId);
  const action = useCampaignAction(workspaceId);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [enrolPick, setEnrolPick] = useState<Record<string, boolean>>({});
  const [launchOpen, setLaunchOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [preview, setPreview] = useState<any>(null);

  const contactById = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])),
    [contacts],
  );
  const enrolledIds = useMemo(() => new Set(enrolments.map((e) => e.contact_id)), [enrolments]);
  const pending = enrolments.filter((e) => e.status === "pending_approval");
  const approved = enrolments.filter((e) => e.status === "approved" || e.status === "in_progress");

  if (isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!campaign) return <p className="py-10 text-center text-sm text-muted-foreground">Campaign not found.</p>;

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const runAction = async (body: Record<string, unknown>, successMsg?: string) => {
    const res = await action.mutateAsync({ campaign_id: campaignId, ...body });
    if (successMsg) toast.success(successMsg);
    return res;
  };

  const doPreview = async (contactId: string) => {
    const res = await runAction({ action: "preview", contact_id: contactId });
    setPreview(res);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to=".."><ArrowLeft className="mr-1 h-4 w-4" /> Campaigns</Link>
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{campaign.name}</h2>
            <p className="text-xs text-muted-foreground">
              Status: {campaign.status}
              {campaign.paused_reason ? ` — ${campaign.paused_reason}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "active" ? (
            <Button variant="outline" onClick={() => runAction({ action: "pause" }, "Campaign paused")}>
              <Pause className="mr-2 h-4 w-4" /> Pause
            </Button>
          ) : campaign.status === "paused" ? (
            <Button variant="outline" onClick={() => runAction({ action: "resume" }, "Campaign resumed")}>
              <Play className="mr-2 h-4 w-4" /> Resume
            </Button>
          ) : null}
          {campaign.status !== "stopped" && (
            <Button variant="outline" onClick={() => runAction({ action: "stop" }, "Campaign stopped")}>
              <CircleSlash className="mr-2 h-4 w-4" /> Stop
            </Button>
          )}
          <Button onClick={() => setLaunchOpen(true)} disabled={campaign.status === "active"}>
            Review &amp; launch
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sequence">
        <TabsList>
          <TabsTrigger value="sequence">Sequence</TabsTrigger>
          <TabsTrigger value="prospects">Prospects ({enrolments.length})</TabsTrigger>
          <TabsTrigger value="sending">Sending</TabsTrigger>
          <TabsTrigger value="delivery">Delivery log</TabsTrigger>
        </TabsList>

        {/* ------------------------------ Sequence ------------------------------ */}
        <TabsContent value="sequence" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Email sequence</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Drafts are grounded only in the research stored against your prospects — nothing is invented.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => generate.mutate({ campaign_id: campaignId!, step_count: 3 })}
                  disabled={generate.isPending}
                >
                  {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Draft with AI
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    saveStep.mutate({
                      workspace_id: workspaceId,
                      campaign_id: campaignId,
                      step_number: (steps[steps.length - 1]?.step_number ?? 0) + 1,
                      delay_days: steps.length ? 3 : 0,
                      subject_template: "",
                      body_template: "",
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Add email
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No emails yet. Draft with AI or add one manually. Available tokens: {"{{first_name}}"}, {"{{company}}"},
                  {" "}{"{{job_title}}"}, {"{{industry}}"}, {"{{city}}"}, {"{{country}}"}, {"{{sender_name}}"}.
                </p>
              )}
              {steps.map((s) => (
                <div key={s.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Email {s.step_number}</Badge>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Send after</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-20"
                          defaultValue={s.delay_days}
                          onBlur={(e) => saveStep.mutate({ id: s.id, delay_days: Number(e.target.value) || 0 })}
                        />
                        <span className="text-xs text-muted-foreground">days</span>
                      </div>
                      {s.ai_generated && <Badge variant="secondary">AI drafted</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteStep.mutate(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    defaultValue={s.subject_template}
                    placeholder="Subject line"
                    onBlur={(e) => saveStep.mutate({ id: s.id, subject_template: e.target.value })}
                  />
                  <Textarea
                    defaultValue={s.body_template}
                    rows={8}
                    placeholder="Plain-text body"
                    onBlur={(e) => saveStep.mutate({ id: s.id, body_template: e.target.value })}
                  />
                  {Array.isArray(s.evidence) && s.evidence.length > 0 && (
                    <div className="rounded-md bg-muted/50 p-3 text-xs">
                      <p className="mb-1 font-medium">Evidence used</p>
                      <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                        {s.evidence.map((e: any, i: number) => (
                          <li key={i}>{typeof e === "string" ? e : e.claim ?? JSON.stringify(e)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ Prospects ----------------------------- */}
        <TabsContent value="prospects" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Approval queue</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nobody is emailed until you approve them here.
                </p>
              </div>
              <Button variant="outline" onClick={() => setEnrolOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Enrol prospects
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
                  <span className="text-sm">{selectedIds.length} selected</span>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await runAction({ action: "approve_enrolments", enrolment_ids: selectedIds }, "Prospects approved");
                      setSelected({});
                    }}
                  >
                    <Check className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await runAction({ action: "reject_enrolments", enrolment_ids: selectedIds }, "Prospects rejected");
                      setSelected({});
                    }}
                  >
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              )}

              {enrolments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No prospects enrolled yet.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {enrolments.map((e) => {
                    const c = contactById[e.contact_id];
                    return (
                      <div key={e.id} className="flex items-center gap-3 p-3">
                        <Checkbox
                          checked={!!selected[e.id]}
                          onCheckedChange={(v) => setSelected((s) => ({ ...s, [e.id]: !!v }))}
                          disabled={e.status !== "pending_approval"}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c?.full_name ?? "Unknown prospect"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c?.email ?? "No email"}{c?.job_title ? ` · ${c.job_title}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline">{e.status.replace(/_/g, " ")}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => doPreview(e.contact_id)}>Preview</Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Pending {pending.length} · Approved {approved.length}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------- Sending ------------------------------ */}
        <TabsContent value="sending" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Sending controls</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>From name</Label>
                  <Input
                    defaultValue={campaign.from_name ?? ""}
                    onBlur={(e) => updateCampaign.mutate({ id: campaign.id, from_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>From email</Label>
                  <Input
                    defaultValue={campaign.from_email ?? ""}
                    onBlur={(e) => updateCampaign.mutate({ id: campaign.id, from_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Daily limit</Label>
                  <Input
                    type="number" min={1}
                    defaultValue={campaign.daily_limit}
                    onBlur={(e) => updateCampaign.mutate({ id: campaign.id, daily_limit: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Window start (hour)</Label>
                    <Input
                      type="number" min={0} max={23}
                      defaultValue={campaign.send_window_start}
                      onBlur={(e) => updateCampaign.mutate({ id: campaign.id, send_window_start: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Window end (hour)</Label>
                    <Input
                      type="number" min={1} max={24}
                      defaultValue={campaign.send_window_end}
                      onBlur={(e) => updateCampaign.mutate({ id: campaign.id, send_window_end: Number(e.target.value) || 24 })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Sending days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => {
                    const on = (campaign.send_days ?? []).includes(i);
                    return (
                      <Button
                        key={d} size="sm" variant={on ? "default" : "outline"}
                        onClick={() => {
                          const next = on
                            ? campaign.send_days.filter((x) => x !== i)
                            : [...campaign.send_days, i].sort();
                          updateCampaign.mutate({ id: campaign.id, send_days: next });
                        }}
                      >
                        {d}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label>Send a test to yourself</Label>
                <div className="flex gap-2">
                  <Input placeholder="you@yourcompany.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                  <Button
                    variant="outline"
                    disabled={action.isPending}
                    onClick={() => runAction({ action: "test_send", to: testEmail }, "Test email submitted to the email service")}
                  >
                    Send test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A successful submission is not proof of delivery — check your inbox to confirm.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------- Delivery log ---------------------------- */}
        <TabsContent value="delivery" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery log</CardTitle>
              <p className="text-sm text-muted-foreground">
                Statuses reflect what the email service accepted. Submitted means handed over, not confirmed in the inbox.
              </p>
            </CardHeader>
            <CardContent>
              {outbound.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing sent yet.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {outbound.map((o) => (
                    <div key={o.id} className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{o.subject || "(no subject)"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {o.to_email} · email {o.step_number}
                          {o.sent_at ? ` · ${new Date(o.sent_at).toLocaleString()}` : ""}
                        </p>
                        {o.error && <p className="mt-1 text-xs text-destructive">{o.error}</p>}
                      </div>
                      <Badge variant={o.status === "failed" ? "destructive" : "outline"}>{o.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enrol dialog */}
      <Dialog open={enrolOpen} onOpenChange={setEnrolOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enrol prospects</DialogTitle>
            <DialogDescription>
              Prospects without a valid email, marked do-not-contact, or suppressed are skipped automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-lg border p-2">
            {contacts.filter((c) => !enrolledIds.has(c.id)).length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No further prospects available. Import or discover prospects first.
              </p>
            )}
            {contacts.filter((c) => !enrolledIds.has(c.id)).map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                <Checkbox
                  checked={!!enrolPick[c.id]}
                  onCheckedChange={(v) => setEnrolPick((s) => ({ ...s, [c.id]: !!v }))}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{c.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.email ?? "No email"}</span>
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrolOpen(false)}>Cancel</Button>
            <Button
              disabled={action.isPending}
              onClick={async () => {
                const ids = Object.keys(enrolPick).filter((k) => enrolPick[k]);
                if (!ids.length) return toast.error("Select at least one prospect");
                const res: any = await runAction({ action: "enrol", contact_ids: ids });
                toast.success(`Enrolled ${res.added} prospects (${res.skipped?.length ?? 0} skipped)`);
                setEnrolPick({});
                setEnrolOpen(false);
              }}
            >
              Enrol selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Launch dialog */}
      <Dialog open={launchOpen} onOpenChange={setLaunchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review and launch</DialogTitle>
            <DialogDescription>
              Launching starts sending to approved prospects only, inside your sending window.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(readiness?.checks ?? []).map((c) => (
              <div key={c.key} className="flex items-start gap-2 text-sm">
                {c.ok
                  ? <Check className="mt-0.5 h-4 w-4 text-accent" />
                  : <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />}
                <div>
                  <p>{c.label}</p>
                  {c.detail && <p className="text-xs text-muted-foreground">{c.detail}</p>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLaunchOpen(false)}>Cancel</Button>
            <Button
              disabled={!readiness?.ready || action.isPending}
              onClick={async () => {
                await runAction({ action: "launch", confirm: true }, "Campaign launched");
                setLaunchOpen(false);
              }}
            >
              Confirm launch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview for {preview?.contact?.full_name}</DialogTitle>
            <DialogDescription>{preview?.contact?.email}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {(preview?.steps ?? []).map((s: any) => (
              <div key={s.step_number} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline">Email {s.step_number}</Badge>
                  <span className="text-xs text-muted-foreground">after {s.delay_days} days</span>
                </div>
                <p className="text-sm font-medium">{s.subject}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{s.body}</p>
                {s.problems?.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-xs text-destructive">
                    {s.problems.map((p: string, i: number) => <li key={i}>{p}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
