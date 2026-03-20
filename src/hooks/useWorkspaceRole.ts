import { useWorkspace } from "@/contexts/WorkspaceContext";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export function useWorkspaceRole(): {
  role: WorkspaceRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  canManage: boolean;
} {
  const { currentMembership } = useWorkspace();
  const role = (currentMembership?.role as WorkspaceRole) || null;

  return {
    role,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    canEdit: role === "owner" || role === "admin" || role === "member",
    canManage: role === "owner" || role === "admin",
  };
}
