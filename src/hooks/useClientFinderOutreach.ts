import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CfCampaign {
  id: string;
  workspace_id: string;
  name: string;
  offer_id: string | null;
  icp_id: string | null;
  status: string;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  timezone: string;
  send_days: number[];
  send_window_start: number;
  send_window_end: number;
  daily_limit: number;
  min_spacing_seconds: number;
  max_spacing_seconds: number;
  approved_at: string | null;
  launched_at: string | null;
  paused_reason: string | null;
  created_at: string;
}

export interface CfSequenceStep {
  id: string;
  campaign_id: string;
  step_number: number;
  delay_days: number;
  subject_template: string;
  body_template: string;
  ai_generated: boolean;
  evidence: any;
}

export interface CfEnrolment {
  id: string;
  campaign_id: string;
  contact_id: string;
  company_id: string | null;
  status: string;
  current_step: number;
  next_send_at: string | null;
  stop_reason: string | null;
  created_at: string;
}

export interface CfOutboundEmail {
  id: string;
  campaign_id: string;
  contact_id: string | null;
  step_number: number;
  to_email: string;
  subject: string;
  body_html: string;
  status: string;
  provider_message_id: string | null;
  error: string | null;
  evidence: any;
  scheduled_at: string;
  sent_at: string | null;
}

export interface ReadinessCheck {
  key: string;
  label: string;
  ok: boolean;
  detail?: string;
}

const invalidate = (qc: ReturnType<typeof useQueryClient>, keys: string[]) =>
  keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

async function callCampaignFn(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("client-finder-campaign", { body });
  if (error) {
    const ctx = (error as any)?.context;
    let detail = error.message;
    try {
      if (ctx?.text) detail = JSON.parse(await ctx.text())?.error ?? detail;
    } catch { /* keep original */ }
    throw new Error(data?.error || detail);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/* -------------------------------- Campaigns -------------------------------- */

export function useCfCampaigns(workspaceId: string) {
  return useQuery({
    queryKey: ["cf-campaigns", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_campaigns")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CfCampaign[];
    },
    enabled: !!workspaceId,
  });
}

export function useCfCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["cf-campaign", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_campaigns")
        .select("*")
        .eq("id", campaignId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CfCampaign | null;
    },
    enabled: !!campaignId,
  });
}

export function useCreateCfCampaign(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CfCampaign> & { name: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("prospecting_campaigns")
        .insert({ ...input, workspace_id: workspaceId, created_by: userRes.user?.id } as any)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CfCampaign;
    },
    onSuccess: () => {
      invalidate(qc, ["cf-campaigns"]);
      toast.success("Campaign created");
    },
    onError: (e: any) => toast.error(e.message || "Could not create the campaign"),
  });
}

export function useUpdateCfCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CfCampaign> & { id: string }) => {
      const { error } = await supabase.from("prospecting_campaigns").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc, ["cf-campaigns", "cf-campaign"]),
    onError: (e: any) => toast.error(e.message || "Could not save the campaign"),
  });
}

/* ------------------------------ Sequence steps ------------------------------ */

export function useCfSteps(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["cf-steps", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_sequence_steps")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("step_number");
      if (error) throw error;
      return (data ?? []) as unknown as CfSequenceStep[];
    },
    enabled: !!campaignId,
  });
}

export function useSaveCfStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (step: Partial<CfSequenceStep> & { id?: string; workspace_id?: string; campaign_id?: string }) => {
      if (step.id) {
        const { id, ...patch } = step;
        const { error } = await supabase.from("prospecting_sequence_steps").update(patch as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("prospecting_sequence_steps").insert(step as any);
        if (error) throw error;
      }
    },
    onSuccess: () => invalidate(qc, ["cf-steps"]),
    onError: (e: any) => toast.error(e.message || "Could not save the email"),
  });
}

export function useDeleteCfStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospecting_sequence_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc, ["cf-steps"]),
    onError: (e: any) => toast.error(e.message || "Could not delete the email"),
  });
}

export function useGenerateSequence(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { campaign_id: string; step_count: number }) => {
      const { data, error } = await supabase.functions.invoke("client-finder-sequence", {
        body: { workspace_id: workspaceId, ...params },
      });
      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      return data as { steps: number; findings_available: number };
    },
    onSuccess: (r) => {
      invalidate(qc, ["cf-steps"]);
      toast.success(
        r.findings_available > 0
          ? `Drafted ${r.steps} emails grounded in ${r.findings_available} stored research findings`
          : `Drafted ${r.steps} emails. No research findings are stored yet, so the copy is relevance-led rather than prospect-specific.`,
      );
    },
    onError: (e: any) => toast.error(e.message || "Could not draft the sequence"),
  });
}

/* ------------------------------- Enrolments -------------------------------- */

export function useCfEnrolments(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["cf-enrolments", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_enrolments")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as CfEnrolment[];
    },
    enabled: !!campaignId,
  });
}

export function useCampaignAction(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      callCampaignFn({ workspace_id: workspaceId, ...body }),
    onSuccess: () => invalidate(qc, ["cf-campaigns", "cf-campaign", "cf-enrolments", "cf-outbound", "cf-suppressions"]),
    onError: (e: any) => toast.error(e.message || "That action could not be completed"),
  });
}

export function useCfReadiness(workspaceId: string, campaignId: string | undefined) {
  return useQuery({
    queryKey: ["cf-readiness", campaignId],
    queryFn: async () => {
      const data = await callCampaignFn({ workspace_id: workspaceId, campaign_id: campaignId, action: "readiness" });
      return data as { checks: ReadinessCheck[]; ready: boolean };
    },
    enabled: !!workspaceId && !!campaignId,
  });
}

/* ----------------------------- Delivery / logs ------------------------------ */

export function useCfOutbound(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["cf-outbound", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_outbound_emails")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as CfOutboundEmail[];
    },
    enabled: !!campaignId,
    refetchInterval: 30_000,
  });
}

export function useCfSuppressions(workspaceId: string) {
  return useQuery({
    queryKey: ["cf-suppressions", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_suppressions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}
