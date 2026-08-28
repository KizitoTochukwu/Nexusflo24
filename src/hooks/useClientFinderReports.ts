import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Client Finder reporting and entitlement RPCs live outside the generated types. */
const db = supabase as any;

export interface CfEntitlements {
  workspace_id: string;
  plan: string;
  enabled: boolean;
  suspended: boolean;
  suspension_reason: string | null;
  period_start: string;
  limits: {
    max_campaigns: number;
    max_mailboxes: number;
    monthly_emails: number;
    monthly_ai_ops: number;
    monthly_verifications: number;
    monthly_discoveries: number;
    exports_enabled: boolean;
  };
  usage: {
    emails: number;
    ai_ops: number;
    verifications: number;
    discoveries: number;
    campaigns: number;
    mailboxes: number;
  };
  generated_at: string;
}

export function useClientFinderEntitlements(workspaceId?: string) {
  return useQuery({
    queryKey: ["cf-entitlements", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("client_finder_entitlements", {
        _workspace_id: workspaceId,
      });
      if (error) throw error;
      return data as CfEntitlements;
    },
  });
}

export interface CfReport {
  range: { from: string; to: string };
  generated_at: string;
  prospects: { companies: number; approved: number; rejected: number; scored: number };
  contacts: { total: number; verified: number };
  emails: { queued: number; sent: number; failed: number };
  replies: Record<string, number>;
  reply_total: number;
  crm: { deals: number; open_value: number; won_value: number };
  campaigns: { total: number; active: number; paused: number };
  definitions: Record<string, string>;
}

export function useClientFinderReport(workspaceId?: string, days = 30) {
  return useQuery({
    queryKey: ["cf-report", workspaceId, days],
    enabled: !!workspaceId,
    queryFn: async () => {
      const to = new Date();
      const from = new Date(to.getTime() - days * 86_400_000);
      const { data, error } = await db.rpc("client_finder_report", {
        _workspace_id: workspaceId,
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (error) throw error;
      return data as CfReport;
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Platform staff                                                              */
/* -------------------------------------------------------------------------- */

export function usePlatformClientFinderHealth() {
  return useQuery({
    queryKey: ["platform-client-finder"],
    queryFn: async () => {
      const { data, error } = await db.rpc("platform_client_finder_health");
      if (error) throw error;
      return data as any;
    },
  });
}

export function useUpdateCfPlanLimits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, any> & { plan: string }) => {
      const { error } = await db.from("prospecting_plan_limits").update(row).eq("plan", row.plan);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-client-finder"] });
      toast.success("Plan limits updated");
    },
    onError: (e: any) => toast.error(e.message || "Could not update plan limits"),
  });
}

export function useSetCfWorkspaceControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string;
      enabled?: boolean;
      suspended?: boolean;
      suspension_reason?: string | null;
    }) => {
      const { error } = await db
        .from("prospecting_workspace_controls")
        .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-client-finder"] });
      toast.success("Workspace control saved");
    },
    onError: (e: any) => toast.error(e.message || "Could not save workspace control"),
  });
}
