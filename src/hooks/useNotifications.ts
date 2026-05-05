import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  meta: Record<string, unknown>;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Notification[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications-unread", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const key = ["notifications", user?.id];
      const unreadKey = ["notifications-unread", user?.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Notification[]>(key);
      const previousUnread = qc.getQueryData<number>(unreadKey);
      if (previous) {
        const removed = previous.find((n) => n.id === id);
        qc.setQueryData<Notification[]>(key, previous.filter((n) => n.id !== id));
        if (removed && !removed.read && typeof previousUnread === "number") {
          qc.setQueryData<number>(unreadKey, Math.max(0, previousUnread - 1));
        }
      }
      return { previous, previousUnread };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["notifications", user?.id], ctx.previous);
      if (typeof ctx?.previousUnread === "number") {
        qc.setQueryData(["notifications-unread", user?.id], ctx.previousUnread);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useDeleteAllNotifications() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onMutate: async () => {
      const key = ["notifications", user?.id];
      const unreadKey = ["notifications-unread", user?.id];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Notification[]>(key);
      const previousUnread = qc.getQueryData<number>(unreadKey);
      qc.setQueryData<Notification[]>(key, []);
      qc.setQueryData<number>(unreadKey, 0);
      return { previous, previousUnread };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["notifications", user?.id], ctx.previous);
      if (typeof ctx?.previousUnread === "number") {
        qc.setQueryData(["notifications-unread", user?.id], ctx.previousUnread);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("user_id", user!.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

/** Watches the notification poll and fires browser push for new items when the tab is hidden. */
export function useNotificationWatcher() {
  const { data: notifications } = useNotifications();
  const { notify } = usePushNotifications();
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const latestTs = notifications[0].created_at;

    // First mount — seed the ref without firing
    if (lastSeenRef.current === null) {
      lastSeenRef.current = latestTs;
      return;
    }

    // Nothing new
    if (latestTs <= lastSeenRef.current) return;

    // Fire browser notifications only when tab is hidden
    if (document.hidden) {
      const newItems = notifications.filter(
        (n) => !n.read && n.created_at > lastSeenRef.current!
      );
      for (const n of newItems) {
        notify(n.title, n.body ?? undefined);
      }
    }

    lastSeenRef.current = latestTs;
  }, [notifications, notify]);
}
