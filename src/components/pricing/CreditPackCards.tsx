import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { CREDIT_PACKS, type CreditChannel } from "@/lib/stripe/creditPacks";
import { formatPrice } from "@/lib/currency/config";
import { startCreditCheckout } from "@/lib/billing/checkout";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { fbqTrack } from "@/lib/analytics/metaPixel";

const channels: CreditChannel[] = ["email", "sms", "whatsapp"];

export default function CreditPackCards() {
  const { user } = useAuth();
  const { currency, convert } = useCurrency();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<CreditChannel, number>>({
    email: 1,
    sms: 1,
    whatsapp: 1,
  });
  const [loadingChannel, setLoadingChannel] = useState<CreditChannel | null>(null);

  const updateQty = (ch: CreditChannel, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [ch]: Math.max(1, Math.min(10, prev[ch] + delta)),
    }));
  };

  const handleBuy = async (ch: CreditChannel) => {
    if (!user) {
      navigate("/register?next=/pricing");
      return;
    }

    setLoadingChannel(ch);
    try {
      const { data: membership, error: wsErr } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (wsErr || !membership) throw new Error("No workspace found. Please complete onboarding first.");

      const pack = CREDIT_PACKS[ch];
      fbqTrack("InitiateCheckout", {
        content_name: `${ch}_credit_pack`,
        content_category: "credit_pack",
        value: convert(pack.price * quantities[ch]),
        currency,
        num_items: quantities[ch],
      });

      const result = await startCreditCheckout({
        channel: ch,
        workspaceId: membership.workspace_id,
        quantity: quantities[ch],
        currency,
      });
      window.location.href = result.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoadingChannel(null);
    }
  };

  return (
    <section className="bg-muted/40 py-12">
      <div className="container">
        <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
          Need More Credits?
        </h2>
        <p className="mx-auto mb-6 max-w-md text-center text-foreground/70">
          Purchase additional credit packs anytime — no subscription change required.
        </p>

        <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-3">
          {channels.map((ch) => {
            const pack = CREDIT_PACKS[ch];
            const qty = quantities[ch];
            const isLoading = loadingChannel === ch;

            return (
              <div
                key={ch}
                className="group relative flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary p-6 text-center shadow-card transition-all duration-300 hover:border-accent hover:shadow-gold"
              >
                <Badge variant="outline" className="border-primary-foreground/30 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                  {ch}
                </Badge>

                <p className="text-3xl font-extrabold text-primary-foreground">{pack.credits.toLocaleString()}</p>
                <p className="text-sm text-primary-foreground/60">{pack.unit} per pack</p>

                <p className="text-lg font-semibold text-accent">
                  ${pack.price}
                  <span className="text-sm font-normal text-primary-foreground/60"> / pack</span>
                </p>

                {/* Quantity stepper */}
                <div className="flex items-center gap-3 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-2 py-1">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-primary-foreground/60 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground disabled:opacity-40"
                    onClick={() => updateQty(ch, -1)}
                    disabled={qty <= 1 || isLoading}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-primary-foreground">{qty}</span>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-primary-foreground/60 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground disabled:opacity-40"
                    onClick={() => updateQty(ch, 1)}
                    disabled={qty >= 10 || isLoading}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {qty > 1 && (
                  <p className="text-xs text-primary-foreground/60">
                    {(pack.credits * qty).toLocaleString()} {pack.unit} · ${pack.price * qty}
                  </p>
                )}

                <Button
                  className="mt-1 w-full bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold"
                  disabled={isLoading}
                  onClick={() => handleBuy(ch)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" /> Buy Now
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
