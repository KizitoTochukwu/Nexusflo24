import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Funnel = {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  description: string;
  objective: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type FunnelStep = {
  id: string;
  funnel_id: string;
  workspace_id: string;
  step_order: number;
  step_type: string;
  page_content: Record<string, unknown>;
  conversion_rate: number;
  created_at: string;
};

export type FunnelVisit = {
  id: string;
  funnel_id: string;
  step_id: string;
  workspace_id: string;
  lead_id: string | null;
  converted: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  created_at: string;
};

export const OBJECTIVE_OPTIONS = [
  { value: "lead_capture", label: "Lead Capture" },
  { value: "webinar", label: "Webinar" },
  { value: "product_sale", label: "Product Sale" },
  { value: "upsell", label: "Upsell" },
  { value: "booking", label: "Booking" },
] as const;

export const STEP_TYPE_OPTIONS = [
  { value: "landing", label: "Landing Page", icon: "LayoutTemplate" },
  { value: "optin", label: "Opt-in Page", icon: "UserPlus" },
  { value: "sales", label: "Sales Page", icon: "ShoppingBag" },
  { value: "checkout", label: "Checkout", icon: "CreditCard" },
  { value: "upsell", label: "Upsell Page", icon: "TrendingUp" },
  { value: "thankyou", label: "Thank You Page", icon: "CheckCircle" },
] as const;

export function useFunnels(workspaceId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["funnels", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Funnel[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useFunnelSteps(funnelId: string | null) {
  return useQuery({
    queryKey: ["funnel-steps", funnelId],
    queryFn: async () => {
      if (!funnelId) return [];
      const { data, error } = await supabase
        .from("funnel_steps")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FunnelStep[];
    },
    enabled: !!funnelId,
  });
}

export function useFunnelVisits(funnelId: string | null) {
  return useQuery({
    queryKey: ["funnel-visits", funnelId],
    queryFn: async () => {
      if (!funnelId) return [];
      const { data, error } = await supabase
        .from("funnel_visits")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as FunnelVisit[];
    },
    enabled: !!funnelId,
  });
}

export function useCreateFunnel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string;
      name: string;
      description?: string;
      objective: string;
      steps: { step_type: string; page_content?: Record<string, unknown> }[];
    }) => {
      const { steps, ...funnelData } = input;
      const { data, error } = await supabase
        .from("funnels")
        .insert({ ...funnelData, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      if (steps.length > 0) {
        const stepsToInsert = steps.map((s, i) => ({
          funnel_id: data.id,
          workspace_id: input.workspace_id,
          step_order: i,
          step_type: s.step_type,
          page_content: s.page_content || {},
        }));
        const { error: stepErr } = await supabase.from("funnel_steps").insert(stepsToInsert as any);
        if (stepErr) throw stepErr;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Funnel created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create funnel"),
  });
}

export function useUpdateFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      steps,
      workspace_id,
      ...updates
    }: Partial<Funnel> & {
      id: string;
      workspace_id: string;
      steps?: { step_type: string; page_content?: Record<string, unknown> }[];
    }) => {
      const { data, error } = await supabase
        .from("funnels")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (steps !== undefined) {
        await supabase.from("funnel_steps").delete().eq("funnel_id", id);
        if (steps.length > 0) {
          const stepsToInsert = steps.map((s, i) => ({
            funnel_id: id,
            workspace_id,
            step_order: i,
            step_type: s.step_type,
            page_content: s.page_content || {},
          }));
          const { error: stepErr } = await supabase.from("funnel_steps").insert(stepsToInsert as any);
          if (stepErr) throw stepErr;
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      qc.invalidateQueries({ queryKey: ["funnel-steps"] });
      toast.success("Funnel updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update funnel"),
  });
}

export function useUpdateFunnelStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FunnelStep> & { id: string }) => {
      const { data, error } = await supabase
        .from("funnel_steps")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnel-steps"] });
      toast.success("Step updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update step"),
  });
}

export function useDeleteFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funnels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Funnel deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete funnel"),
  });
}
