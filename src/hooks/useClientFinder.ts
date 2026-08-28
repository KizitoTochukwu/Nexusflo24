import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Offer {
  id: string;
  workspace_id: string;
  name: string;
  website_url: string | null;
  short_description: string | null;
  value_proposition: string | null;
  customer_problem: string | null;
  key_benefits: string[];
  pricing_model: string | null;
  typical_contract_value: number | null;
  currency: string;
  customer_examples: string | null;
  proof_points: string | null;
  competitors: string[];
  countries_served: string[];
  call_to_action: string | null;
  booking_url: string | null;
  website_analysis_status: string;
  website_analysis_summary: string | null;
  website_analysis_pages: any;
  website_analysed_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Icp {
  id: string;
  workspace_id: string;
  offer_id: string | null;
  name: string;
  countries: string[];
  industries: string[];
  company_sizes: string[];
  business_types: string[];
  technologies: string[];
  growth_stages: string[];
  buying_signals: string[];
  excluded_industries: string[];
  job_functions: string[];
  job_titles: string[];
  seniority_levels: string[];
  pain_points: string[];
  disqualifiers: string[];
  ai_rationale: string | null;
  approval_status: string;
  version: number;
  is_active: boolean;
  created_at: string;
}

export interface ProspectCompany {
  id: string;
  workspace_id: string;
  name: string;
  domain: string | null;
  website_url: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  employee_range: string | null;
  employee_count: number | null;
  company_type: string | null;
  technologies: string[];
  description: string | null;
  fit_score: number | null;
  fit_explanation: string | null;
  fit_breakdown: any;
  data_source: string;
  data_freshness_at: string | null;
  status: string;
  crm_company_id: string | null;
  created_at: string;
}

export interface ProspectContact {
  id: string;
  workspace_id: string;
  company_id: string | null;
  full_name: string;
  job_title: string | null;
  seniority: string | null;
  department: string | null;
  email: string | null;
  email_status: string;
  email_confidence: number | null;
  email_verified_at: string | null;
  linkedin_url: string | null;
  data_source: string;
  status: string;
  crm_contact_id: string | null;
  do_not_contact: boolean;
  created_at: string;
}

const invalidate = (qc: ReturnType<typeof useQueryClient>, keys: string[]) =>
  keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

/* ---------------------------------- Offers --------------------------------- */

export function useOffers(workspaceId: string) {
  return useQuery({
    queryKey: ["cf-offers", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_offers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Offer[];
    },
    enabled: !!workspaceId,
  });
}

export function useSaveOffer(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (offer: Partial<Offer> & { id?: string }) => {
      const payload = { ...offer, workspace_id: workspaceId } as any;
      if (offer.id) {
        const { data, error } = await supabase
          .from("prospecting_offers")
          .update(payload)
          .eq("id", offer.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("prospecting_offers")
        .insert({ ...payload, created_by: userRes.user?.id })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate(qc, ["cf-offers"]);
      toast.success("Offer saved");
    },
    onError: (e: any) => toast.error(e.message || "Could not save the offer"),
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("prospecting_offers")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate(qc, ["cf-offers"]);
      toast.success("Offer archived");
    },
    onError: (e: any) => toast.error(e.message || "Could not archive the offer"),
  });
}

export function useAnalyseWebsite(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { offer_id: string; website_url: string }) => {
      const { data, error } = await supabase.functions.invoke("client-finder-analyse-website", {
        body: { workspace_id: workspaceId, ...params },
      });
      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      return data as { analysis: Record<string, any>; pages: any[] };
    },
    onSuccess: () => invalidate(qc, ["cf-offers"]),
    onError: (e: any) => toast.error(e.message || "Website analysis failed"),
  });
}

/* ----------------------------------- ICPs ---------------------------------- */

export function useIcps(workspaceId: string) {
  return useQuery({
    queryKey: ["cf-icps", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ideal_customer_profiles")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Icp[];
    },
    enabled: !!workspaceId,
  });
}

export function useGenerateIcp(workspaceId: string) {
  return useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase.functions.invoke("client-finder-ai", {
        body: { workspace_id: workspaceId, mode: "generate_icp", offer_id: offerId },
      });
      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      return data.icp as Record<string, any>;
    },
    onError: (e: any) => toast.error(e.message || "Could not generate a profile"),
  });
}

export function useSaveIcp(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (icp: Partial<Icp> & { id?: string }) => {
      const payload = { ...icp, workspace_id: workspaceId } as any;
      if (icp.id) {
        const { data, error } = await supabase
          .from("ideal_customer_profiles")
          .update(payload)
          .eq("id", icp.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("ideal_customer_profiles")
        .insert({ ...payload, created_by: userRes.user?.id })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate(qc, ["cf-icps"]);
      toast.success("Ideal customer profile saved");
    },
    onError: (e: any) => toast.error(e.message || "Could not save the profile"),
  });
}

export function useApproveIcp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("ideal_customer_profiles")
        .update({
          approval_status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: userRes.user?.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate(qc, ["cf-icps"]);
      toast.success("Profile approved");
    },
    onError: (e: any) => toast.error(e.message || "Could not approve the profile"),
  });
}

/* --------------------------------- Prospects -------------------------------- */

