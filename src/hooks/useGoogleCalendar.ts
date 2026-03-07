import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";

export type GoogleCalendarItem = {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string;
};

export function useGoogleCalendarStatus(bookingPageId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["google-calendar-status", bookingPageId],
    queryFn: async () => {
      if (!bookingPageId) return null;
      const { data, error } = await supabase
        .from("booking_pages" as any)
        .select("google_token_id")
        .eq("id", bookingPageId)
        .single();
      if (error) throw error;
      const tokenId = (data as any)?.google_token_id;
      if (!tokenId) return { connected: false, tokenId: null, calendarId: null };

      const { data: token, error: tErr } = await supabase
        .from("google_calendar_tokens" as any)
        .select("id, calendar_id, created_at")
        .eq("id", tokenId)
        .single();

      if (tErr || !token) return { connected: false, tokenId: null, calendarId: null };
      return { connected: true, tokenId: (token as any).id, calendarId: (token as any).calendar_id as string };
    },
    enabled: !!user && !!bookingPageId,
  });
}

export function useGoogleCalendarList(tokenId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["google-calendar-list", tokenId],
    queryFn: async (): Promise<{ calendars: GoogleCalendarItem[]; selected: string }> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-calendar-auth?action=calendars`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token_id: tokenId }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    enabled: !!user && !!tokenId,
  });
}

export function useSelectGoogleCalendar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ tokenId, calendarId }: { tokenId: string; calendarId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-calendar-auth?action=select-calendar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token_id: tokenId, calendar_id: calendarId }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
      qc.invalidateQueries({ queryKey: ["google-calendar-list"] });
      toast.success("Calendar updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update calendar"),
  });
}

export function useGoogleCalendarConnect() {
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "GOOGLE_CALENDAR_CONNECTED") {
        qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
        qc.invalidateQueries({ queryKey: ["google-calendar-list"] });
        qc.invalidateQueries({ queryKey: ["booking-pages"] });
        toast.success("Google Calendar connected!");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [qc]);

  const connect = useCallback(async (workspaceId: string, bookingPageId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-calendar-auth?action=start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ workspace_id: workspaceId, booking_page_id: bookingPageId }),
        }
      );

      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }

      window.open(data.url, "google-calendar-auth", "width=600,height=700");
    } catch (err: any) {
      toast.error(err.message || "Failed to start Google Calendar connection");
    }
  }, []);

  const disconnect = useCallback(async (bookingPageId: string, tokenId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-calendar-auth?action=disconnect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ booking_page_id: bookingPageId, token_id: tokenId }),
        }
      );

      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }

      qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
      qc.invalidateQueries({ queryKey: ["google-calendar-list"] });
      qc.invalidateQueries({ queryKey: ["booking-pages"] });
      toast.success("Google Calendar disconnected");
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect");
    }
  }, [qc]);

  return { connect, disconnect };
}
