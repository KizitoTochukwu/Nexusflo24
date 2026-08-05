import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AvailabilitySchedule = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  name: string;
  timezone: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type AvailabilityRule = {
  id: string;
  workspace_id: string;
  schedule_id: string;
  weekday: number; // 0 = Sunday
  start_time: string; // "09:00"
  end_time: string; // "17:00"
};

export type AvailabilityOverride = {
  id: string;
  workspace_id: string;
  schedule_id: string;
  override_date: string; // yyyy-MM-dd
  is_unavailable: boolean;
  start_time: string | null;
  end_time: string | null;
  label: string | null;
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function useAvailabilitySchedules(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["availability-schedules", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_schedules")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AvailabilitySchedule[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useAvailabilityRules(scheduleId: string | undefined) {
  return useQuery({
    queryKey: ["availability-rules", scheduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_rules")
        .select("*")
        .eq("schedule_id", scheduleId!)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AvailabilityRule[];
    },
    enabled: !!scheduleId,
  });
}

export function useAvailabilityOverrides(scheduleId: string | undefined) {
  return useQuery({
    queryKey: ["availability-overrides", scheduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_overrides")
        .select("*")
        .eq("schedule_id", scheduleId!)
        .order("override_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AvailabilityOverride[];
    },
    enabled: !!scheduleId,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { workspace_id: string; name: string; timezone: string; is_default?: boolean }) => {
      const { data, error } = await supabase
        .from("availability_schedules")
        .insert({ ...input, user_id: user?.id ?? null } as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      const schedule = data as unknown as AvailabilitySchedule;
      // Seed a sensible Mon–Fri 09:00–17:00 week so the schedule is usable straight away.
      const seed = [1, 2, 3, 4, 5].map((weekday) => ({
        workspace_id: input.workspace_id,
        schedule_id: schedule.id,
        weekday,
        start_time: "09:00",
        end_time: "17:00",
      }));
      await supabase.from("availability_rules").insert(seed as any);
      return schedule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-schedules"] });
      toast.success("Schedule created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create schedule"),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AvailabilitySchedule> & { id: string }) => {
      const { error } = await supabase.from("availability_schedules").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-schedules"] }),
    onError: (e: any) => toast.error(e.message || "Failed to update schedule"),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("availability_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-schedules"] });
      toast.success("Schedule deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete schedule"),
  });
}

export function useSaveRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, scheduleId, rules }: {
      workspaceId: string;
      scheduleId: string;
      rules: { weekday: number; start_time: string; end_time: string }[];
    }) => {
      const { error: delError } = await supabase.from("availability_rules").delete().eq("schedule_id", scheduleId);
      if (delError) throw delError;
      if (rules.length) {
        const { error } = await supabase.from("availability_rules").insert(
          rules.map((r) => ({ ...r, workspace_id: workspaceId, schedule_id: scheduleId })) as any
        );
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["availability-rules", vars.scheduleId] });
      toast.success("Working hours saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save hours"),
  });
}

export function useSaveOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<AvailabilityOverride, "id">) => {
      const { error } = await supabase.from("availability_overrides").insert(input as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["availability-overrides", vars.schedule_id] });
      toast.success("Date override added");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add override"),
  });
}

export function useDeleteOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; scheduleId: string }) => {
      const { error } = await supabase.from("availability_overrides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["availability-overrides", vars.scheduleId] }),
    onError: (e: any) => toast.error(e.message || "Failed to remove override"),
  });
}
