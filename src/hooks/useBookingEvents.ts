import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BookingEvent = {
  id: string;
  workspace_id: string;
  booking_id: string | null;
  event_type: string;
  actor_user_id: string | null;
  source: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type BookingReminder = {
  id: string;
  booking_id: string;
  channel: string;
  audience: string;
  offset_minutes: number;
  send_at: string;
  status: string;
  attempts: number;
  sent_at: string | null;
};

export const BOOKING_EVENT_LABELS: Record<string, string> = {
  booking_created: "Booking created",
  booking_confirmed: "Booking confirmed",
  host_assigned: "Host assigned",
  booking_rescheduled: "Rescheduled",
  booking_cancelled: "Cancelled",
  reminder_sent: "Reminder sent",
  reminder_failed: "Reminder failed",
  meeting_completed: "Marked completed",
  invitee_no_show: "Invitee no-show",
  host_no_show: "Host no-show",
  calendar_sync_failed: "Calendar sync failed",
  video_link_failed: "Video link failed",
};

export function useBookingTimeline(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["booking-events", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_events")
        .select("*")
        .eq("booking_id", bookingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BookingEvent[];
    },
    enabled: !!bookingId,
  });
}

export function useBookingReminders(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["booking-reminders", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_reminders")
        .select("*")
        .eq("booking_id", bookingId!)
        .order("send_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BookingReminder[];
    },
    enabled: !!bookingId,
  });
}

/** Recent workspace-wide booking activity for the overview feed. */
export function useBookingActivity(workspaceId: string | undefined, limit = 15) {
  return useQuery({
    queryKey: ["booking-activity", workspaceId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_events")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as BookingEvent[];
    },
    enabled: !!workspaceId,
  });
}
