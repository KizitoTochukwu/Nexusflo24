import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useWorkspaceInvites(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-invites", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_invites")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      // Fetch profile info for each member
      const userIds = (data || []).map((m: any) => m.user_id);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", userIds);
        profiles = profileData || [];
      }

      return (data || []).map((m: any) => {
        const profile = profiles.find((p: any) => p.id === m.user_id);
        return { ...m, profile };
      });
    },
  });
}

export function useSendInvite() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ workspaceId, email, role }: { workspaceId: string; email: string; role: string }) => {
      const { data, error } = await supabase
        .from("workspace_invites")
        .insert({
          workspace_id: workspaceId,
          email,
          role,
          invited_by: user!.id,
        })
        .select()
        .maybeSingle();
      if (error) throw error;

      // Optionally invoke edge function to send email
      try {
        await supabase.functions.invoke("send-workspace-invite", {
          body: { inviteId: data?.id, workspaceId, email, role },
        });
      } catch {
        // Invite stored even if email fails
      }

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-invites", vars.workspaceId] });
    },
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from("workspace_invites")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-invites", vars.workspaceId] });
    },
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role, workspaceId }: { memberId: string; role: string; workspaceId: string }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-members", vars.workspaceId] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, workspaceId }: { memberId: string; workspaceId: string }) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-members", vars.workspaceId] });
    },
  });
}
