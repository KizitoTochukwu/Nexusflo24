import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoreOrder, StoreProject } from "@/hooks/useStoreOrders";

/** Store tables are managed outside the generated types. */
const db = supabase as any;

export type CatalogueTable =
  | "store_products"
  | "store_bundles"
  | "store_categories"
  | "store_plans"
  | "store_problems";

const QUERY_KEYS: Record<CatalogueTable, string[]> = {
  store_products: ["store-products"],
  store_bundles: ["store-bundles"],
  store_categories: ["store-categories"],
  store_plans: ["store-plans"],
  store_problems: ["store-problems"],
};

/** Admin view: every row, published or not. */
export function useCatalogueRows(table: CatalogueTable) {
  return useQuery({
    queryKey: ["store-admin", table],
    queryFn: async () => {
      const { data, error } = await db.from(table).select("*").order("position");
      if (error) throw error;
      return (data ?? []) as Record<string, any>[];
    },
  });
}

export function useSaveCatalogueRow(table: CatalogueTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, any> }) => {
      if (id) {
        const { error } = await db.from(table).update(values).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await db.from(table).insert(values).select("id").maybeSingle();
      if (error) throw error;
      return data?.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-admin", table] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS[table] });
    },
  });
}

export function useDeleteCatalogueRow(table: CatalogueTable) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-admin", table] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS[table] });
    },
  });
}

/* ---------- Analytics ---------- */

export type StoreAnalytics = {
  paidOrders: number;
  pendingOrders: number;
  setupRevenuePence: number;
  monthlyRevenuePence: number;
  averageOrderPence: number;
  conversionRate: number;
  requests: number;
  liveProjects: number;
  activeProjects: number;
  byProduct: { name: string; slug: string; orders: number; revenuePence: number }[];
  byMonth: { month: string; revenue: number; orders: number }[];
};

export function useStoreAnalytics() {
  const orders = useQuery({
    queryKey: ["store-admin", "orders"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as StoreOrder[];
    },
  });

  const items = useQuery({
    queryKey: ["store-admin", "order-items"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_order_items")
        .select("order_id,name,product_slug,unit_price_pence,quantity")
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const projects = useQuery({
    queryKey: ["store-admin", "projects-analytics"],
    queryFn: async () => {
      const { data, error } = await db.from("store_projects").select("id,status").limit(1000);
      if (error) throw error;
      return (data ?? []) as Pick<StoreProject, "id" | "status">[];
    },
  });

  const requests = useQuery({
    queryKey: ["store-admin", "requests-count"],
    queryFn: async () => {
      const { count, error } = await db
        .from("store_requests")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const data = useMemo<StoreAnalytics>(() => {
    const all = orders.data ?? [];
    // An order counts as paid once Stripe confirms it; the workflow status then
    // moves on to awaiting_onboarding and beyond, so match on payment instead.
    const UNPAID = new Set(["pending", "cancelled", "failed", "expired"]);
    const paid = all.filter((o) => !!o.paid_at || !UNPAID.has(o.status));
    const paidIds = new Set(paid.map((o) => o.id));
    const setupRevenuePence = paid.reduce((sum, o) => sum + (o.total_pence ?? 0), 0);
    const monthlyRevenuePence = paid.reduce((sum, o) => sum + (o.monthly_total_pence ?? 0), 0);

    const productMap = new Map<string, { name: string; slug: string; orders: number; revenuePence: number }>();
    for (const item of items.data ?? []) {
      if (!paidIds.has(item.order_id)) continue;
      const slug = item.product_slug ?? item.name;
      const entry = productMap.get(slug) ?? { name: item.name, slug, orders: 0, revenuePence: 0 };
      entry.orders += item.quantity ?? 1;
      entry.revenuePence += (item.unit_price_pence ?? 0) * (item.quantity ?? 1);
      productMap.set(slug, entry);
    }

    const monthMap = new Map<string, { month: string; revenue: number; orders: number }>();
    for (const order of paid) {
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) ?? {
        month: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
        revenue: 0,
        orders: 0,
      };
      entry.revenue += (order.total_pence ?? 0) / 100;
      entry.orders += 1;
      monthMap.set(key, entry);
    }

    const projectRows = projects.data ?? [];

    return {
      paidOrders: paid.length,
      pendingOrders: all.length - paid.length,
      setupRevenuePence,
      monthlyRevenuePence,
      averageOrderPence: paid.length ? Math.round(setupRevenuePence / paid.length) : 0,
      conversionRate: all.length ? (paid.length / all.length) * 100 : 0,
      requests: requests.data ?? 0,
      liveProjects: projectRows.filter((p) => p.status === "live").length,
      activeProjects: projectRows.filter((p) => !["live", "on_hold"].includes(p.status)).length,
      byProduct: [...productMap.values()].sort((a, b) => b.revenuePence - a.revenuePence).slice(0, 8),
      byMonth: [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-12),
    };
  }, [orders.data, items.data, projects.data, requests.data]);

  return {
    data,
    isLoading: orders.isLoading || items.isLoading || projects.isLoading,
  };
}
