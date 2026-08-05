import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AssignmentMethod = "round_robin" | "priority" | "least_busy" | "collective";

export type BookingTeam = {
  id: string;
  workspace_id: string;
  name: string;
  assignment_method: AssignmentMethod;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingTeamMember = {
  id: string;
  workspace_id: string;
  team_id: string;
  user_id: string;
  priority: number;
  is_paused: boolean;
  is_required: boolean;
  max_per_day: number | null;
  availability_schedule_id: string | null;
  created_at: string;
};

export const ASSIGNMENT_METHOD_LABELS: Record<AssignmentMethod, string> = {
  round_robin: "Round-robin (rotate evenly)",
  priority: "Priority (highest priority free host)",
  least_busy: "Least busy (fewest recent meetings)",
  collective: "Collective (all required hosts must be free)",
};

export function useBookingTeams(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["booking-teams", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_teams")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BookingTeam[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useBookingTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ["booking-team-members", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_team_members")
        .select("*")
        .eq("team_id", teamId!)
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BookingTeamMember[];
    },
    enabled: !!teamId,
  });
}

/** Workspace members with their profile, used to pick hosts. */
export function useWorkspaceHosts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-hosts", workspaceId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      const ids = (members ?? []).map((m: any) => m.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", ids);
      return (members ?? []).map((m: any) => {
        const p = (profiles ?? []).find((x: any) => x.id === m.user_id);
        return {
          user_id: m.user_id as string,
          role: m.role as string,
          name: (p?.full_name as string) || (p?.email as string) || "Team member",
          email: (p?.email as string) ?? "",
          avatar_url: (p?.avatar_url as string) ?? null,
        };
      });
    },
    enabled: !!workspaceId,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { workspace_id: string; name: string; assignment_method: AssignmentMethod }) => {
      const { data, error } = await supabase
        .from("booking_teams")
        .insert({ ...input, created_by: user?.id ?? null } as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BookingTeam;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-teams"] });
      toast.success("Team created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create team"),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookingTeam> & { id: string }) => {
      const { error } = await supabase.from("booking_teams").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking-teams"] }),
    onError: (e: any) => toast.error(e.message || "Failed to update team"),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("booking_teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-teams"] });
      toast.success("Team deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete team"),
  });
}

export function useUpsertTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<BookingTeamMember> & { workspace_id: string; team_id: string; user_id: string }) => {
      const { error } = await supabase
        .from("booking_team_members")
        .upsert(input as any, { onConflict: "team_id,user_id" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["booking-team-members", vars.team_id] }),
    onError: (e: any) => toast.error(e.message || "Failed to save host"),
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; teamId: string }) => {
      const { error } = await supabase.from("booking_team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["booking-team-members", vars.teamId] }),
    onError: (e: any) => toast.error(e.message || "Failed to remove host"),
  });
}
