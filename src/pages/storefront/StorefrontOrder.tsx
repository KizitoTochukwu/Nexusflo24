import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StorefrontShell from "@/components/commerce/StorefrontShell";
import { supabase } from "@/integrations/supabase/client";
import { money, usePublicStore } from "@/hooks/useStorefront";

const db = supabase as any;

export default function StorefrontOrder() {
  const { storeSlug, orderId } = useParams<{ storeSlug: string; orderId: string }>();
  const [params] = useSearchParams();
  const { data: store } = usePublicStore(storeSlug);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: o } = await db.from("shop_orders").select("*").eq("id", orderId).maybeSingle();
      if (!active) return;
      setOrder(o);
      if (o) {
        const { data: its } = await db.from("shop_order_items").select("*").eq("order_id", o.id);
        setItems(its ?? []);
        const productIds = (its ?? []).map((i: any) => i.product_id).filter(Boolean);
        if (productIds.length) {
          const { data: fs } = await db
            .from("shop_product_files")
            .select("id, product_id, file_name")
            .in("product_id", productIds);
          setFiles(fs ?? []);
        }
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [orderId]);

  const download = async (fileId: string) => {
    setDownloading(fileId);
    try {
      const { data, error } = await supabase.functions.invoke("shop-download-url", {
        body: { orderId, fileId, email: order?.email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.open(data.url, "_blank", "noopener");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not create the download link.");
    } finally {
      setDownloading(null);
    }
  };

  if (!store || loading) return <div className="p-10"><Skeleton className="h-64" /></div>;

  if (!order) {
    return (
      <StorefrontShell store={store}>
        <div className="py-20 text-center">
          <h1 className="text-2xl font-bold">Order not found</h1>
          <Button asChild className="mt-6"><Link to={`/s/${store.slug}`}>Back to shop</Link></Button>
        </div>
      </StorefrontShell>
    );
  }

  const paid = order.status === "paid" || order.status === "partially_refunded";

  return (
    <StorefrontShell store={store}>
      <Seo title={`Order ${order.order_number} | ${store.name}`} description="Your order details and downloads." />
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-8 text-center">
          {paid
            ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            : <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />}
          <h1 className="mt-4 text-2xl font-bold">
            {paid ? "Thank you for your order" : "We are confirming your payment"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Order {order.order_number}
            {params.get("status") === "success" && !paid ? " — this page updates once Stripe confirms." : ""}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border bg-card p-6 text-sm">
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>{i.name} × {i.quantity}</span>
                <span>{money(i.total_amount, order.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
            <span>Total</span>
            <span>{money(order.total_amount, order.currency)}</span>
          </div>
        </div>

        {paid && files.length > 0 && (
          <div className="mt-6 rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Your downloads</h2>
            <ul className="mt-3 space-y-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{f.file_name}</span>
                  <Button size="sm" variant="outline" disabled={downloading === f.id} onClick={() => download(f.id)}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button asChild variant="ghost" className="mt-6 w-full">
          <Link to={`/s/${store.slug}`}>Continue shopping</Link>
        </Button>
      </div>
    </StorefrontShell>
  );
}
