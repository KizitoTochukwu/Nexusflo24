import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AppointmentKind = "one_to_one" | "group" | "round_robin" | "collective";

export type BookingQuestion = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "phone" | "email" | "checkbox";
  required: boolean;
  options?: string[];
};

export type ReminderStep = {
  channel: "email" | "sms" | "whatsapp";
  audience: "guest" | "host";
  offset_minutes: number;
};

export type AppointmentType = {
  id: string;
  workspace_id: string;
  booking_page_id: string | null;
  created_by: string | null;
  name: string;
  slug: string | null;
  description: string;
  kind: AppointmentKind;
  duration_minutes: number;
  slot_interval_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  min_notice_minutes: number;
  max_days_ahead: number;
  max_per_day: number | null;
  capacity: number;
  color: string;
  location_type: string;
  location_value: string | null;
  timezone: string;
  availability_schedule_id: string | null;
  team_id: string | null;
  host_user_id: string | null;
  questions: BookingQuestion[];
  reminder_sequence: ReminderStep[];
  cancel_cutoff_minutes: number;
  reschedule_cutoff_minutes: number;
  max_reschedules: number;
  require_confirmation: boolean;
  is_published: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export function useAppointmentTypes(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["appointment-types", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_types")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AppointmentType[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useCreateAppointmentType() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<AppointmentType> & { workspace_id: string; name: string }) => {
      const { data, error } = await supabase
        .from("appointment_types")
        .insert({ ...input, created_by: user?.id ?? null } as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AppointmentType;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointment-types"] });
      toast.success("Appointment type created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create appointment type"),
  });
}

export function useUpdateAppointmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AppointmentType> & { id: string }) => {
      const { data, error } = await supabase
        .from("appointment_types")
        .update(updates as any)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AppointmentType;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointment-types"] });
      toast.success("Appointment type updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update appointment type"),
  });
}

export function useDeleteAppointmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointment_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointment-types"] });
      toast.success("Appointment type deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete"),
  });
}

/**
 * A type can only be published once it can actually take a booking:
 * it needs a host or a team, a location and a positive duration.
 */
export function publishBlockers(t: Partial<AppointmentType>): string[] {
  const blockers: string[] = [];
  if (!t.name?.trim()) blockers.push("Give the appointment type a name");
  if (!t.duration_minutes || t.duration_minutes < 5) blockers.push("Set a duration of at least 5 minutes");
  if (!t.host_user_id && !t.team_id) blockers.push("Assign a host or a booking team");
  if (!t.availability_schedule_id) blockers.push("Attach an availability schedule");
  if (!t.booking_page_id) blockers.push("Link this type to a booking page so guests can reach it");
  if ((t.location_type === "in_person" || t.location_type === "phone" || t.location_type === "custom") && !t.location_value?.trim()) {
    blockers.push("Add the location details");
  }
  if (t.kind === "group" && (t.capacity ?? 1) < 2) blockers.push("Group meetings need a capacity of 2 or more");
  return blockers;
}
