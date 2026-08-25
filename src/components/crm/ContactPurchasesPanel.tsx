// Phase 5 — commerce purchases shown on the CRM contact record.
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  workspaceId?: string;
  contactId: string;
  email?: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
};

const money = (minor: number, currency: string) => {
  const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", NGN: "₦" };
  const sym = symbols[currency?.toUpperCase()] ?? `${currency?.toUpperCase()} `;
  return `${sym}${(minor / 100).toFixed(2)}`;
};

const statusTone = (status: string) => {
  if (status === "paid") return "default";
  if (["refunded", "partially_refunded", "failed", "cancelled"].includes(status)) return "destructive";
  return "secondary";
};

export default function ContactPurchasesPanel({ workspaceId, contactId, email }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["contact-purchases", workspaceId, contactId, email],
    enabled: Boolean(workspaceId && contactId),
    queryFn: async () => {
      let query = supabase
        .from("shop_orders")
        .select("id, order_number, status, total_amount, currency, created_at, paid_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(50);
      query = email
        ? query.or(`contact_id.eq.${contactId},email.eq.${email.toLowerCase()}`)
        : query.eq("contact_id", contactId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const orders = data ?? [];
  const paid = orders.filter((o) => o.status === "paid");
  const lifetime = paid.reduce((sum, o) => sum + o.total_amount, 0);
  const currency = paid[0]?.currency || orders[0]?.currency || "GBP";

  if (orders.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        <ShoppingBag className="mx-auto mb-2 h-5 w-5 opacity-60" />
        No storefront purchases recorded for this contact yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Paid orders" value={String(paid.length)} />
        <Stat label="Lifetime value" value={money(lifetime, currency)} />
        <Stat
          label="Last purchase"
          value={paid[0]?.paid_at ? new Date(paid[0].paid_at).toLocaleDateString() : "—"}
        />
      </div>

      <ul className="divide-y rounded-md border">
        {orders.map((o) => (
          <li key={o.id} className="flex items-center gap-3 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{o.order_number}</span>
                <Badge variant={statusTone(o.status) as any} className="text-[10px] capitalize">
                  {o.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleString()}
              </p>
            </div>
            <span className="font-medium">{money(o.total_amount, o.currency)}</span>
          </li>
        ))}
      </ul>

      {workspaceId && (
        <Link
          to={`/dashboard/${workspaceId}/commerce/orders`}
          className="text-xs underline text-muted-foreground hover:text-foreground"
        >
          Open Commerce orders
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