export function useProspectCompanies(workspaceId: string) {
  return useQuery({
    queryKey: ["cf-companies", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_companies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("fit_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as ProspectCompany[];
    },
    enabled: !!workspaceId,
  });
}

export function useProspectContacts(workspaceId: string) {
  return useQuery({
    queryKey: ["cf-contacts", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_contacts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as ProspectContact[];
    },
    enabled: !!workspaceId,
  });
}

export interface ImportRow {
  company_name: string;
  domain?: string;
  industry?: string;
  country?: string;
  city?: string;
  employee_range?: string;
  description?: string;
  contact_name?: string;
  job_title?: string;
  email?: string;
  linkedin_url?: string;
}

export function useImportProspects(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ImportRow[]) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      const now = new Date().toISOString();
      let companies = 0;
      let contacts = 0;
      let skipped = 0;

      for (const row of rows) {
        if (!row.company_name?.trim()) {
          skipped++;
          continue;
        }
        const domain = row.domain?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null;

        let companyId: string | null = null;
        if (domain) {
          const { data: existing } = await supabase
            .from("prospect_companies")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("domain", domain)
            .is("archived_at", null)
            .maybeSingle();
          companyId = existing?.id ?? null;
        }

        if (!companyId) {
          const { data: inserted, error } = await supabase
            .from("prospect_companies")
            .insert({
              workspace_id: workspaceId,
              created_by: uid,
              name: row.company_name.trim(),
              domain,
              website_url: domain ? `https://${domain}` : null,
              industry: row.industry?.trim() || null,
              country: row.country?.trim() || null,
              city: row.city?.trim() || null,
              employee_range: row.employee_range?.trim() || null,
              description: row.description?.trim() || null,
              data_source: "csv_import",
              data_freshness_at: now,
            })
            .select("id")
            .maybeSingle();
          if (error) {
            skipped++;
            continue;
          }
          companyId = inserted?.id ?? null;
          companies++;
        }

        const email = row.email?.trim().toLowerCase() || null;
        if (row.contact_name?.trim()) {
          const { error } = await supabase.from("prospect_contacts").insert({
            workspace_id: workspaceId,
            company_id: companyId,
            created_by: uid,
            full_name: row.contact_name.trim(),
            job_title: row.job_title?.trim() || null,
            email,
            email_status: email ? "not_checked" : "missing",
            linkedin_url: row.linkedin_url?.trim() || null,
            data_source: "csv_import",
            data_freshness_at: now,
          });
          if (!error) contacts++;
        }
      }

      return { companies, contacts, skipped };
    },
    onSuccess: (r) => {
      invalidate(qc, ["cf-companies", "cf-contacts"]);
      toast.success(`Imported ${r.companies} companies and ${r.contacts} contacts (${r.skipped} skipped)`);
    },
    onError: (e: any) => toast.error(e.message || "Import failed"),
  });
}

export function useScoreFit(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { icp_id: string; company_ids: string[] }) => {
      const { data, error } = await supabase.functions.invoke("client-finder-ai", {
        body: { workspace_id: workspaceId, mode: "score_fit", ...params },
      });
      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      return data as { scored: number };
    },
    onSuccess: (r) => {
      invalidate(qc, ["cf-companies"]);
      toast.success(`Scored ${r.scored} companies`);
    },
    onError: (e: any) => toast.error(e.message || "Scoring failed"),
  });
}

export function useUpdateCompanyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const { error } = await supabase
        .from("prospect_companies")
        .update({ status, excluded_reason: reason ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc, ["cf-companies"]),
    onError: (e: any) => toast.error(e.message || "Could not update the prospect"),
  });
}

/* -------------------------- Providers / diagnostics ------------------------- */

export function useProviderConnections(workspaceId: string) {
  return useQuery({
    queryKey: ["cf-providers", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_provider_connections")
        .select("*")
        .order("provider");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useProspectingUsage(workspaceId: string) {
  return useQuery({
    queryKey: ["cf-usage", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_usage_events")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

/* ------------------------ Apollo / Hunter data providers -------------------- */

async function callProviders(workspaceId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("client-finder-providers", {
    body: { workspace_id: workspaceId, ...payload },
  });
  if (error) throw new Error(data?.error || error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Runs a real credential check against each provider and stores the result. */
export function useCheckProviders(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => callProviders(workspaceId, { action: "status" }),
    onSuccess: () => {
      invalidate(qc, ["cf-providers"]);
      toast.success("Provider status checked");
    },
    onError: (e: any) => toast.error(e.message || "Could not check the providers"),
  });
}

export function useDiscoverCompanies(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { icp_id?: string; limit?: number }) =>
      callProviders(workspaceId, { action: "discover_companies", ...params }) as Promise<{
        returned: number; created: number; duplicates: number;
      }>,
    onSuccess: (r) => {
      invalidate(qc, ["cf-companies", "cf-usage"]);
      toast.success(
        `Apollo returned ${r.returned} companies — ${r.created} added, ${r.duplicates} already on your list`,
      );
    },
    onError: (e: any) => toast.error(e.message || "Company discovery failed"),
  });
}

export function useDiscoverContacts(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { company_ids: string[]; per_company?: number; seniorities?: string[] }) =>
      callProviders(workspaceId, { action: "discover_contacts", ...params }) as Promise<{
        returned: number; created: number; duplicates: number; without_email: number;
      }>,
    onSuccess: (r) => {
      invalidate(qc, ["cf-contacts", "cf-usage"]);
      toast.success(
        `${r.created} decision-makers added` +
          (r.without_email ? ` — ${r.without_email} without an email address` : ""),
      );
    },
    onError: (e: any) => toast.error(e.message || "Contact discovery failed"),
  });
}

export function useVerifyEmails(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { contact_ids: string[] }) =>
      callProviders(workspaceId, { action: "verify_emails", ...params }) as Promise<{
        checked: number; failed: number; results: Record<string, number>;
      }>,
    onSuccess: (r) => {
      invalidate(qc, ["cf-contacts", "cf-usage"]);
      const parts = Object.entries(r.results)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${n} ${k}`)
        .join(", ");
      toast.success(`Checked ${r.checked} addresses${parts ? `: ${parts}` : ""}`);
    },
    onError: (e: any) => toast.error(e.message || "Email verification failed"),
  });
}
