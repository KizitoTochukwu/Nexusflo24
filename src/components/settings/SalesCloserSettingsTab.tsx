import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Loader2, Bot, Zap, Clock, Shield, MessageCircle, Mail, Smartphone } from "lucide-react";
import { useSalesCloserSettings, useUpsertSalesCloserSettings, type SalesCloserSettings } from "@/hooks/useSalesCloser";
import { useBookingPages } from "@/hooks/useBookings";

type Props = { workspaceId: string };

export default function SalesCloserSettingsTab({ workspaceId }: Props) {
  const { data: settings, isLoading } = useSalesCloserSettings(workspaceId);
  const upsert = useUpsertSalesCloserSettings();
  const { data: bookingPages = [] } = useBookingPages(workspaceId);

  const [form, setForm] = useState({
    is_enabled: false,
    mode: "auto_send" as "auto_send" | "human_approval",
    channels: ["email", "whatsapp"] as string[],
    follow_up_enabled: true,
    follow_up_delay_hours: 24,
    max_follow_ups: 3,
    booking_page_id: "" as string,
    system_prompt: "",
    escalation_enabled: true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        is_enabled: settings.is_enabled,
        mode: settings.mode,
        channels: settings.channels,
        follow_up_enabled: settings.follow_up_enabled,
        follow_up_delay_hours: settings.follow_up_delay_hours,
        max_follow_ups: settings.max_follow_ups,
        booking_page_id: settings.booking_page_id || "__none__",
        system_prompt: settings.system_prompt || "",
        escalation_enabled: settings.escalation_enabled,
      });
    }
  }, [settings]);

  const handleSave = () => {
    upsert.mutate({
      workspace_id: workspaceId,
      ...form,
      booking_page_id: form.booking_page_id === "__none__" ? null : form.booking_page_id || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            AI Sales Closer
          </CardTitle>
          <CardDescription>
            Automatically engage leads, handle objections, and convert them into customers using AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable / Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable AI Sales Closer</Label>
              <p className="text-xs text-muted-foreground">Activate AI-powered lead engagement</p>
            </div>
            <Switch
              checked={form.is_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}
            />
          </div>

          <Separator />

          {/* Mode */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Zap className="h-4 w-4" /> Reply Mode
            </Label>
            <Select value={form.mode} onValueChange={(v: any) => setForm((f) => ({ ...f, mode: v }))}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto_send">Auto-send AI replies</SelectItem>
                <SelectItem value="human_approval">Human approval required</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {form.mode === "auto_send"
                ? "AI replies are sent automatically without human review."
                : "AI drafts replies for you to review and approve before sending."}
            </p>
          </div>

          <Separator />

          {/* Active Channels */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> Active Channels
            </Label>
            <p className="text-xs text-muted-foreground">
              Choose which channels the AI chatbot will auto-reply on when leads message you.
            </p>
            <div className="flex flex-col gap-2">
              {[
                { value: "email", label: "Email", icon: Mail },
                { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                { value: "sms", label: "SMS", icon: Smartphone },
              ].map(({ value, label, icon: Icon }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.channels.includes(value)}
                    onCheckedChange={(checked) => {
                      setForm((f) => ({
                        ...f,
                        channels: checked
                          ? [...f.channels, value]
                          : f.channels.filter((c) => c !== value),
                      }));
                    }}
                  />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Auto Follow-ups
              </Label>
              <Switch
                checked={form.follow_up_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, follow_up_enabled: v }))}
              />
            </div>
            {form.follow_up_enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Delay (hours)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={form.follow_up_delay_hours}
                    onChange={(e) => setForm((f) => ({ ...f, follow_up_delay_hours: +e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max follow-ups</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.max_follow_ups}
                    onChange={(e) => setForm((f) => ({ ...f, max_follow_ups: +e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Booking page */}
          <div className="space-y-2">
            <Label className="text-xs">Booking Page (for high-intent leads)</Label>
            <Select
              value={form.booking_page_id}
              onValueChange={(v) => setForm((f) => ({ ...f, booking_page_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a booking page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {bookingPages.map((bp: any) => (
                  <SelectItem key={bp.id} value={bp.id}>
                    {bp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Escalation */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-1.5">
                <Shield className="h-4 w-4" /> Hot Lead Escalation
              </Label>
              <p className="text-xs text-muted-foreground">
                Notify you when AI detects a lead is ready to buy
              </p>
            </div>
            <Switch
              checked={form.escalation_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, escalation_enabled: v }))}
            />
          </div>

          <Separator />

          {/* Custom system prompt */}
          <div className="space-y-2">
            <Label className="text-xs">Custom Instructions (optional)</Label>
            <Textarea
              value={form.system_prompt}
              onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
              placeholder="Add custom instructions for the AI, e.g., product details, pricing tiers, brand voice..."
              rows={4}
            />
          </div>

          <Button onClick={handleSave} disabled={upsert.isPending} className="bg-accent text-accent-foreground">
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
