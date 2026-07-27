import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  APPROVAL_BY_DEFAULT,
  PERMISSION_GROUPS,
  type AccessLevel,
  type PermissionGroup,
} from "@/lib/mcp/capabilities";

export type McpConnection = {
  id: string;
  workspace_id: string;
  client_key: string;
  client_name: string | null;
  oauth_client_id: string | null;
  status: string;
  last_seen_at: string | null;
  created_at: string;
};

export type McpActivity = {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  client_key: string | null;
  oauth_client_id: string | null;
  tool_name: string;
  summary: string | null;
  risk_level: string;
  approval_status: string;
  execution_status: string;
  error_code: string | null;
  duration_ms: number | null;
  created_at: string;
};

export type McpPermission = {
  permission_group: PermissionGroup;
  access_level: AccessLevel;
  require_approval: boolean;
};

export function defaultPermissions(): McpPermission[] {
  return PERMISSION_GROUPS.map((g) => ({
    permission_group: g.key,
    access_level: "view" as AccessLevel,
    require_approval: APPROVAL_BY_DEFAULT.includes(g.key) || g.highRisk,
  }));
}

export function useAiAgentConnections(workspaceId?: string) {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [permissions, setPermissions] = useState<McpPermission[]>(defaultPermissions());
  const [activity, setActivity] = useState<McpActivity[]>([]);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const [conn, perms, acts] = await Promise.all([
      supabase.from("mcp_connections").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("mcp_tool_permissions").select("permission_group, access_level, require_approval").eq("workspace_id", workspaceId),
      supabase.from("mcp_tool_activity").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(200),
    ]);

    setConnections((conn.data ?? []) as McpConnection[]);
    setActivity((acts.data ?? []) as McpActivity[]);

    const saved = (perms.data ?? []) as McpPermission[];
    setPermissions(
      defaultPermissions().map((d) => saved.find((s) => s.permission_group === d.permission_group) ?? d),
    );
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePermission = useCallback(
    async (group: PermissionGroup, patch: Partial<Pick<McpPermission, "access_level" | "require_approval">>) => {
      if (!workspaceId) return { error: new Error("No workspace") };
      const current = permissions.find((p) => p.permission_group === group)!;
      const next = { ...current, ...patch };
      setPermissions((prev) => prev.map((p) => (p.permission_group === group ? next : p)));
      const { error } = await supabase.from("mcp_tool_permissions").upsert(
        {
          workspace_id: workspaceId,
          permission_group: group,
          access_level: next.access_level,
          require_approval: next.require_approval,
        },
        { onConflict: "workspace_id,permission_group" },
      );
      if (error) void load();
      return { error };
    },
    [workspaceId, permissions, load],
  );

  const disconnect = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("mcp_connections").delete().eq("id", id);
      if (!error) setConnections((prev) => prev.filter((c) => c.id !== id));
      return { error };
    },
    [],
  );

  return { loading, connections, permissions, activity, reload: load, savePermission, disconnect };
}
