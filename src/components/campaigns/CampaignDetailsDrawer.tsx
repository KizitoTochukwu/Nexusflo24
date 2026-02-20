import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCampaignById, useCampaignMessages, type Campaign } from "@/hooks/useCampaigns";
import { Mail, MessageSquare, Phone, Layers, BarChart3, Send, Eye, MousePointerClick, TrendingUp } from "lucide-react";
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
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function CampaignDetailsDrawer({
  campaignId,
  open,
  onClose,
}: {
  campaignId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: campaign } = useCampaignById(campaignId);
  const { data: messages } = useCampaignMessages(campaignId);

  if (!campaign) return null;

  const content = campaign.message_content as { subject?: string; body?: string } | null;
  const deliveredCount = messages?.filter((m) => m.delivery_status === "delivered").length ?? 0;
  const openedCount = messages?.filter((m) => m.opened).length ?? 0;
  const clickedCount = messages?.filter((m) => m.clicked).length ?? 0;

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
