import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAllOrganisations() {
  return useQuery({
    queryKey: ["admin-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, owner_user_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSenderProfiles(workspaceId?: string, status?: string) {
  return useQuery({
    queryKey: ["sender-profiles", workspaceId, status],
    queryFn: async () => {
      let q = supabase.from("sender_profiles" as any).select("*").order("created_at", { ascending: false });
      if (workspaceId) q = q.eq("workspace_id", workspaceId);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useApproveSenderProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: "approved" | "rejected" | "suspended"; reason?: string }) => {
      const { error } = await supabase
        .from("sender_profiles" as any)
        .update({
          status,
          rejection_reason: reason || null,
          approved_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sender-profiles"] });
      toast.success("Sender status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpsertSenderProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id, detail, ...profile } = payload;
      let profileId = id;
      if (id) {
        const { error } = await supabase.from("sender_profiles" as any).update(profile).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("sender_profiles" as any).insert(profile).select("id").single();
        if (error) throw error;
        profileId = (data as any).id;
      }
      if (detail) {
        const table = profile.channel === "whatsapp" ? "whatsapp_senders" : profile.channel === "sms" ? "sms_senders" : "email_senders";
        const { error } = await supabase.from(table as any).upsert({ ...detail, sender_profile_id: profileId }, { onConflict: "sender_profile_id" });
        if (error) throw error;
      }
      return profileId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sender-profiles"] });
      toast.success("Sender profile saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCommunicationUsage(workspaceId?: string) {
  return useQuery({
    queryKey: ["comm-usage", workspaceId],
    queryFn: async () => {
      let q = supabase.from("communication_usage" as any).select("*").order("created_at", { ascending: false }).limit(500);
      if (workspaceId) q = q.eq("workspace_id", workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useCreditPackages() {
  return useQuery({
    queryKey: ["credit-packages-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_packages" as any).select("*").order("sort_order");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useUpsertCreditPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pkg: any) => {
      if (pkg.id) {
        const { error } = await supabase.from("credit_packages" as any).update(pkg).eq("id", pkg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("credit_packages" as any).insert(pkg);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-packages-admin"] });
      toast.success("Package saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCreditPricingRules() {
  return useQuery({
    queryKey: ["credit-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_pricing_rules" as any).select("*").order("channel");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useUpsertPricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: any) => {
      const { error } = await supabase.from("credit_pricing_rules" as any).upsert(rule, { onConflict: "channel,country" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-pricing"] });
      toast.success("Pricing rule saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAdjustWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { workspaceId: string; channel: string; amount: number; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-wallet-adjust", { body: args });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["message-credits"] });
      qc.invalidateQueries({ queryKey: ["workspace-credits"] });
      toast.success("Wallet adjusted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useWorkspaceCredits(workspaceId?: string) {
  return useQuery({
    queryKey: ["workspace-credits", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase.from("message_credits").select("*").eq("workspace_id", workspaceId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}
