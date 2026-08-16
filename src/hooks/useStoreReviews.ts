import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type StoreReview = {
  id: string;
  product_slug: string;
  project_id: string | null;
  user_id: string | null;
  author_name: string;
  business_name: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified: boolean;
  is_published: boolean;
  created_at: string;
};

/** Published reviews for one product. */
export function useProductReviews(productSlug?: string) {
  return useQuery({
    queryKey: ["store-reviews", productSlug],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_reviews")
        .select("*")
        .eq("product_slug", productSlug)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoreReview[];
    },
    enabled: !!productSlug,
    staleTime: 5 * 60 * 1000,
  });
}

/** Every published review, used for catalogue-wide rating summaries. */
export function useAllPublishedReviews() {
  return useQuery({
    queryKey: ["store-reviews", "all-published"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_reviews")
        .select("product_slug,rating")
        .eq("is_published", true);
      if (error) throw error;
      return (data ?? []) as Pick<StoreReview, "product_slug" | "rating">[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyReviews() {
  return useQuery({
    queryKey: ["store-reviews", "mine"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user?.id;
      if (!userId) return [] as StoreReview[];
      const { data, error } = await db
        .from("store_reviews")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoreReview[];
    },
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      product_slug: string;
      project_id?: string | null;
      author_name: string;
      business_name?: string | null;
      rating: number;
      title?: string | null;
      body?: string | null;
    }) => {
      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user?.id;
      if (!userId) throw new Error("Please sign in to leave a review.");
      const { error } = await db.from("store_reviews").insert({
        ...input,
        user_id: userId,
        is_published: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-reviews"] });
    },
  });
}

/* ---------- Admin moderation ---------- */

export function useAdminReviews() {
  return useQuery({
    queryKey: ["store-reviews", "admin"],
    queryFn: async () => {
      const { data, error } = await db
        .from("store_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as StoreReview[];
    },
  });
}

export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<StoreReview> }) => {
      const { error } = await db.from("store_reviews").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store-reviews"] }),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("store_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store-reviews"] }),
  });
}

export function summariseRatings(reviews: { rating: number }[]) {
  if (!reviews.length) return { count: 0, average: 0 };
  const total = reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0);
  return { count: reviews.length, average: Math.round((total / reviews.length) * 10) / 10 };
}
