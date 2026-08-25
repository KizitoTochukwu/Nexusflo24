import { useState } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StoreSetupCard from "@/components/commerce/StoreSetupCard";
import {
  formatMoney,
  ShopOrder,
  useMarkFulfilled,
  useShopOrderItems,
  useShopOrders,
  useShopStore,
} from "@/hooks/useCommerce";

export default function CommerceOrders() {
  const { data: store, isLoading } = useShopStore();
  const { data: orders = [], isLoading: loadingOrders } = useShopOrders(store?.id);
  const [selected, setSelected] = useState<ShopOrder | null>(null);
  const { data: items = [] } = useShopOrderItems(selected?.id);
  const fulfil = useMarkFulfilled();
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!store) return <StoreSetupCard />;

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Orders</h2>
      {loadingOrders ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          No orders yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Total</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Fulfilment</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(o)}>
                  <td className="p-3 font-medium">{o.order_number}</td>
                  <td className="p-3">
                    <p>{o.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{o.email}</p>
                  </td>
                  <td className="p-3">{formatMoney(o.total_amount, o.currency)}</td>
                  <td className="p-3">
                    <Badge variant={o.status === "paid" ? "default" : "secondary"}>{o.status}</Badge>
                  </td>
                  <td className="p-3 capitalize">{o.fulfilment_status.replace(/_/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected?.order_number}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-5 text-sm">
              <div className="rounded-lg border p-4">
                <p className="font-medium">{selected.full_name ?? "Guest"}</p>
                <p className="text-muted-foreground">{selected.email}</p>
                {selected.shipping_address?.line1 && (
                  <p className="mt-2 text-muted-foreground">
                    {[selected.shipping_address.line1, selected.shipping_address.city, selected.shipping_address.postal_code, selected.shipping_address.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <ul className="space-y-2">
                  {items.map((i: any) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span>{i.name} × {i.quantity}</span>
                      <span>{formatMoney(i.total_amount, selected.currency)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-1 border-t pt-3 text-muted-foreground">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(selected.subtotal_amount, selected.currency)}</span></div>
                  {selected.discount_amount > 0 && (
                    <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(selected.discount_amount, selected.currency)}</span></div>
                  )}
                  {selected.shipping_amount > 0 && (
                    <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(selected.shipping_amount, selected.currency)}</span></div>
                  )}
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>Total</span><span>{formatMoney(selected.total_amount, selected.currency)}</span>
                  </div>
                </div>
              </div>

              {selected.status === "paid" && selected.fulfilment_status !== "fulfilled" && (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="flex items-center gap-2 font-medium"><Truck className="h-4 w-4" /> Mark as despatched</p>
                  <div>
                    <Label htmlFor="f-carrier">Carrier</Label>
                    <Input id="f-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Royal Mail" />
                  </div>
                  <div>
                    <Label htmlFor="f-track">Tracking number</Label>
                    <Input id="f-track" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="f-url">Tracking link (optional)</Label>
                    <Input id="f-url" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
                  </div>
                  <Button
                    className="w-full"
                    disabled={fulfil.isPending}
                    onClick={() =>
                      fulfil.mutate(
                        { orderId: selected.id, carrier, tracking, trackingUrl },
                        { onSuccess: () => setSelected(null) },
                      )}
                  >
                    Despatch and notify customer
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
