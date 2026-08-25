import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type PublicStore = {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  countries_served: string[] | null;
  policies: Record<string, string> | null;
  business_name: string | null;
  business_email: string | null;
  business_phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string;
  accent_color: string;
  font_family: string;
  tagline: string | null;
  social_links: Record<string, string> | null;
  navigation: unknown[] | null;
  footer_text: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  product_type: string;
  price_amount: number;
  compare_at_amount: number | null;
  currency: string;
  billing_type: string;
  billing_interval: string | null;
  button_text: string;
  image_url: string | null;
  tags: string[] | null;
};

export function usePublicStore(slug?: string) {
  return useQuery({
    queryKey: ["public-store", slug],
    enabled: !!slug,
    queryFn: async (): Promise<PublicStore | null> => {
      const { data, error } = await db.rpc("get_public_store", { p_slug: slug });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function usePublicProducts(storeSlug?: string, collectionSlug?: string | null) {
  return useQuery({
    queryKey: ["public-products", storeSlug, collectionSlug ?? null],
    enabled: !!storeSlug,
    queryFn: async (): Promise<PublicProduct[]> => {
      const { data, error } = await db.rpc("get_public_store_products", {
        p_store_slug: storeSlug,
        p_collection_slug: collectionSlug ?? null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePublicProduct(storeSlug?: string, productSlug?: string) {
  return useQuery({
    queryKey: ["public-product", storeSlug, productSlug],
    enabled: !!storeSlug && !!productSlug,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_public_store_product", {
        p_store_slug: storeSlug,
        p_product_slug: productSlug,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function usePublicCollections(storeSlug?: string) {
  return useQuery({
    queryKey: ["public-collections", storeSlug],
    enabled: !!storeSlug,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_public_store_collections", { p_store_slug: storeSlug });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ------------------------------ Local basket ------------------------------ */

export type BasketLine = {
  productId: string;
  variantId?: string | null;
  name: string;
  unitAmount: number;
  quantity: number;
  requiresShipping?: boolean;
  imageUrl?: string | null;
};

const key = (storeSlug: string) => `nf24-shop-basket:${storeSlug}`;

export function useBasket(storeSlug?: string) {
  const [lines, setLines] = useState<BasketLine[]>([]);

  useEffect(() => {
    if (!storeSlug) return;
    try {
      const raw = localStorage.getItem(key(storeSlug));
      setLines(raw ? JSON.parse(raw) : []);
    } catch {
      setLines([]);
    }
  }, [storeSlug]);

  const persist = useCallback((next: BasketLine[]) => {
    setLines(next);
    if (storeSlug) localStorage.setItem(key(storeSlug), JSON.stringify(next));
  }, [storeSlug]);

  const add = useCallback((line: BasketLine) => {
    const next = [...lines];
    const idx = next.findIndex((l) => l.productId === line.productId && (l.variantId ?? null) === (line.variantId ?? null));
    if (idx >= 0) next[idx] = { ...next[idx], quantity: next[idx].quantity + line.quantity };
    else next.push(line);
    persist(next);
  }, [lines, persist]);

  const setQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => {
    const next = lines
      .map((l) => (l.productId === productId && (l.variantId ?? null) === variantId ? { ...l, quantity } : l))
      .filter((l) => l.quantity > 0);
    persist(next);
  }, [lines, persist]);

  const remove = useCallback((productId: string, variantId: string | null) => {
    persist(lines.filter((l) => !(l.productId === productId && (l.variantId ?? null) === variantId)));
  }, [lines, persist]);

  const clear = useCallback(() => persist([]), [persist]);

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.unitAmount * l.quantity, 0), [lines]);
  const count = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  return { lines, add, setQuantity, remove, clear, subtotal, count };
}

export function money(minor: number, currency = "GBP") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((minor ?? 0) / 100);
  } catch {
    return `${currency} ${((minor ?? 0) / 100).toFixed(2)}`;
  }
}
