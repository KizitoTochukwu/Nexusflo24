import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Pencil, Trash2, Copy, Check, Mail, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";
import SharePagePopover from "./SharePagePopover";
import type { BookingPage, Booking } from "@/hooks/useBookings";
import type { BookingAutomationStatus } from "@/hooks/useBookingAutomationStatus";

interface Props {
  page: BookingPage;
  bookings: Booking[];
  baseUrl: string;
  automationStatus?: BookingAutomationStatus;
  onEdit: () => void;
  onDelete: () => void;
}

export default function BookingPageCard({ page, bookings, baseUrl, automationStatus, onEdit, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const upcoming = bookings.filter(
    (b) => b.booking_page_id === page.id && b.status === "confirmed" && new Date(b.start_time) >= new Date(),
  );
  const publicUrl = page.slug ? `${baseUrl}/book/${page.slug}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Booking link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const chips = [
    { on: automationStatus?.emailConfirmation ?? true, label: "Email confirmation", icon: Mail },
    { on: automationStatus?.whatsappReminder ?? false, label: "WhatsApp reminder", icon: MessageSquare },
    { on: automationStatus?.crmPipeline ?? true, label: "CRM pipeline", icon: Users },
  ];

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{page.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{page.duration_minutes} min • {page.timezone}</p>
          </div>
          <Badge
            variant="outline"
            className={
              page.status === "active"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-muted text-muted-foreground"
            }
          >
            {page.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col">
        {page.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{page.description}</p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {upcoming.length} upcoming booking{upcoming.length !== 1 ? "s" : ""}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c.label}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                c.on
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${c.on ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              <c.icon className="h-3 w-3" />
              {c.label}
            </span>
          ))}
        </div>

        {publicUrl && (
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Public booking link</label>
            <div className="flex items-center gap-1.5">
              <Input readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} className="h-8 text-xs bg-muted/40" />
              <Button variant="secondary" size="sm" className="h-8 px-2 shrink-0" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 mt-auto">
          {publicUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Preview
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
          {publicUrl && <SharePagePopover url={publicUrl} title={page.name} />}
          <Button variant="ghost" size="sm" onClick={onDelete} className="ml-auto text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
