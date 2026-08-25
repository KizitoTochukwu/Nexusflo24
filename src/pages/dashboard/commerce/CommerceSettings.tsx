import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StoreSetupCard from "@/components/commerce/StoreSetupCard";
import { useConnectStripe, useSellerAccount, useShopStore, useUpdateStore } from "@/hooks/useCommerce";

const CURRENCIES = ["GBP", "USD", "EUR", "NGN", "CAD", "AUD"];

export default function CommerceSettings() {
  const { data: store, isLoading } = useShopStore();
  const { data: seller } = useSellerAccount();
  const connect = useConnectStripe();
  const updateStore = useUpdateStore();

  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [refunds, setRefunds] = useState("");
  const [shipping, setShipping] = useState("");
  const [terms, setTerms] = useState("");

  useEffect(() => {
    if (!store) return;
    setBusinessName(store.business_name ?? "");
    setBusinessEmail(store.business_email ?? "");
    setBusinessPhone(store.business_phone ?? "");
    setCurrency(store.currency);
    setRefunds(store.policies?.refunds ?? "");
    setShipping(store.policies?.shipping ?? "");
    setTerms(store.policies?.terms ?? "");
  }, [store]);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!store) return <StoreSetupCard />;

  const canPublish = Boolean(seller?.charges_enabled);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Payments (Stripe)</h2>
          </div>
          {seller?.charges_enabled
            ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Connected</Badge>
            : <Badge variant="secondary">Not connected</Badge>}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Payments go directly into your own Stripe account. NexusFlo24 never holds your money.
        </p>
        {seller?.stripe_account_id && (
          <p className="mt-2 text-xs text-muted-foreground">
            {seller.country ? `${seller.country} · ` : ""}
            {seller.livemode ? "Live mode" : "Test mode"} ·
            {seller.payouts_enabled ? " payouts enabled" : " payouts pending"}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {!seller?.stripe_account_id ? (
            <Button onClick={() => connect.mutate("start")} disabled={connect.isPending}>
              Connect Stripe
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => connect.mutate("refresh")} disabled={connect.isPending}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh status
              </Button>
              <Button variant="ghost" onClick={() => connect.mutate("disconnect")} disabled={connect.isPending}>
                <Unplug className="mr-2 h-4 w-4" /> Disconnect
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Business details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-bname">Business name</Label>
            <Input id="s-bname" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-bemail">Business email</Label>
            <Input id="s-bemail" type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-bphone">Business phone</Label>
            <Input id="s-bphone" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
          </div>
          <div>
            <Label>Store currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <h3 className="pt-2 font-semibold">Policies</h3>
        <div>
          <Label htmlFor="s-refunds">Refund policy</Label>
          <Textarea id="s-refunds" rows={3} value={refunds} onChange={(e) => setRefunds(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="s-shipping">Shipping policy</Label>
          <Textarea id="s-shipping" rows={3} value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="s-terms">Terms of sale</Label>
          <Textarea id="s-terms" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
        </div>

        <Button
          onClick={() =>
            updateStore.mutate({
              id: store.id,
              patch: {
                business_name: businessName,
                business_email: businessEmail,
                business_phone: businessPhone,
                currency,
                policies: { refunds, shipping, terms },
              },
            })}
          disabled={updateStore.isPending}
        >
          Save settings
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-6">
        <div>
          <h2 className="font-semibold">Store visibility</h2>
          <p className="text-sm text-muted-foreground">
            {store.status === "published"
              ? "Your storefront is live and can take orders."
              : canPublish
                ? "Publish to make your storefront visible to customers."
                : "Connect Stripe before publishing so customers can pay."}
          </p>
        </div>
        {store.status === "published" ? (
          <Button
            variant="outline"
            onClick={() => updateStore.mutate({ id: store.id, patch: { status: "paused" } })}
          >
            Pause store
          </Button>
        ) : (
          <Button
            disabled={!canPublish}
            onClick={() =>
              updateStore.mutate({
                id: store.id,
                patch: { status: "published", published_at: new Date().toISOString() } as any,
              })}
          >
            Publish store
          </Button>
        )}
      </div>
    </div>
  );
}
