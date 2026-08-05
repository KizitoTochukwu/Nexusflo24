import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logCrmActivity, logCrmAudit } from "@/lib/crm/events";

export type Company = {
  id: string;
  workspace_id: string;
  created_by: string | null;
  owner_user_id: string | null;
  name: string;
  domain: string | null;
  website: string | null;
  industry: string | null;
  size_band: string | null;
  annual_revenue: number | null;
  phone: string | null;
  email: string | null;
  linkedin_url: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  description: string | null;
  tags: string[];
  logo_url: string | null;
  lifecycle_stage: string;
  last_activity_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyFilters = {
  search?: string;
  industry?: string;
  size_band?: string;
  owner_user_id?: string;
  lifecycle_stage?: string;
  includeArchived?: boolean;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export const COMPANY_PAGE_SIZE = 25;

function applyFilters(query: any, f: CompanyFilters) {
  if (!f.includeArchived) query = query.is("archived_at", null);
  if (f.search) {
    const s = f.search.replace(/[,%]/g, "");
    query = query.or(`name.ilike.%${s}%,domain.ilike.%${s}%,industry.ilike.%${s}%,city.ilike.%${s}%`);
  }
  if (f.industry && f.industry !== "all") query = query.eq("industry", f.industry);
  if (f.size_band && f.size_band !== "all") query = query.eq("size_band", f.size_band);
  if (f.lifecycle_stage && f.lifecycle_stage !== "all") query = query.eq("lifecycle_stage", f.lifecycle_stage);
  if (f.owner_user_id && f.owner_user_id !== "all") {
    if (f.owner_user_id === "unassigned") query = query.is("owner_user_id", null);
    else query = query.eq("owner_user_id", f.owner_user_id);
  }
  return query;
}

export function useCompanies(workspaceId: string, filters: CompanyFilters = {}) {
  const { user } = useAuth();
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? COMPANY_PAGE_SIZE;

  return useQuery({
    queryKey: ["crm-companies", workspaceId, filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = supabase
        .from("companies" as any)
        .select("*", { count: "exact" })
        .eq("workspace_id", workspaceId);
      query = applyFilters(query, filters);
      const { data, error, count } = await query
        .order(filters.sortKey ?? "created_at", { ascending: filters.sortDir === "asc", nullsFirst: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as Company[], total: count ?? 0 };
    },
    enabled: !!user && !!workspaceId,
  });
}

/** Lightweight list for pickers (contact drawer, filters). */
export function useCompanyOptions(workspaceId: string, search = "") {
  return useQuery({
    queryKey: ["crm-company-options", workspaceId, search],
    queryFn: async () => {
      let query = supabase
        .from("companies" as any)
        .select("id, name, domain")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null);
      if (search.trim()) query = query.ilike("name", `%${search.replace(/[,%]/g, "")}%`);
      const { data, error } = await query.order("name", { ascending: true }).limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Pick<Company, "id" | "name" | "domain">[];
    },
    enabled: !!workspaceId,
  });
}

export async function fetchAllCompanies(workspaceId: string, filters: CompanyFilters) {
  let query = supabase.from("companies" as any).select("*").eq("workspace_id", workspaceId);
  query = applyFilters(query, filters);
  const { data, error } = await query.order("name", { ascending: true }).limit(5000);
  if (error) throw error;
  return (data ?? []) as unknown as Company[];
}

export function useCompany(companyId?: string) {
  return useQuery({
    queryKey: ["crm-company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies" as any)
        .select("*")
        .eq("id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Company | null;
    },
    enabled: !!companyId,
  });
}

export function useCompanyStats(workspaceId: string) {
  return useQuery({
    queryKey: ["crm-company-stats", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies" as any)
        .select("lifecycle_stage, created_at, industry")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      return {
        total: rows.length,
        customers: rows.filter((r) => r.lifecycle_stage === "customer").length,
        industries: new Set(rows.map((r) => r.industry).filter(Boolean)).size,
        newThisMonth: rows.filter((r) => r.created_at >= since).length,
      };
    },
    enabled: !!workspaceId,
  });
}

/** Contacts that belong to a company. */
export function useCompanyContacts(companyId?: string) {
  return useQuery({
    queryKey: ["crm-company-contacts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .select("id, full_name, email, phone, job_title, lifecycle_stage, score, last_activity_at")
        .eq("company_id", companyId!)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!companyId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["crm-companies"] });
  qc.invalidateQueries({ queryKey: ["crm-company-stats"] });
  qc.invalidateQueries({ queryKey: ["crm-company-options"] });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<Company> & { workspace_id: string; name: string }) => {
      const payload = {
        ...input,
        domain: input.domain ? input.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") : null,
        email: input.email ? input.email.trim().toLowerCase() : null,
        created_by: user?.id ?? null,
        owner_user_id: input.owner_user_id ?? user?.id ?? null,
      };
      const { data, error } = await supabase
        .from("companies" as any)
        .insert(payload as any)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("A company with this domain already exists in this workspace.");
        throw error;
      }
      const company = data as unknown as Company;

      await logCrmActivity({
        workspaceId: company.workspace_id,
        recordType: "company",
        recordId: company.id,
        activityType: "contact_created",
        title: "Company created",
        description: company.name,
        actorUserId: user?.id,
        actorLabel: user?.email ?? undefined,
      });
      await logCrmAudit({
        workspaceId: company.workspace_id,
        recordType: "company",
        recordId: company.id,
        action: "create",
        after: company as any,
        actorUserId: user?.id,
      });
      return company;
    },
    onSuccess: (c) => {
      invalidate(qc);
      toast.success(`${c.name} added`);
    },
    onError: (e: any) => toast.error(e.message || "Couldn't create the company"),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, prev, silent, ...updates }: Partial<Company> & { id: string; prev?: Company; silent?: boolean }) => {
      const { data, error } = await supabase
        .from("companies" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Another company already uses this domain.");
        throw error;
      }
      const company = data as unknown as Company;

      await logCrmActivity({
        workspaceId: company.workspace_id,
        recordType: "company",
        recordId: company.id,
        activityType: updates.archived_at !== undefined ? (updates.archived_at ? "archived" : "restored") : "contact_updated",
        title: updates.archived_at !== undefined ? (updates.archived_at ? "Company archived" : "Company restored") : "Company updated",
        description: Object.keys(updates).join(", "),
        actorUserId: user?.id,
        actorLabel: user?.email ?? undefined,
      });
      await logCrmAudit({
        workspaceId: company.workspace_id,
        recordType: "company",
        recordId: company.id,
        action: "update",
        before: prev as any,
        after: company as any,
        actorUserId: user?.id,
      });
      return { company, silent };
    },
    onSuccess: ({ company, silent }) => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ["crm-company", company.id] });
      if (!silent) toast.success("Company saved");
    },
    onError: (e: any) => toast.error(e.message || "Couldn't save the company"),
  });
}

/** Links (or unlinks) contacts to a company, keeping the denormalised name in sync. */
export function useLinkContactsToCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactIds, company }: { contactIds: string[]; company: Company | null }) => {
      const { error } = await supabase
        .from("contacts" as any)
        .update({ company_id: company?.id ?? null, company_name: company?.name ?? null } as any)
        .in("id", contactIds);
      if (error) throw error;
      return contactIds.length;
    },
    onSuccess: (n, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-company-contacts"] });
      qc.invalidateQueries({ queryKey: ["crm-contacts"] });
      qc.invalidateQueries({ queryKey: ["crm-contact"] });
      toast.success(vars.company ? `${n} contact${n === 1 ? "" : "s"} linked` : "Contact unlinked");
    },
    onError: (e: any) => toast.error(e.message || "Couldn't update the contacts"),
  });
}
