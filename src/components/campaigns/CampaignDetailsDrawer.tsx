import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCampaignById, useCampaignMessages, TRIGGER_TYPES } from "@/hooks/useCampaigns";
import { Mail, MessageSquare, Phone, Layers, BarChart3, Send, Eye, MousePointerClick, TrendingUp, Zap, AlertTriangle, Radio, CheckCircle2, XCircle, Clock, ArrowDown } from "lucide-react";
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
  messages: Array<{ id: string; channel: string; delivery_status: string; opened: boolean; clicked: boolean; replied: boolean; created_at: string; lead_id: string | null }>;
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
        const totalSent = group.length;
        const delivered = group.filter((m) => m.delivery_status === "delivered").length;
        const opened = group.filter((m) => m.opened).length;
        const clicked = group.filter((m) => m.clicked).length;
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
  campaignId, open, onClose,
}: {
  campaignId: string | null; open: boolean; onClose: () => void;
}) {
  const { data: campaign } = useCampaignById(campaignId);
  const { data: messages } = useCampaignMessages(campaignId);

  if (!campaign) return null;

  const content = campaign.message_content as { subject?: string; body?: string } | null;
  const triggerConfig = campaign.trigger_config as { type?: string; value?: string; actions?: string[] } | null;
  const fallback = campaign.fallback_settings as { enabled?: boolean; channel?: string; delay_minutes?: number; condition?: string } | null;
  const deliveredCount = messages?.filter((m) => m.delivery_status === "delivered").length ?? 0;
  const openedCount = messages?.filter((m) => m.opened).length ?? 0;
  const clickedCount = messages?.filter((m) => m.clicked).length ?? 0;
  const repliedCount = messages?.filter((m) => m.replied).length ?? 0;

  // Per-channel breakdown
  const channelBreakdown = messages?.reduce((acc, m) => {
    if (!acc[m.channel]) acc[m.channel] = { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0 };
    acc[m.channel].sent++;
    if (m.delivery_status === "delivered") acc[m.channel].delivered++;
    if (m.opened) acc[m.channel].opened++;
    if (m.clicked) acc[m.channel].clicked++;
    if (m.replied) acc[m.channel].replied++;
    return acc;
  }, {} as Record<string, { sent: number; delivered: number; opened: number; clicked: number; replied: number }>);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
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

          {/* Sequence Timeline */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-accent" /> Sequence Timeline
            </h3>
            <SequenceTimeline messages={messages || []} fallback={fallback} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Send className="h-4 w-4" />} label="Sent" value={campaign.sent_count} />
            <StatCard icon={<Eye className="h-4 w-4" />} label="Open Rate" value={`${(campaign.open_rate * 100).toFixed(1)}%`} />
            <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Click Rate" value={`${(campaign.click_rate * 100).toFixed(1)}%`} />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Conversion" value={`${(campaign.conversion_rate * 100).toFixed(1)}%`} />
          </div>

          {/* Message preview */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Message Content</h3>
            <div className="rounded-lg border bg-muted/30 p-4">
              {content?.subject && <p className="mb-1 text-sm font-medium text-foreground">{content.subject}</p>}
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content?.body || "No content"}</p>
            </div>
          </div>

          {/* Message log */}
          {messages && messages.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                <BarChart3 className="mr-1 inline h-4 w-4" /> Delivery Log ({messages.length})
              </h3>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {messages.slice(0, 20).map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded border px-3 py-1.5 text-xs">
                    <span className="capitalize text-muted-foreground">{m.channel}</span>
                    <Badge variant="outline" className="text-xs capitalize">{m.delivery_status}</Badge>
                    <span className="text-muted-foreground">{format(new Date(m.created_at), "MMM d, HH:mm")}</span>
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
