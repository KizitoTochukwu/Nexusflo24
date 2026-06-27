import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CompanyIntelligenceReport, AnalysisInput } from "./generateReport";
import { generateCompanyIntelligenceReport } from "./generateReport";

// Use any-casts because generated types may lag the migration.
const db = supabase as unknown as {
  from: (t: string) => any;
};

export interface NICompany {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string | null;
  website_url: string;
  industry: string | null;
  location: string | null;
  size: string | null;
  services: string | null;
  summary: string | null;
  business_model: string | null;
  target_customers: string | null;
  status: string;
  lead_score: number | null;
  urgency: string | null;
  recommended_offer: string | null;
  next_action: string | null;
  created_at: string;
  updated_at: string;
}

export interface NIReport {
  id: string;
  workspace_id: string;
  user_id: string;
  company_id: string | null;
  report_title: string | null;
  analysis_depth: string | null;
  user_offer: string | null;
  report_json: CompanyIntelligenceReport;
  crm_deal_score: number | null;
  created_at: string;
}

export interface NIUsage {
  workspace_id: string;
  plan: string;
  monthly_report_limit: number;
  reports_used: number;
  period_start: string;
  updated_at: string;
}

export function useNICompanies(workspaceId: string) {
  return useQuery<NICompany[]>({
    queryKey: ["ni-companies", workspaceId],
    queryFn: async () => {
      const { data, error } = await db
        .from("nexusintel_companies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NICompany[];
    },
  });
}

export function useNICompany(workspaceId: string, id: string | undefined) {
  return useQuery<NICompany | null>({
    queryKey: ["ni-company", workspaceId, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("nexusintel_companies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as NICompany | null;
    },
  });
}

export function useNIReports(workspaceId: string) {
  return useQuery<NIReport[]>({
    queryKey: ["ni-reports", workspaceId],
    queryFn: async () => {
      const { data, error } = await db
        .from("nexusintel_reports")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NIReport[];
    },
  });
}

export function useNIReport(workspaceId: string, id: string | undefined) {
  return useQuery<NIReport | null>({
    queryKey: ["ni-report", workspaceId, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("nexusintel_reports")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as NIReport | null;
    },
  });
}

export function useNIUsage(workspaceId: string) {
  const qc = useQueryClient();
  return useQuery<NIUsage>({
    queryKey: ["ni-usage", workspaceId],
    queryFn: async () => {
      const { data } = await db
        .from("nexusintel_usage")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (data) return data as NIUsage;
      // Initialise row on first access
      const { data: created, error: insertErr } = await db
        .from("nexusintel_usage")
        .insert({ workspace_id: workspaceId })
        .select()
        .maybeSingle();
      if (insertErr) {
        // Race: another tab created it
        const { data: retry } = await db
          .from("nexusintel_usage")
          .select("*")
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        return retry as NIUsage;
      }
      qc.invalidateQueries({ queryKey: ["ni-usage", workspaceId] });
      return created as NIUsage;
    },
  });
}

export function useNIIntegrations(workspaceId: string) {
  return useQuery<{ provider: string; status: string }[]>({
    queryKey: ["ni-integrations", workspaceId],
    queryFn: async () => {
      const { data, error } = await db
        .from("nexusintel_integrations")
        .select("provider,status")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertNIIntegration() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: { workspaceId: string; provider: string; status: string; config?: any }) => {
      const { error } = await db.from("nexusintel_integrations").upsert(
        {
          workspace_id: vars.workspaceId,
          user_id: user!.id,
          provider: vars.provider,
          status: vars.status,
          config: vars.config ?? {},
        },
        { onConflict: "workspace_id,provider" },
      );
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["ni-integrations", v.workspaceId] }),
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: { workspaceId: string; input: AnalysisInput }) => {
      const userId = user!.id;
      const { workspaceId, input } = vars;

      // Usage check
      const { data: usage } = await db
        .from("nexusintel_usage")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      let current: NIUsage = usage as NIUsage;
      if (!current) {
        const { data: inserted } = await db
          .from("nexusintel_usage")
          .insert({ workspace_id: workspaceId })
          .select()
          .maybeSingle();
        current = inserted as NIUsage;
      }

      // Reset usage if month changed
      const thisMonth = new Date().toISOString().slice(0, 7);
      const periodMonth = (current.period_start ?? "").slice(0, 7);
      let reportsUsed = current.reports_used;
      if (periodMonth !== thisMonth) {
        reportsUsed = 0;
        await db
          .from("nexusintel_usage")
          .update({
            reports_used: 0,
            period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              .toISOString()
              .slice(0, 10),
          })
          .eq("workspace_id", workspaceId);
      }
      if (reportsUsed >= current.monthly_report_limit) {
        throw new Error(
          `You've reached your monthly limit of ${current.monthly_report_limit} reports. Upgrade your plan to continue.`,
        );
      }

      // Generate
      const report = generateCompanyIntelligenceReport(input);

      // Save company
      const { data: company, error: cErr } = await db
        .from("nexusintel_companies")
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          name: report.summary.name,
          website_url: input.websiteUrl,
          industry: report.summary.industry,
          location: report.summary.location,
          size: report.summary.size,
          services: report.summary.services,
          summary: report.summary.paragraph,
          business_model: report.summary.businessModel,
          target_customers: report.targetCustomer.serves,
          status: "New Research",
          lead_score: report.dealScore.total,
          urgency: report.salesOpportunity.urgency,
          recommended_offer: report.recommendedOffer.name,
          next_action: report.salesOpportunity.firstMove,
        })
        .select()
        .maybeSingle();
      if (cErr) throw cErr;

      // Save report
      const { data: saved, error: rErr } = await db
        .from("nexusintel_reports")
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          company_id: company.id,
          report_title: `${report.summary.name} — Intelligence Report`,
          analysis_depth: input.depth,
          user_offer: input.servicesOffer,
          report_json: report,
          crm_deal_score: report.dealScore.total,
        })
        .select()
        .maybeSingle();
      if (rErr) throw rErr;

      // Bump usage
      await db
        .from("nexusintel_usage")
        .update({ reports_used: reportsUsed + 1 })
        .eq("workspace_id", workspaceId);

      return { company, report: saved as NIReport };
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ni-companies", v.workspaceId] });
      qc.invalidateQueries({ queryKey: ["ni-reports", v.workspaceId] });
      qc.invalidateQueries({ queryKey: ["ni-usage", v.workspaceId] });
    },
  });
}

