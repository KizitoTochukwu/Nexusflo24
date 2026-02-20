import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCampaignById, useCampaignMessages, TRIGGER_TYPES } from "@/hooks/useCampaigns";
import { Mail, MessageSquare, Phone, Layers, BarChart3, Send, Eye, MousePointerClick, TrendingUp, Zap, AlertTriangle, Radio } from "lucide-react";
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

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Send className="h-4 w-4" />} label="Sent" value={campaign.sent_count} />
            <StatCard icon={<Eye className="h-4 w-4" />} label="Open Rate" value={`${(campaign.open_rate * 100).toFixed(1)}%`} />
            <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Click Rate" value={`${(campaign.click_rate * 100).toFixed(1)}%`} />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Conversion" value={`${(campaign.conversion_rate * 100).toFixed(1)}%`} />
          </div>

          {/* Per-channel breakdown */}
          {channelBreakdown && Object.keys(channelBreakdown).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Per-Channel Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(channelBreakdown).map(([ch, stats]) => (
                  <div key={ch} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="flex items-center gap-1.5 text-sm capitalize font-medium">
                      {channelIcons[ch] || null} {ch}
                    </span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{stats.sent} sent</span>
                      <span>{stats.delivered} delivered</span>
                      <span>{stats.opened} opened</span>
                      <span>{stats.clicked} clicked</span>
                      <span>{stats.replied} replied</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
