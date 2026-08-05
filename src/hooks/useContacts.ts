import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CONTACT_PAGE_SIZE, type ContactColumnKey } from "@/lib/crm/constants";
import { logCrmActivity, logCrmAudit, fireCrmAutomationEvent } from "@/lib/crm/events";

export type Contact = {
  id: string;
  workspace_id: string;
  created_by: string | null;
  owner_user_id: string | null;
  origin_lead_id: string | null;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  job_title: string | null;
  company_name: string | null;
  lifecycle_stage: string;
  lead_status: string | null;
  score: number;
  source: string | null;
  consent_status: string;
  consent_updated_at: string | null;
  tags: string[];
  avatar_url: string | null;
  notes: string | null;
  last_activity_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactFilters = {
  search?: string;
  lifecycle_stage?: string;
  owner_user_id?: string;
  source?: string;
  consent_status?: string;
  tags?: string[];
  company?: string;
  scoreMin?: number;
  scoreMax?: number;
  createdFrom?: string;
  createdTo?: string;
  activityFrom?: string;
  includeArchived?: boolean;
  sortKey?: ContactColumnKey;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export const contactsKey = (workspaceId: string, filters: ContactFilters) =>
  ["crm-contacts", workspaceId, filters] as const;

function applyFilters(query: any, f: ContactFilters) {
  if (!f.includeArchived) query = query.is("archived_at", null);
  if (f.search) {
    const s = f.search.replace(/[,%]/g, "");
    query = query.or(
      `full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,company_name.ilike.%${s}%,job_title.ilike.%${s}%`
    );
  }
  if (f.lifecycle_stage && f.lifecycle_stage !== "all") query = query.eq("lifecycle_stage", f.lifecycle_stage);
  if (f.owner_user_id && f.owner_user_id !== "all") {
    if (f.owner_user_id === "unassigned") query = query.is("owner_user_id", null);
    else query = query.eq("owner_user_id", f.owner_user_id);
  }
  if (f.source && f.source !== "all") query = query.eq("source", f.source);
  if (f.consent_status && f.consent_status !== "all") query = query.eq("consent_status", f.consent_status);
  if (f.company) query = query.ilike("company_name", `%${f.company}%`);
  if (f.tags?.length) query = query.overlaps("tags", f.tags);
  if (typeof f.scoreMin === "number") query = query.gte("score", f.scoreMin);
  if (typeof f.scoreMax === "number") query = query.lte("score", f.scoreMax);
  if (f.createdFrom) query = query.gte("created_at", f.createdFrom);
  if (f.createdTo) query = query.lte("created_at", `${f.createdTo}T23:59:59.999Z`);
  if (f.activityFrom) query = query.gte("last_activity_at", f.activityFrom);
  return query;
}

export function useContacts(workspaceId: string, filters: ContactFilters = {}) {
  const { user } = useAuth();
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? CONTACT_PAGE_SIZE;

  return useQuery({
    queryKey: contactsKey(workspaceId, filters),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = supabase
        .from("contacts" as any)
        .select("*", { count: "exact" })
        .eq("workspace_id", workspaceId);

      query = applyFilters(query, filters);
      query = query
        .order(filters.sortKey ?? "created_at", { ascending: filters.sortDir === "asc", nullsFirst: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as unknown as Contact[], total: count ?? 0 };
    },
    enabled: !!user && !!workspaceId,
  });
}

/** Fetches every row matching the current filters (used for export + select-all). */
export async function fetchAllContacts(workspaceId: string, filters: ContactFilters) {
  let query = supabase.from("contacts" as any).select("*").eq("workspace_id", workspaceId);
  query = applyFilters(query, filters);
  const { data, error } = await query
    .order(filters.sortKey ?? "created_at", { ascending: filters.sortDir === "asc" })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as unknown as Contact[];
}

export function useContact(contactId?: string) {
  return useQuery({
    queryKey: ["crm-contact", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .select("*")
        .eq("id", contactId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Contact | null;
    },
    enabled: !!contactId,
  });
}

export function useContactStats(workspaceId: string) {
  return useQuery({
    queryKey: ["crm-contact-stats", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .select("lifecycle_stage, score, created_at, archived_at")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      return {
        total: rows.length,
        customers: rows.filter((r) => r.lifecycle_stage === "customer").length,
        salesReady: rows.filter((r) => (r.score ?? 0) >= 80).length,
        newThisMonth: rows.filter((r) => r.created_at >= since).length,
      };
    },
    enabled: !!workspaceId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["crm-contacts"] });
  qc.invalidateQueries({ queryKey: ["crm-contact-stats"] });
}

export function useCreateContact() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<Contact> & { workspace_id: string }) => {
      const payload = {
        ...input,
        email: input.email ? input.email.trim().toLowerCase() : null,
        created_by: user?.id ?? null,
        owner_user_id: input.owner_user_id ?? user?.id ?? null,
      };
      const { data, error } = await supabase
        .from("contacts" as any)
        .insert(payload as any)
        .select()
        .single();
      if (error) {
        if (error.code === "23505")
          throw new Error("A contact with this email or phone already exists in this workspace.");
        throw error;
      }
      const contact = data as unknown as Contact;

      await logCrmActivity({
        workspaceId: contact.workspace_id,
        recordType: "contact",
        recordId: contact.id,
        activityType: "contact_created",
        title: "Contact created",
        description: contact.full_name || contact.email || "New contact",
        actorUserId: user?.id,
        actorLabel: user?.email ?? undefined,
        externalEventId: `contact_created:${contact.id}`,
      });
      await logCrmAudit({
        workspaceId: contact.workspace_id,
        recordType: "contact",
        recordId: contact.id,
        action: "create",
        actorUserId: user?.id,
        actorLabel: user?.email ?? undefined,
        after: contact as unknown as Record<string, unknown>,
      });
      if (contact.origin_lead_id) {
        fireCrmAutomationEvent({
          workspaceId: contact.workspace_id,
          triggerType: "contact_created",
          leadIds: [contact.origin_lead_id],
        });
      }
      return contact;
    },
    onSuccess: () => {
      invalidate(qc);
      toast.success("Contact created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create contact"),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, prev, silent, ...updates }: Partial<Contact> & { id: string; prev?: Contact; silent?: boolean }) => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if (error.code === "23505")
          throw new Error("Another contact already uses this email or phone.");
        throw error;
      }
      const contact = data as unknown as Contact;

      const changedKeys = Object.keys(updates);
      const detail: string[] = [];
      if (prev) {
        if (updates.lifecycle_stage && updates.lifecycle_stage !== prev.lifecycle_stage) detail.push("stage_changed");
        if (updates.owner_user_id !== undefined && updates.owner_user_id !== prev.owner_user_id) detail.push("owner_changed");
        if (updates.consent_status && updates.consent_status !== prev.consent_status) detail.push("consent_changed");
        if (updates.tags && JSON.stringify(updates.tags) !== JSON.stringify(prev.tags)) detail.push("tag_changed");
        if (updates.score !== undefined && updates.score !== prev.score) detail.push("score_changed");
      }
      const types = detail.length ? detail : ["contact_updated"];
      for (const t of types) {
        await logCrmActivity({
          workspaceId: contact.workspace_id,
          recordType: "contact",
          recordId: contact.id,
          activityType: t,
          title: t.replace(/_/g, " "),
          description: changedKeys.join(", "),
          actorUserId: user?.id,
          actorLabel: user?.email ?? undefined,
          meta: { fields: changedKeys },
        });
      }
      await logCrmAudit({
        workspaceId: contact.workspace_id,
        recordType: "contact",
        recordId: contact.id,
        action: "update",
        actorUserId: user?.id,
        actorLabel: user?.email ?? undefined,
        before: (prev ?? null) as unknown as Record<string, unknown> | null,
        after: contact as unknown as Record<string, unknown>,
      });
      if (contact.origin_lead_id) {
        fireCrmAutomationEvent({
          workspaceId: contact.workspace_id,
          triggerType: "contact_updated",
          leadIds: [contact.origin_lead_id],
        });
      }
      return { contact, silent };
    },
    onSuccess: ({ contact, silent }) => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ["crm-contact", contact.id] });
      qc.invalidateQueries({ queryKey: ["crm-activities", "contact", contact.id] });
      if (!silent) toast.success("Contact updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update contact"),
  });
}

