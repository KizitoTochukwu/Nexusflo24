import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Mail, MessageCircle, Smartphone, ShoppingCart, Loader2 } from "lucide-react";
import { useMessageCredits } from "@/hooks/useMessageCredits";
import { usePlanGating } from "@/hooks/usePlanGating";
import { CREDIT_PACKS, type CreditChannel } from "@/lib/stripe/creditPacks";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import CreditTransactionHistory from "./CreditTransactionHistory";

const CHANNEL_META: Record<CreditChannel, { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: "Email", color: "text-blue-500" },
  sms: { icon: Smartphone, label: "SMS", color: "text-emerald-500" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-green-500" },
};

export default function UsageCreditsTab() {
  const workspaceId = useWorkspaceId();
  const { data: credits, isLoading } = useMessageCredits();
  const { limits } = usePlanGating();
  const [purchasing, setPurchasing] = useState<CreditChannel | null>(null);

  const handleBuyCredits = async (channel: CreditChannel) => {
    if (!workspaceId) return;
    setPurchasing(channel);
    try {
      const { data, error } = await supabase.functions.invoke("create-credit-purchase", {
        body: { channel, workspaceId, quantity: 1 },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create checkout session");
    } finally {
      setPurchasing(null);
    }
  };

  const channels: CreditChannel[] = ["email", "sms", "whatsapp"];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Message Credits
          </CardTitle>
          <CardDescription>
            Track your messaging usage and purchase additional credits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {channels.map((channel) => {
                const meta = CHANNEL_META[channel];
                const Icon = meta.icon;
                const balance = credits?.[`${channel}_balance` as keyof typeof credits] as number ?? 0;
                const used = credits?.[`${channel}_used` as keyof typeof credits] as number ?? 0;
                const monthlyAlloc = limits.monthlyCredits[channel];
                const total = balance + used;
                const pct = total > 0 ? Math.round((used / total) * 100) : 0;
                const pack = CREDIT_PACKS[channel];

                return (
                  <div key={channel} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                        <span className="font-medium">{meta.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {monthlyAlloc.toLocaleString()}/mo included
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{balance.toLocaleString()}</span> remaining
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBuyCredits(channel)}
                          disabled={purchasing === channel}
                          className="gap-1.5"
                        >
                          {purchasing === channel ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-3.5 w-3.5" />
                          )}
                          Buy {pack.credits.toLocaleString()} for ${pack.price}
                        </Button>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {used.toLocaleString()} {pack.unit} sent (lifetime)
                    </p>
                    <Separator />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CreditTransactionHistory />
    </div>
  );
}
