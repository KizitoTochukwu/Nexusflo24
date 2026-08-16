import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoreLevel } from "@/lib/store/constants";

/** Store tables are new; the generated types may lag behind the migration. */
const db = supabase as any;

export type StoreCategory = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon: string | null;
  position: number;
};

export type StoreProblem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  category_slug: string | null;
  position: number;
};

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  category_slug: string;
  level: StoreLevel;
  badge: string | null;
  outcome: string;
  summary: string | null;
  problem_statement: string | null;
  deliverables: string[];
  best_for: string[];
  integrations: string[];
  industries: string[];
  workflow: string[];
  tags: string[];
  problem_slugs: string[];
  config_schema: unknown[];
  base_price_pence: number;
  delivery_estimate: string | null;
  delivery_days: number | null;
  is_popular: boolean;
  managed_support: boolean;
  position: number;
  created_at: string;
};

export type StoreBundle = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  best_for: string | null;
  includes: string[];
  product_slugs: string[];
  price_pence: number;
  saving_pence: number;
  badge: string | null;
  delivery_estimate: string | null;
  position: number;
};

export type StorePlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_pence: number;
  price_prefix: string | null;
  billing_interval: string;
  features: string[];
  position: number;
};

export type StoreRequestInput = {
  request_type: "configuration" | "finder" | "custom" | "bundle" | "plan";
  product_slug?: string | null;
  bundle_slug?: string | null;
  plan_slug?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  business_name?: string | null;
  website?: string | null;
  industry?: string | null;
  answers?: Record<string, unknown>;
  message?: string | null;
  estimated_price_pence?: number | null;
};

export function useStoreCategories() {
  return useQuery({
    queryKey: ["store-categories"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_categories")
        .select("*")
        .eq("is_published", true)
        .order("position");
      if (error) throw error;
      return (data ?? []) as StoreCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStoreProblems() {
  return useQuery({
    queryKey: ["store-problems"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_problems")
        .select("*")
        .eq("is_published", true)
        .order("position");
      if (error) throw error;
      return (data ?? []) as StoreProblem[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStoreProducts() {
  return useQuery({
    queryKey: ["store-products"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_products")
        .select("*")
        .eq("is_published", true)
        .order("position");
      if (error) throw error;
      return (data ?? []) as StoreProduct[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStoreProduct(slug?: string) {
  return useQuery({
    queryKey: ["store-product", slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_products")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as StoreProduct | null;
    },
    enabled: !!slug,
  });
}

export function useStoreBundles() {
  return useQuery({
    queryKey: ["store-bundles"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_bundles")
        .select("*")
        .eq("is_published", true)
        .order("position");
      if (error) throw error;
      return (data ?? []) as StoreBundle[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStorePlans() {
  return useQuery({
    queryKey: ["store-plans"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_plans")
        .select("*")
        .eq("is_published", true)
        .order("position");
      if (error) throw error;
      return (data ?? []) as StorePlan[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Saves the enquiry and mirrors the contact into the CRM as a lead. */
export function useSubmitStoreRequest() {
  return useMutation({
    mutationFn: async (input: StoreRequestInput) => {
      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user?.id ?? null;

      const { data, error } = await db
        .from("store_requests")
        .insert({ ...input, answers: input.answers ?? {}, user_id: userId })
        .select("id")
        .maybeSingle();
      if (error) throw error;

      if (input.email) {
        const label =
          input.product_slug || input.bundle_slug || input.plan_slug || input.request_type;
        try {
          await supabase.functions.invoke("capture-lead", {
            body: {
              full_name: input.full_name || null,
              email: input.email,
              phone: input.phone || null,
              source: "Automation Store",
              tags: ["automation-store", input.request_type, label].filter(Boolean),
              notes: [
                `Automation Store ${input.request_type} request`,
                label ? `Item: ${label}` : null,
                input.business_name ? `Business: ${input.business_name}` : null,
                input.website ? `Website: ${input.website}` : null,
                input.industry ? `Industry: ${input.industry}` : null,
                input.estimated_price_pence
                  ? `Estimated setup: £${(input.estimated_price_pence / 100).toFixed(0)}`
                  : null,
                input.message ? `Notes: ${input.message}` : null,
                Object.keys(input.answers ?? {}).length
                  ? `Answers: ${JSON.stringify(input.answers)}`
                  : null,
              ]
                .filter(Boolean)
                .join("\n"),
              meta: { page: window.location.pathname, formId: `store-${input.request_type}` },
            },
          });
        } catch (err) {
          console.warn("Store request captured, CRM sync failed:", err);
        }
      }

      return data as { id: string } | null;
    },
  });
}