export type BulkContactUpdate = {
  ids: string[];
  workspaceId: string;
  patch?: Partial<Pick<Contact, "owner_user_id" | "lifecycle_stage" | "consent_status">>;
  addTags?: string[];
  removeTags?: string[];
  archive?: boolean;
  restore?: boolean;
};

export function useBulkUpdateContacts() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: BulkContactUpdate) => {
      const { ids, workspaceId, patch, addTags, removeTags, archive, restore } = input;
      if (!ids.length) return 0;

      if (addTags?.length || removeTags?.length) {
        const { data: current, error: readErr } = await supabase
          .from("contacts" as any)
          .select("id, tags")
          .in("id", ids);
        if (readErr) throw readErr;
        for (const row of (current ?? []) as any[]) {
          const next = new Set<string>(row.tags ?? []);
          addTags?.forEach((t) => next.add(t));
          removeTags?.forEach((t) => next.delete(t));
          const { error } = await supabase
            .from("contacts" as any)
            .update({ tags: Array.from(next) } as any)
            .eq("id", row.id);
          if (error) throw error;
        }
      }

      const flat: Record<string, unknown> = { ...(patch ?? {}) };
      if (archive) flat.archived_at = new Date().toISOString();
      if (restore) flat.archived_at = null;
      if (Object.keys(flat).length) {
        const { error } = await supabase.from("contacts" as any).update(flat as any).in("id", ids);
        if (error) throw error;
      }

      const action = archive ? "archived" : restore ? "restored" : addTags?.length || removeTags?.length ? "tag_changed" : patch?.owner_user_id !== undefined ? "owner_changed" : "contact_updated";
      await Promise.all(
        ids.map((id) =>
          logCrmActivity({
            workspaceId,
            recordType: "contact",
            recordId: id,
            activityType: action,
            title: `Bulk ${action.replace(/_/g, " ")}`,
            actorUserId: user?.id,
            actorLabel: user?.email ?? undefined,
            meta: { bulk: true, patch: flat, addTags, removeTags },
          })
        )
      );
      await logCrmAudit({
        workspaceId,
        recordType: "contact",
        action: `bulk_${action}`,
        actorUserId: user?.id,
        actorLabel: user?.email ?? undefined,
        after: { ids, patch: flat, addTags, removeTags },
      });
      return ids.length;
    },
    onSuccess: (n) => {
      invalidate(qc);
      if (n) toast.success(`${n} contact${n === 1 ? "" : "s"} updated`);
    },
    onError: (e: any) => toast.error(e.message || "Bulk update failed"),
  });
}
