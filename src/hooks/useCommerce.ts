import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

/** Commerce tables are new; generated types may lag behind the migration. */
const db = supabase as any;

export type ShopStore = {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "published" | "paused";
  currency: string;
  countries_served: string[];
  product_types: string[];
  business_name: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: Record<string, unknown>;
  policies: Record<string, string>;
  setup_step: number;
  setup_completed_at: string | null;
  published_at: string | null;
  platform_fee_bps: number;
};

export type ShopBranding = {
  store_id: string;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string;
  accent_color: string;
  font_family: string;
  tagline: string | null;
  footer_text: string | null;
  seo_title: string | null;
  seo_description: string | null;
  social_links: Record<string, string>;
};

export type ShopProduct = {
  id: string;
  store_id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  product_type: "physical" | "digital" | "service" | "course" | "membership";
  status: "draft" | "active" | "archived";
  visibility: "public" | "hidden";
  price_amount: number;
  compare_at_amount: number | null;
  currency: string;
  billing_type: "one_time" | "recurring";
  billing_interval: string | null;
  requires_shipping: boolean;
  track_inventory: boolean;
  inventory_quantity: number;
  allow_backorder: boolean;
  academy_course_slug: string | null;
  button_text: string;
  tags: string[];
  created_at: string;
};

export type ShopOrder = {
  id: string;
  order_number: string;
  email: string;
  full_name: string | null;
  status: string;
  fulfilment_status: string;
  currency: string;
  subtotal_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  refunded_amount: number;
  paid_at: string | null;
  created_at: string;
  shipping_address: Record<string, any>;
};

export type SellerAccount = {
  workspace_id: string;
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  default_currency: string | null;
  country: string | null;
  livemode: boolean;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function useShopStore() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["shop-store", workspaceId],
    queryFn: async (): Promise<ShopStore | null> => {
      const { data, error } = await db
        .from("shop_stores")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useShopBranding(storeId?: string) {
  return useQuery({
    queryKey: ["shop-branding", storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<ShopBranding | null> => {
      const { data, error } = await db
        .from("shop_store_branding")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateStore() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; currency: string; business_email: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const base = slugify(input.name) || "store";
      const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await db
        .from("shop_stores")
        .insert({
          workspace_id: workspaceId,
          slug,
          name: input.name,
          currency: input.currency,
          business_email: input.business_email,
          business_name: input.name,
          status: "draft",
          setup_step: 1,
          created_by: userData?.user?.id ?? null,
        })
        .select("*")
        .maybeSingle();
      if (error) throw error;
      await db.from("shop_store_branding").insert({ store_id: data.id, workspace_id: workspaceId });
      return data as ShopStore;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-store"] });
      toast.success("Storefront created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create the storefront"),
  });
}

export function useUpdateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ShopStore> }) => {
      const { error } = await db.from("shop_stores").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-store"] });
      toast.success("Storefront updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save your changes"),
  });
}

export function useUpdateBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeId, patch }: { storeId: string; patch: Partial<ShopBranding> }) => {
      const { error } = await db.from("shop_store_branding").update(patch).eq("store_id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-branding"] });
      toast.success("Branding saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save branding"),
  });
}

export function useShopProducts(storeId?: string) {
  return useQuery({
    queryKey: ["shop-products", storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<ShopProduct[]> => {
      const { data, error } = await db
        .from("shop_products")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveProduct() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeId, product }: { storeId: string; product: Partial<ShopProduct> & { id?: string } }) => {
      if (product.id) {
        const { id, ...patch } = product;
        const { error } = await db.from("shop_products").update(patch).eq("id", id);
        if (error) throw error;
        return id;
      }
      const slug = product.slug || `${slugify(product.name ?? "product")}-${Math.random().toString(36).slice(2, 5)}`;
      const { data, error } = await db
        .from("shop_products")
        .insert({ ...product, slug, store_id: storeId, workspace_id: workspaceId })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return data?.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success("Product saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the product"),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("shop_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success("Product deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete the product"),
  });
}

export function useShopOrders(storeId?: string) {
  return useQuery({
    queryKey: ["shop-orders", storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<ShopOrder[]> => {
      const { data, error } = await db
        .from("shop_orders")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useShopOrderItems(orderId?: string) {
  return useQuery({
    queryKey: ["shop-order-items", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("shop_order_items")
        .select("*")
        .eq("order_id", orderId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useShopCustomers(storeId?: string) {
  return useQuery({
    queryKey: ["shop-customers", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db
        .from("shop_customers")
        .select("*")
        .eq("store_id", storeId)
        .order("last_order_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarkFulfilled() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; carrier?: string; tracking?: string; trackingUrl?: string }) => {
      const { data: fulfilment, error } = await db
        .from("shop_fulfilments")
        .insert({
          workspace_id: workspaceId,
          order_id: input.orderId,
          status: "shipped",
          carrier: input.carrier || null,
          tracking_number: input.tracking || null,
          tracking_url: input.trackingUrl || null,
        })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      await db.from("shop_orders").update({ fulfilment_status: "fulfilled" }).eq("id", input.orderId);
      await supabase.functions.invoke("shop-notify", {
        body: { event: "order_shipped", order_id: input.orderId, fulfilment_id: fulfilment?.id },
      });
      return fulfilment?.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-orders"] });
      toast.success("Marked as despatched and the customer has been emailed");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update fulfilment"),
  });
}

export function useSellerAccount() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["seller-account", workspaceId],
    queryFn: async (): Promise<SellerAccount | null> => {
      const { data, error } = await db
        .from("seller_payment_accounts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useConnectStripe() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: "start" | "refresh" | "disconnect") => {
      const { data, error } = await supabase.functions.invoke("shop-connect-stripe", {
        body: { action, workspaceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (action === "start" && data?.url) window.location.href = data.url;
      return data;
    },
    onSuccess: (_d, action) => {
      qc.invalidateQueries({ queryKey: ["seller-account"] });
      if (action === "refresh") toast.success("Stripe status refreshed");
      if (action === "disconnect") toast.success("Stripe account disconnected");
    },
    onError: (e: any) => toast.error(e?.message ?? "Stripe connection failed"),
  });
}

export function useShippingZones(storeId?: string) {
  return useQuery({
    queryKey: ["shop-shipping", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db
        .from("shop_shipping_zones")
        .select("*, rates:shop_shipping_rates(*)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function formatMoney(minor: number, currency = "GBP") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((minor ?? 0) / 100);
  } catch {
    return `${currency} ${((minor ?? 0) / 100).toFixed(2)}`;
  }
}
