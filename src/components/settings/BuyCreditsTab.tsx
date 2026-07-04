import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, MessageCircle, Smartphone, Zap, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Props { workspaceId: string }

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail, whatsapp: MessageCircle, sms: Smartphone, any: Zap,
};

export default function BuyCreditsTab({ workspaceId }: Props) {
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["credit-packages-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_packages" as any)
        .select("id, name, channel, credits, price_cents, currency, country, stripe_price_id")
        .eq("is_active", true)
        .order("price_cents", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet-balance", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("message_credits")
        .select("email_balance, sms_balance, whatsapp_balance, email_used, sms_used, whatsapp_used")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      return data;
    },
    enabled: !!workspaceId,
  });

  const handleBuy = async (pkgId: string) => {
    setBuyingId(pkgId);
    const { data, error } = await supabase.functions.invoke("credit-package-checkout", {
      body: { package_id: pkgId, workspace_id: workspaceId },
    });
    setBuyingId(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Checkout failed");
      return;
    }
    const url = (data as any)?.url;
    if (url) window.location.href = url;
  };

  const formatPrice = (cents: number, currency: string) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "usd").toUpperCase() }).format(cents / 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Credit balance</CardTitle>
          <CardDescription>One-off message credit top-ups for this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(["email", "whatsapp", "sms"] as const).map((ch) => {
              const Icon = CHANNEL_ICONS[ch];
              const balance = (wallet as any)?.[`${ch}_balance`] ?? 0;
              const used = (wallet as any)?.[`${ch}_used`] ?? 0;
              return (
                <div key={ch} className="rounded-md border p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                    <Icon className="h-3.5 w-3.5" />{ch}
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">{balance}</div>
                  <div className="text-[11px] text-muted-foreground">used: {used}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit packages</CardTitle>
          <CardDescription>Top up instantly via Stripe Checkout. Credits are added on payment success.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : packages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No credit packages available right now.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {packages.map((p: any) => {
                const Icon = CHANNEL_ICONS[p.channel] || Zap;
                const disabled = !p.stripe_price_id || buyingId === p.id;
                return (
                  <div key={p.id} className="rounded-lg border p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs capitalize">{p.channel}</Badge>
                      </div>
                      {p.country && <Badge variant="secondary" className="text-xs">{p.country}</Badge>}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{p.name}</p>
                      <p className="text-2xl font-bold mt-1">{p.credits.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">credits</span></p>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-lg font-bold text-foreground">{formatPrice(p.price_cents, p.price_currency)}</span>
                      <Button size="sm" disabled={disabled} onClick={() => handleBuy(p.id)} className="gap-1.5">
                        {buyingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                        Buy
                      </Button>
                    </div>
                    {!p.stripe_price_id && <p className="text-[11px] text-amber-700">Not yet purchasable — Stripe price missing.</p>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
