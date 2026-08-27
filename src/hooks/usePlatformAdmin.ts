import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Platform-admin tables/RPCs live outside the generated types. */
const db = supabase as any;

export type PlatformPermission = string;

/** Permissions of the signed-in staff member. Empty array = not platform staff. */
export function useMyPlatformPermissions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["platform-permissions", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await db.rpc("my_platform_permissions");
      if (error) return [] as string[];
      return ((data ?? []) as { permission_key: string }[]).map((r) =>
        typeof r === "string" ? r : r.permission_key,
      );
    },
  });
}

export function usePlatformAccess() {
  const { data: permissions = [], isLoading } = useMyPlatformPermissions();
  return {
    isLoading,
    permissions,
    isStaff: permissions.length > 0,
    can: (key: PlatformPermission) => permissions.includes(key),
  };
}

export function usePlatformStaffRoles() {
  return useQuery({
    queryKey: ["platform-staff"],
    queryFn: async () => {
      const { data, error } = await db
        .from("platform_staff_assignments")
        .select("id, user_id, role, is_active, reason, created_at, revoked_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export type PlatformMetrics = {
  total_users: number;
  new_users: number;
  verified_users: number;
  active_users: number;
  suspended_users: number;
  total_workspaces: number;
  new_workspaces: number;
  subs_active: number;
  subs_trialing: number;
  subs_past_due: number;
  subs_cancelled: number;
  mrr: number;
  plan_distribution: Record<string, number>;
  store_orders: number;
  store_orders_paid: number;
  fulfilment_projects: number;
  orders_missing_projects: number;
  user_growth: { day: string; count: number }[];
  workspace_growth: { day: string; count: number }[];
  recent_users: { id: string; email: string; created_at: string }[];
  since: string;
};

export function usePlatformMetrics(days = 30) {
  return useQuery({
    queryKey: ["platform-metrics", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await db.rpc("platform_overview_metrics", { _since: since });
      if (error) throw error;
      return data as PlatformMetrics;
    },
  });
}

export function usePlatformUsers(params: { search?: string; status?: string; page?: number; pageSize?: number }) {
  const { search = "", status = "", page = 0, pageSize = 25 } = params;
  return useQuery({
    queryKey: ["platform-users", search, status, page, pageSize],
    queryFn: async () => {
      const { data, error } = await db.rpc("platform_users_list", {
        _search: search,
        _status: status,
        _limit: pageSize,
        _offset: page * pageSize,
      });
      if (error) throw error;
      return data as { rows: any[]; total: number };
    },
  });
}

export function usePlatformWorkspaces(params: { search?: string; page?: number; pageSize?: number }) {
  const { search = "", page = 0, pageSize = 25 } = params;
  return useQuery({
    queryKey: ["platform-workspaces", search, page, pageSize],
    queryFn: async () => {
      const { data, error } = await db.rpc("platform_workspaces_list", {
        _search: search,
        _limit: pageSize,
        _offset: page * pageSize,
      });
      if (error) throw error;
      return data as { rows: any[]; total: number };
    },
  });
}

export function usePlatformPlans() {
  return useQuery({
    queryKey: ["platform-plans"],
    queryFn: async () => {
      const { data, error } = await db
        .from("platform_plans")
        .select("id, code, name, description, status, position, platform_plan_versions(*)")
        .order("position");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function usePlatformAuditLogs(limit = 100) {
  return useQuery({
    queryKey: ["platform-audit-logs", limit],
    queryFn: async () => {
      const { data, error } = await db
        .from("platform_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreditLedger(limit = 100) {
  return useQuery({
    queryKey: ["platform-credit-ledger", limit],
    queryFn: async () => {
      const { data, error } = await db
        .from("credit_adjustment_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useSupportSessions() {
  return useQuery({
    queryKey: ["platform-support-sessions"],
    queryFn: async () => {
      const { data, error } = await db
        .from("platform_support_access_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export type PlatformAction =
  | "suspend_user"
  | "reactivate_user"
  | "send_password_reset"
  | "assign_platform_role"
  | "revoke_platform_role"
  | "adjust_credits"
  | "start_support_session"
  | "end_support_session"
  | "set_sender_status"
  | "retry_workflow_run"
  | "moderate_community_content"
  | "create_fulfilment_project"
  | "update_platform_settings"
  | "record_access_review";

/** Every consequential change goes through the audited edge function. */
export function usePlatformAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { action: PlatformAction; reason: string; payload: Record<string, unknown> }) => {
      const { data, error } = await supabase.functions.invoke("platform-admin-action", { body: input });
      if (error) {
        const detail = (data as any)?.error;
        throw new Error(detail || error.message || "Action failed");
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: () => {
      for (const key of [
        "platform-users",
        "platform-workspaces",
        "platform-metrics",
        "platform-audit-logs",
        "platform-credit-ledger",
        "platform-staff",
        "platform-support-sessions",
        "platform-communications",
        "platform-sender-queue",
        "platform-automation-health",
        "platform-failed-runs",
        "platform-fulfilment",
        "platform-community-moderation",
        "platform-settings",
        "platform-access-reviews",
      ]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

function usePlatformRpc<T = any>(key: string, fn: string, args: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: [key, args],
    queryFn: async () => {
      const { data, error } = await db.rpc(fn, args);
      if (error) throw error;
      return data as T;
    },
  });
}

function useStableSince(days: number) {
  const [since] = useState(() => new Date(Date.now() - days * 86_400_000).toISOString());
  return since;
}

export function usePlatformCommunicationsMetrics(days = 30) {
  const since = useStableSince(days);
  return usePlatformRpc("platform-communications", "platform_communications_metrics", { _since: since });
}

export function usePlatformSenderQueue() {
  return usePlatformRpc("platform-sender-queue", "platform_sender_queue");
}

export function usePlatformAutomationHealth(days = 30) {
  const since = useStableSince(days);
  return usePlatformRpc("platform-automation-health", "platform_automation_health", { _since: since });
}

export function usePlatformFailedRuns(limit = 50) {
  return usePlatformRpc("platform-failed-runs", "platform_failed_runs", { _limit: limit });
}

export function usePlatformIntegrationHealth() {
  return usePlatformRpc("platform-integration-health", "platform_integration_health");
}

export function usePlatformFulfilmentOverview() {
  return usePlatformRpc("platform-fulfilment", "platform_fulfilment_overview");
}

export function usePlatformHealthJobs() {
  return usePlatformRpc("platform-health-jobs", "platform_health_jobs");
}

export function usePlatformCommunityModeration(limit = 50) {
  return usePlatformRpc("platform-community-moderation", "platform_community_moderation", { _limit: limit });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await db.from("platform_settings").select("*").order("key");
      if (error) throw error;
      return (data ?? []) as { key: string; value: any; description: string | null }[];
    },
  });
}

export function usePlatformAccessReviews(limit = 50) {
  return useQuery({
    queryKey: ["platform-access-reviews", limit],
    queryFn: async () => {
      const { data, error } = await db
        .from("platform_access_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function usePlatformStaffLastSignIn() {
  return usePlatformRpc<{ user_id: string; last_sign_in_at: string | null }[]>(
    "platform-staff-last-sign-in",
    "platform_staff_last_sign_in",
  );
}
