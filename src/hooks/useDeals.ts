import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logCrmActivity, logCrmAudit } from "@/lib/crm/events";

export type Pipeline = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type PipelineStage = {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  name: string;
  position: number;
  probability: number;
  stage_type: "open" | "won" | "lost" | string;
  color: string | null;
};

export type Deal = {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  stage_id: string | null;
  name: string;
  amount: number;
  currency: string;
  status: "open" | "won" | "lost" | string;
  probability: number | null;
  expected_close_date: string | null;
  closed_at: string | null;
  lost_reason: string | null;
  contact_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  owner_user_id: string | null;
  source: string | null;
  description: string | null;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
};

export type DealFilters = {
  search?: string;
  owner_user_id?: string;
  status?: string;
};

/** Loads the workspace pipelines, creating the default one on first use. */
export function usePipelines(workspaceId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["crm-pipelines", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipelines" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true });
      if (error) throw error;
      let rows = (data ?? []) as unknown as Pipeline[];
      if (!rows.length) {
        const { error: rpcError } = await supabase.rpc("ensure_default_pipeline" as any, {
          _workspace_id: workspaceId,
        });
        if (rpcError) throw rpcError;
        const retry = await supabase
          .from("crm_pipelines" as any)
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("position", { ascending: true });
        if (retry.error) throw retry.error;
        rows = (retry.data ?? []) as unknown as Pipeline[];
      }
      return rows;
    },
    enabled: !!user && !!workspaceId,
  });
}

export function usePipelineStages(pipelineId?: string) {
  return useQuery({
    queryKey: ["crm-pipeline-stages", pipelineId],
    queryFn: async () => {
      const load = async () => {
        const { data, error } = await supabase
          .from("crm_pipeline_stages" as any)
          .select("*")
          .eq("pipeline_id", pipelineId!)
          .order("position", { ascending: true });
        if (error) throw error;
        return (data ?? []) as unknown as PipelineStage[];
      };
      let rows = await load();
      if (!rows.length) {
        // A pipeline with no stages can't hold deals — seed the standard set once.
        const { error: rpcError } = await supabase.rpc("crm_ensure_pipeline_stages" as any, {
          _pipeline_id: pipelineId!,
        });
        if (!rpcError) rows = await load();
      }
      return rows;
    },
    enabled: !!pipelineId,
  });
}

export type DealStageHistoryEntry = {
  id: string;
  deal_id: string;
  from_stage_id: string | null;
  to_stage_id: string | null;
  entered_at: string;
  exited_at: string | null;
  change_source: string | null;
};

/** Stage-by-stage timeline for one deal, newest first. */
export function useDealStageHistory(dealId?: string) {
  return useQuery({
    queryKey: ["crm-deal-stage-history", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deal_stage_history" as any)
        .select("*")
        .eq("deal_id", dealId!)
        .order("entered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DealStageHistoryEntry[];
    },
    enabled: !!dealId,
  });
}


export function useDeals(workspaceId: string, pipelineId?: string, filters: DealFilters = {}) {
  return useQuery({
    queryKey: ["crm-deals", workspaceId, pipelineId, filters],
    queryFn: async () => {
      let query = supabase
        .from("crm_deals" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("pipeline_id", pipelineId!);
      if (filters.search) {
        query = query.ilike("name", `%${filters.search.replace(/[,%]/g, "")}%`);
      }
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.owner_user_id && filters.owner_user_id !== "all") {
        if (filters.owner_user_id === "unassigned") query = query.is("owner_user_id", null);
        else query = query.eq("owner_user_id", filters.owner_user_id);
      }
      const { data, error } = await query
        .order("position", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as Deal[];
    },
    enabled: !!workspaceId && !!pipelineId,
  });
}

/** Deals attached to a contact or company (profile tab). */
export function useRelatedDeals(key: "contact_id" | "company_id", recordId?: string) {
  return useQuery({
    queryKey: ["crm-related-deals", key, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deals" as any)
        .select("*")
        .eq(key, recordId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Deal[];
    },
    enabled: !!recordId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["crm-deals"] });
  qc.invalidateQueries({ queryKey: ["crm-related-deals"] });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<Deal> & { workspace_id: string; pipeline_id: string; name: string }) => {
      const { data, error } = await supabase
        .from("crm_deals" as any)
        .insert({ ...input, created_by: user?.id ?? null, owner_user_id: input.owner_user_id ?? user?.id ?? null } as any)
        .select()
        .single();
      if (error) throw error;
      const deal = data as unknown as Deal;
      await logCrmActivity({
        workspaceId: deal.workspace_id,
        recordType: "deal",
        recordId: deal.id,
        activityType: "deal_created",
        title: "Deal created",
        description: deal.name,
        actorUserId: user?.id,
        actorLabel: user?.email ?? undefined,
      });
      return deal;
    },
    onSuccess: (d) => {
      invalidate(qc);
      toast.success(`${d.name} added to the pipeline`);
    },
    onError: (e: any) => toast.error(e.message || "Couldn't create the deal"),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, prev, silent, ...updates }: Partial<Deal> & { id: string; prev?: Deal; silent?: boolean }) => {
      const { data, error } = await supabase
        .from("crm_deals" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      const deal = data as unknown as Deal;
      const movedStage = prev && updates.stage_id && updates.stage_id !== prev.stage_id;
      await logCrmActivity({
        workspaceId: deal.workspace_id,
        recordType: "deal",
        recordId: deal.id,
        activityType: movedStage ? "deal_stage_changed" : "deal_updated",
        title: movedStage ? "Deal moved stage" : "Deal updated",
        description: Object.keys(updates).join(", "),
        actorUserId: user?.id,
        actorLabel: user?.email ?? undefined,
      });
      await logCrmAudit({
        workspaceId: deal.workspace_id,
        recordType: "deal",
        recordId: deal.id,
        action: "update",
        before: prev as any,
        after: deal as any,
        actorUserId: user?.id,
      });
      return { deal, silent };
    },
    onSuccess: ({ deal, silent }) => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ["crm-deal", deal.id] });
      if (!silent) toast.success("Deal saved");
    },
    onError: (e: any) => toast.error(e.message || "Couldn't save the deal"),
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_deals" as any).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      invalidate(qc);
      toast.success("Deal deleted");
    },
    onError: (e: any) => toast.error(e.message || "Couldn't delete the deal"),
  });
}

export function useSavePipeline() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Pipeline> & { workspace_id: string; name: string }) => {
      if (input.id) {
        const { error } = await supabase
          .from("crm_pipelines" as any)
          .update({ name: input.name, description: input.description ?? null } as any)
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("crm_pipelines" as any)
        .insert({ ...input, created_by: user?.id ?? null } as any)
        .select()
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-pipelines"] });
      toast.success("Pipeline saved");
    },
    onError: (e: any) => toast.error(e.message || "Couldn't save the pipeline"),
  });
}

export function useSaveStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PipelineStage> & { workspace_id: string; pipeline_id: string; name: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("crm_pipeline_stages" as any).update(rest as any).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from("crm_pipeline_stages" as any).insert(input as any).select().single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-pipeline-stages"] });
      toast.success("Stage saved");
    },
    onError: (e: any) => toast.error(e.message || "Couldn't save the stage"),
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_pipeline_stages" as any).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-pipeline-stages"] });
      qc.invalidateQueries({ queryKey: ["crm-deals"] });
      toast.success("Stage removed");
    },
    onError: (e: any) => toast.error(e.message || "Couldn't remove the stage"),
  });
}

export function formatMoney(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount || 0);
  } catch {
    return `${currency} ${Math.round(amount || 0).toLocaleString()}`;
  }
}
