import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCampaignById, useCampaignMessages, TRIGGER_TYPES } from "@/hooks/useCampaigns";
import MessageContentPreview from "@/components/campaigns/MessageContentPreview";
import { computeCampaignMetrics, resolveCampaignMetrics, formatRate } from "@/lib/campaigns/metrics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquare, Phone, Layers, Send, Eye, MousePointerClick, TrendingUp, Zap, AlertTriangle, Radio, CheckCircle2, XCircle, Clock, ArrowDown, Loader2, Rocket, Pencil } from "lucide-react";
import { format } from "date-fns";


const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
  "multi-channel": <Layers className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-accent/20 text-accent-foreground",
  active: "bg-green-100 text-green-800",
  paused: "bg-orange-100 text-orange-800",
  completed: "bg-primary/10 text-primary",
};

const deliveryStatusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  delivered: { color: "text-emerald-600", icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Delivered" },
  sent: { color: "text-blue-600", icon: <Send className="h-3.5 w-3.5" />, label: "Sent" },
  pending: { color: "text-amber-600", icon: <Clock className="h-3.5 w-3.5" />, label: "Pending" },
  failed: { color: "text-red-600", icon: <XCircle className="h-3.5 w-3.5" />, label: "Failed" },
  bounced: { color: "text-red-600", icon: <XCircle className="h-3.5 w-3.5" />, label: "Bounced" },
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SequenceTimeline({
  messages,
  fallback,
}: {
  messages: Array<{ id: string; channel: string; delivery_status: string; opened: boolean; clicked: boolean; replied: boolean; created_at: string; lead_id: string | null; error?: string | null }>;
  fallback: { enabled?: boolean; channel?: string; delay_minutes?: number; condition?: string } | null;
}) {
  if (!messages || messages.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">
        No messages sent yet. The sequence timeline will appear once messages are delivered.
      </div>
    );
  }

  // Group messages by channel in send order
  const channelOrder = ["email", "whatsapp", "sms"];
  const channelGroups: Record<string, typeof messages> = {};
  messages.forEach((m) => {
    if (!channelGroups[m.channel]) channelGroups[m.channel] = [];
    channelGroups[m.channel].push(m);
  });

  const orderedChannels = channelOrder.filter((ch) => channelGroups[ch]);
  // Add any channels not in the standard order
  Object.keys(channelGroups).forEach((ch) => {
    if (!orderedChannels.includes(ch)) orderedChannels.push(ch);
  });

  const channelLabels: Record<string, string> = {
    email: "Email",
    whatsapp: "WhatsApp",
    sms: "SMS",
  };

  return (
    <div className="space-y-0">
      {orderedChannels.map((channel, idx) => {
        const group = channelGroups[channel];
        const groupMetrics = computeCampaignMetrics(group);
        const totalSent = groupMetrics.sent;
        const delivered = groupMetrics.delivered;
        const opened = groupMetrics.opened;
        const clicked = groupMetrics.clicked;
        const failed = group.filter((m) => m.delivery_status === "failed" || m.delivery_status === "bounced").length;
        const pending = group.filter((m) => m.delivery_status === "pending").length;
        const firstSent = group.reduce((min, m) => (m.created_at < min ? m.created_at : min), group[0].created_at);
        const lastSent = group.reduce((max, m) => (m.created_at > max ? m.created_at : max), group[0].created_at);

        const overallStatus = failed === totalSent ? "failed" : delivered > 0 ? "delivered" : pending > 0 ? "pending" : "sent";
        const statusConf = deliveryStatusConfig[overallStatus] || deliveryStatusConfig.pending;

        return (
          <div key={channel}>
            {/* Timeline node */}
            <div className="relative flex gap-3">
              {/* Vertical line */}
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  overallStatus === "delivered" ? "border-emerald-500 bg-emerald-50" :
                  overallStatus === "failed" ? "border-red-500 bg-red-50" :
                  "border-amber-500 bg-amber-50"
                }`}>
                  {channelIcons[channel] || <Mail className="h-4 w-4" />}
                </div>
                {idx < orderedChannels.length - 1 && (
                  <div className="w-0.5 flex-1 min-h-[24px] bg-border" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-foreground">
                      {channelLabels[channel] || channel}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${statusConf.color}`}>
                      {statusConf.icon} {statusConf.label}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center rounded bg-muted/50 py-1.5">
                      <p className="font-bold text-foreground">{totalSent}</p>
                      <p className="text-muted-foreground">Sent</p>
                    </div>
                    <div className="text-center rounded bg-muted/50 py-1.5">
                      <p className="font-bold text-emerald-600">{delivered}</p>
                      <p className="text-muted-foreground">Delivered</p>
                    </div>
                    <div className="text-center rounded bg-muted/50 py-1.5">
                      <p className="font-bold text-blue-600">{opened}</p>
                      <p className="text-muted-foreground">Opened</p>
                    </div>
                    <div className="text-center rounded bg-muted/50 py-1.5">
                      <p className="font-bold text-accent">{clicked}</p>
                      <p className="text-muted-foreground">Clicked</p>
                    </div>
                  </div>

                  {failed > 0 && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> {failed} failed/bounced
                    </p>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground">
                    {format(new Date(firstSent), "MMM d, HH:mm")}
                    {firstSent !== lastSent && ` — ${format(new Date(lastSent), "MMM d, HH:mm")}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Fallback connector between channels */}
            {idx < orderedChannels.length - 1 && fallback?.enabled && (
              <div className="flex gap-3 -mt-2 mb-1">
                <div className="flex flex-col items-center w-10">
                  <div className="w-0.5 h-2 bg-border" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-full px-3 py-1">
                  <ArrowDown className="h-3 w-3" />
                  Fallback after {fallback.delay_minutes}min ({fallback.condition || "unread"})
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CampaignDetailsDrawer({
  campaignId, open, onClose, onEdit,
}: {
  campaignId: string | null; open: boolean; onClose: () => void; onEdit?: () => void;
}) {
  const { data: campaign } = useCampaignById(campaignId);
  const { data: messages } = useCampaignMessages(campaignId);
  const { data: pendingFallbacks } = useQuery({
    queryKey: ["campaign-fallbacks", campaignId],
    enabled: !!campaignId,
    refetchInterval: 15000,
    queryFn: async () => {
      if (!campaignId) return [];
      const { data } = await supabase
        .from("scheduled_jobs")
        .select("id, run_at, status, payload, lead_id, error")
        .eq("automation_id", campaignId)
        .in("status", ["pending", "running"])
        .order("run_at", { ascending: true })
        .limit(50);
      return (data ?? []).filter((j: any) => j?.payload?.type === "campaign_fallback");
    },
  });
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const handleSendCampaign = async () => {
    if (!campaign) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("execute-campaign", {
        body: { campaign_id: campaign.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Campaign sent to ${data.sent || 0} leads (${data.failed || 0} failed)`);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
      qc.invalidateQueries({ queryKey: ["campaign-messages", campaignId] });
    } catch (e: any) {
      toast.error(e.message || "Failed to send campaign");
    } finally {
      setSending(false);
      setSendConfirmOpen(false);
    }
  };

  if (!campaign) return null;

  const content = campaign.message_content as Record<string, unknown> | null;
  const triggerConfig = campaign.trigger_config as { type?: string; value?: string; actions?: string[] } | null;
  const fallback = campaign.fallback_settings as { enabled?: boolean; channel?: string; delay_minutes?: number; condition?: string } | null;
  const metrics = resolveCampaignMetrics(campaign, computeCampaignMetrics(messages));

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full max-w-full overflow-x-hidden overflow-y-auto sm:max-w-lg lg:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">

            {channelIcons[campaign.type]}
            {campaign.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Status & meta */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusColors[campaign.status] || ""}>{campaign.status}</Badge>
            <Badge variant="outline" className="capitalize">{campaign.type}</Badge>
            <Badge variant="outline" className="capitalize">{campaign.objective}</Badge>
            <Badge variant="outline" className="capitalize flex items-center gap-1">
              {campaign.campaign_mode === "triggered" ? <Zap className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
              {campaign.campaign_mode || "broadcast"}
            </Badge>
          </div>

          {/* Send Campaign Button */}
          {campaign.campaign_mode !== "triggered" && ["draft", "active", "scheduled"].includes(campaign.status) && (
            <>
              <Button onClick={() => setSendConfirmOpen(true)} disabled={sending} className="w-full gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {sending ? "Sending..." : "Send Campaign Now"}
              </Button>
              <AlertDialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send Campaign?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will send "{campaign.name}" to all matching leads via {campaign.type}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSendCampaign} disabled={sending}>
                      {sending ? "Sending..." : "Send Now"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {/* Trigger info */}
          {campaign.campaign_mode === "triggered" && triggerConfig?.type && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
              <p className="text-xs font-semibold text-accent-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> Automation Trigger
              </p>
              <p className="mt-1 text-sm text-foreground">
                {TRIGGER_TYPES.find(t => t.value === triggerConfig.type)?.label || triggerConfig.type}
                {triggerConfig.value && <span className="text-muted-foreground"> — {triggerConfig.value}</span>}
              </p>
              {triggerConfig.actions?.length ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Actions: {triggerConfig.actions.join(", ")}
                </p>
              ) : null}
            </div>
          )}

          {/* Fallback info */}
          {fallback?.enabled && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Fallback Active
              </p>
              <p className="mt-1 text-sm text-foreground">
                Send <span className="font-medium uppercase">{fallback.channel}</span> after {fallback.delay_minutes}min if {fallback.condition}
              </p>
            </div>
          )}

          {/* Pending fallback queue */}
          {pendingFallbacks && pendingFallbacks.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Fallback queued ({pendingFallbacks.length})
              </p>
              <div className="mt-1 space-y-1">
                {pendingFallbacks.slice(0, 5).map((j: any) => (
                  <p key={j.id} className="text-xs text-amber-900">
                    {String(j.payload?.channel || "sms").toUpperCase()} → runs {format(new Date(j.run_at), "MMM d, HH:mm")} {j.status === "running" ? " (sending now)" : ""}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Sequence Timeline */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-accent" /> Sequence Timeline
            </h3>
            <SequenceTimeline messages={messages || []} fallback={fallback} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Send className="h-4 w-4" />} label="Sent" value={metrics.sent} />
            <StatCard icon={<Eye className="h-4 w-4" />} label="Open Rate" value={formatRate(metrics.openRate)} />
            <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Click Rate" value={formatRate(metrics.clickRate)} />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Conversion" value={`${(campaign.conversion_rate * 100).toFixed(1)}%`} />
          </div>

          {/* Message preview */}
          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Message Content</h3>
            <Tabs defaultValue="preview">
              <TabsList className="mb-2">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="source">Source</TabsTrigger>
              </TabsList>
              <TabsContent value="preview">
                <div className="max-h-[420px] overflow-y-auto overflow-x-hidden rounded-lg border bg-muted/30 p-4">
                  <MessageContentPreview content={content} channel={campaign.type} />
                </div>
              </TabsContent>
              <TabsContent value="source">
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                  {JSON.stringify(content ?? {}, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </div>


          {/* Message log */}
          {messages && messages.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                <BarChart3 className="mr-1 inline h-4 w-4" /> Delivery Log ({messages.length})
              </h3>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {messages.slice(0, 20).map((m) => (
                  <div key={m.id} className="rounded border px-3 py-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="capitalize text-muted-foreground">{m.channel}</span>
                      <Badge variant="outline" className="text-xs capitalize">{m.delivery_status}</Badge>
                      <span className="text-muted-foreground">{format(new Date(m.created_at), "MMM d, HH:mm")}</span>
                    </div>
                    {m.delivery_status === "failed" && m.error && (
                      <p className="mt-1 break-words text-[11px] text-red-600">⚠ {m.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Created: {format(new Date(campaign.created_at), "MMM d, yyyy 'at' HH:mm")}</p>
            {campaign.scheduled_at && <p>Scheduled: {format(new Date(campaign.scheduled_at), "MMM d, yyyy 'at' HH:mm")}</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