export function useUpdateNICompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { workspaceId: string; id: string; patch: Partial<NICompany> }) => {
      const { error } = await db
        .from("nexusintel_companies")
        .update(vars.patch)
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ni-companies", v.workspaceId] });
      qc.invalidateQueries({ queryKey: ["ni-company", v.workspaceId, v.id] });
    },
  });
}

export function useNINotes(workspaceId: string, companyId: string | undefined) {
  return useQuery<any[]>({
    queryKey: ["ni-notes", workspaceId, companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await db
        .from("nexusintel_notes")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddNINote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (v: { workspaceId: string; companyId: string; note: string }) => {
      const { error } = await db.from("nexusintel_notes").insert({
        workspace_id: v.workspaceId,
        user_id: user!.id,
        company_id: v.companyId,
        note: v.note,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["ni-notes", v.workspaceId, v.companyId] }),
  });
}

export function useNITasks(workspaceId: string, companyId: string | undefined) {
  return useQuery<any[]>({
    queryKey: ["ni-tasks", workspaceId, companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await db
        .from("nexusintel_tasks")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddNITask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (v: {
      workspaceId: string;
      companyId: string;
      title: string;
      due_date?: string | null;
    }) => {
      const { error } = await db.from("nexusintel_tasks").insert({
        workspace_id: v.workspaceId,
        user_id: user!.id,
        company_id: v.companyId,
        title: v.title,
        due_date: v.due_date ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["ni-tasks", v.workspaceId, v.companyId] }),
  });
}
