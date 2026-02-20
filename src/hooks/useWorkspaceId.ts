import { useParams } from "react-router-dom";

export function useWorkspaceId(): string {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  if (!workspaceId) throw new Error("useWorkspaceId must be used within a workspace route");
  return workspaceId;
}
