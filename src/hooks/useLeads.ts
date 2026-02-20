import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Lead = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  score: number;
  status: string;
  tags: string[];
  notes: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadActivity = {
  id: string;
  lead_id: string;
  user_id: string;
  type: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export type LeadFilters = {
  search?: string;
  status?: string;
  source?: string;
  sort?: "newest" | "oldest" | "highest_score";
};

export function useLeads(filters: LeadFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      let query = supabase.from("leads").select("*");

      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }
      if (filters.status && filters.status !== "All") {
        query = query.eq("status", filters.status);
      }
      if (filters.source && filters.source !== "All") {
        query = query.eq("source", filters.source);
      }

      if (filters.sort === "oldest") {
        query = query.order("created_at", { ascending: true });
      } else if (filters.sort === "highest_score") {
        query = query.order("score", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
    enabled: !!user,
  });
}

export function useLeadStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lead-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("status, created_at");
      if (error) throw error;
      const leads = data ?? [];
      const total = leads.length;
      const newCount = leads.filter((l: any) => l.status === "New").length;
      const warm = leads.filter((l: any) => l.status === "Warm").length;
      const hot = leads.filter((l: any) => l.status === "Hot").length;
      const won = leads.filter((l: any) => l.status === "Won").length;
      return { total, newCount, warm, hot, won, leads };
    },
    enabled: !!user,
  });
}

export function useLeadActivities(leadId: string | null) {
  return useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadActivity[];
    },
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...lead, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;

      // Log activity
      await supabase.from("lead_activities").insert({
        lead_id: data.id,
        user_id: user!.id,
        type: "stage_change",
        meta: { new_status: lead.status || "New", note: "Lead created" },
      } as any);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-stats"] });
      toast.success("Lead created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create lead"),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, prev, ...updates }: Partial<Lead> & { id: string; prev?: Partial<Lead> }) => {
      const { data, error } = await supabase
        .from("leads")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Log status change
      if (prev?.status && updates.status && prev.status !== updates.status) {
        await supabase.from("lead_activities").insert({
          lead_id: id,
          user_id: user!.id,
          type: "stage_change",
          meta: { old_status: prev.status, new_status: updates.status },
        } as any);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-stats"] });
      toast.success("Lead updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update lead"),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-stats"] });
      toast.success("Lead deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete lead"),
  });
}

export function useLogActivity() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ leadId, type, meta }: { leadId: string; type: string; meta?: Record<string, unknown> }) => {
      const { error } = await supabase.from("lead_activities").insert({
        lead_id: leadId,
        user_id: user!.id,
        type,
        meta: meta || {},
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["lead-activities", vars.leadId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
