import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

/** Commerce tables are new; generated types may lag behind the migration. */
const db = supabase as any;

export type EntitlementKind = "course" | "membership" | "digital" | "community" | "service";

export type ShopEntitlement = {
  id: string;
  workspace_id: string;
  store_id: string;
  product_id: string | null;
  order_id: string | null;
  user_id: string | null;
  email: string;
  kind: EntitlementKind;
  resource_ref: string;
  resource_label: string | null;
  status: "active" | "revoked" | "expired";
  source: "purchase" | "manual";
  stripe_subscription_id: string | null;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
};

export type MyEntitlement = {
  id: string;
  kind: EntitlementKind;
  resource_ref: string;
  resource_label: string | null;
  status: string;
  granted_at: string;
  expires_at: string | null;
  product_id: string | null;
  store_slug: string;
  store_name: string;
  order_id: string | null;
};

export const entitlementKindLabel = (kind: string) =>
  ({
    course: "Course",
    membership: "Membership",
    digital: "Digital download",
    community: "Community",
    service: "Service",
  })[kind] ?? kind;

/** Everything the signed-in buyer can access, across every store. */
export function useMyEntitlements(enabled = true) {
  return useQuery({
    queryKey: ["my-entitlements"],
    enabled,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_my_shop_entitlements");
      if (error) throw error;
      return (data ?? []) as MyEntitlement[];
    },
  });
}

/** Does the signed-in user hold an active grant for this resource? */
export function useHasEntitlement(kind: EntitlementKind, resourceRef?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["has-entitlement", kind, resourceRef],
    enabled: enabled && !!resourceRef,
    queryFn: async () => {
      const { data, error } = await db.rpc("has_shop_entitlement", {
        _kind: kind,
        _resource_ref: resourceRef,
      });
      if (error) throw error;
      return Boolean(data);
    },
  });
}

/** Links guest purchases made with the same email to the signed-in account. */
export function useClaimEntitlements(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    (async () => {
      const { data } = await db.rpc("claim_shop_entitlements");
      if (data && Number(data) > 0) {
        qc.invalidateQueries({ queryKey: ["my-entitlements"] });
        qc.invalidateQueries({ queryKey: ["has-entitlement"] });
      }
    })();
  }, [enabled, qc]);
}

/** Store-side access register. */
export function useStoreEntitlements(storeId?: string) {
  return useQuery({
    queryKey: ["shop-entitlements", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db
        .from("shop_entitlements")
        .select("*")
        .eq("store_id", storeId)
        .order("granted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShopEntitlement[];
    },
  });
}

export function useGrantEntitlement(storeId?: string) {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      kind: EntitlementKind;
      resource_ref: string;
      resource_label?: string | null;
      product_id?: string | null;
      expires_at?: string | null;
    }) => {
      const email = input.email.trim().toLowerCase();
      const { data: existing } = await db
        .from("shop_entitlements")
        .select("id")
        .eq("store_id", storeId)
        .eq("kind", input.kind)
        .eq("resource_ref", input.resource_ref)
        .ilike("email", email)
        .maybeSingle();

      const payload = {
        resource_label: input.resource_label ?? null,
        product_id: input.product_id ?? null,
        expires_at: input.expires_at || null,
        status: "active",
        source: "manual",
        revoked_at: null,
        revoke_reason: null,
      };

      if (existing?.id) {
        const { error } = await db.from("shop_entitlements").update(payload).eq("id", existing.id);
        if (error) throw error;
        return;
      }

      const { error } = await db.from("shop_entitlements").insert({
        ...payload,
        workspace_id: workspaceId,
        store_id: storeId,
        email,
        kind: input.kind,
        resource_ref: input.resource_ref,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-entitlements", storeId] });
      toast.success("Access granted");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not grant access"),
  });
}

export function useSetEntitlementStatus(storeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: "active" | "revoked"; reason?: string }) => {
      const { error } = await db
        .from("shop_entitlements")
        .update(
          status === "revoked"
            ? { status, revoked_at: new Date().toISOString(), revoke_reason: reason ?? "manual" }
            : { status, revoked_at: null, revoke_reason: null },
        )
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["shop-entitlements", storeId] });
      toast.success(v.status === "revoked" ? "Access revoked" : "Access restored");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update access"),
  });
}
