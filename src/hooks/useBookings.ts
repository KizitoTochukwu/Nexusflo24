import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type BookingPage = {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  slug: string | null;
  duration_minutes: number;
  availability: Record<string, { start: string; end: string }[]>;
  timezone: string;
  buffer_minutes: number;
  max_days_ahead: number;
  description: string;
  color: string;
  status: string;
  notify_host: boolean;
  google_calendar_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  booking_page_id: string;
  workspace_id: string;
  lead_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  start_time: string;
  end_time: string;
  status: string;
  google_event_id: string | null;
  notes: string | null;
  created_at: string;
};

export function useBookingPages(workspaceId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["booking-pages", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_pages" as any)
        .select("id, workspace_id, user_id, name, slug, duration_minutes, availability, timezone, buffer_minutes, max_days_ahead, description, color, status, notify_host, location_type, location_value, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BookingPage[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useBookings(workspaceId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bookings", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Booking[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useCreateBookingPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<BookingPage> & { workspace_id: string; name: string }) => {
      const { data, error } = await supabase
        .from("booking_pages" as any)
        .insert({ ...input, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BookingPage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-pages"] });
      toast.success("Booking page created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create booking page"),
  });
}

export function useUpdateBookingPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookingPage> & { id: string }) => {
      const { data, error } = await supabase
        .from("booking_pages" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BookingPage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-pages"] });
      toast.success("Booking page updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update"),
  });
}

export function useDeleteBookingPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("booking_pages" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-pages"] });
      toast.success("Booking page deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete"),
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string }) => {
      const { data, error } = await supabase
        .from("bookings" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update booking"),
  });
}
