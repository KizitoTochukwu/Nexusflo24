import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Store order tables are new; generated types may lag behind the migration. */
const db = supabase as any;

export type StoreOrder = {
  id: string;
  user_id: string | null;
  workspace_id: string | null;
  email: string;
  full_name: string | null;
  phone: string | null;
  business_name: string | null;
  website: string | null;
  industry: string | null;
  notes: string | null;
  status: string;
  currency: string;
  subtotal_pence: number;
  total_pence: number;
  monthly_total_pence: number;
  plan_slug: string | null;
  paid_at: string | null;
  created_at: string;
};

export type StoreOrderItem = {
  id: string;
  order_id: string;
  kind: string;
  product_slug: string | null;
  bundle_slug: string | null;
  name: string;
  unit_price_pence: number;
  quantity: number;
  configuration: Record<string, unknown>;
};

export type StoreProject = {
  id: string;
  order_id: string | null;
  order_item_id: string | null;
  user_id: string | null;
  workspace_id: string | null;
  name: string;
  product_slug: string | null;
  bundle_slug: string | null;
  status: string;
  progress: number;
  configuration: Record<string, unknown>;
  onboarding_data: Record<string, unknown>;
  onboarding_completed_at: string | null;
  approval_requested_at: string | null;
  approved_at: string | null;
  go_live_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreProjectUpdate = {
  id: string;
  project_id: string;
  title: string;
  body: string | null;
  update_type: string;
  created_at: string;
};

export const PROJECT_STATUSES = [
  { value: "onboarding", label: "Onboarding" },
  { value: "in_build", label: "In build" },
  { value: "testing", label: "Testing" },
  { value: "awaiting_approval", label: "Awaiting your approval" },
  { value: "live", label: "Live" },
  { value: "on_hold", label: "On hold" },
] as const;

export function projectStatusLabel(status: string) {
  return PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function useStoreOrder(orderId?: string) {
  return useQuery({
    queryKey: ["store-order", orderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      const { data: items } = await db
        .from("store_order_items")
        .select("*")
        .eq("order_id", orderId);
      return { order: (data ?? null) as StoreOrder | null, items: (items ?? []) as StoreOrderItem[] };
    },
    enabled: !!orderId,
    refetchInterval: (query) =>
      (query.state.data as any)?.order?.status === "pending" ? 4000 : false,
  });
}

export function useMyStoreProjects() {
  return useQuery({
    queryKey: ["store-projects", "mine"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoreProject[];
    },
  });
}

export function useStoreProject(projectId?: string) {
  return useQuery({
    queryKey: ["store-project", projectId],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as StoreProject | null;
    },
    enabled: !!projectId,
  });
}

export function useStoreProjectUpdates(projectId?: string) {
  return useQuery({
    queryKey: ["store-project-updates", projectId],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_project_updates")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoreProjectUpdate[];
    },
    enabled: !!projectId,
  });
}

export function useUpdateStoreProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<StoreProject> }) => {
      const { error } = await db.from("store_projects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["store-project", vars.id] });
      qc.invalidateQueries({ queryKey: ["store-projects"] });
    },
  });
}

/* ---------- Admin fulfilment ---------- */

export function useAdminStoreOrders() {
  return useQuery({
    queryKey: ["store-orders", "admin"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as StoreOrder[];
    },
  });
}

export function useAdminStoreProjects() {
  return useQuery({
    queryKey: ["store-projects", "admin"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as StoreProject[];
    },
  });
}

export function useAddProjectUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string; title: string; body?: string; update_type?: string }) => {
      const { data: auth } = await supabase.auth.getSession();
      const { error } = await db.from("store_project_updates").insert({
        ...input,
        update_type: input.update_type ?? "note",
        author_id: auth.session?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["store-project-updates", vars.project_id] });
    },
  });
}
