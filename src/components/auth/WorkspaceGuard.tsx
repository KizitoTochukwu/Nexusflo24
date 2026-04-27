import { useEffect } from "react";
import { Navigate, useParams, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import PurchaseTracker from "@/components/analytics/PurchaseTracker";

const WorkspaceGuard = () => {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: wsLoading, setCurrentWorkspaceId } = useWorkspace();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (workspaceId) {
      setCurrentWorkspaceId(workspaceId);
    }
  }, [workspaceId, setCurrentWorkspaceId]);

  if (authLoading || wsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If no workspaceId in URL, redirect to first workspace
  if (!workspaceId) {
    if (workspaces.length > 0) {
      return <Navigate to={`/dashboard/${workspaces[0].id}/overview`} replace />;
    }
    // No workspaces yet (edge case: workspace creation may still be processing)
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Setting up your workspace…</p>
        </div>
      </div>
    );
  }

  // Check membership
  const isMember = workspaces.some((w) => w.id === workspaceId);
  if (!isMember) {
    if (workspaces.length > 0) {
      return <Navigate to={`/dashboard/${workspaces[0].id}/overview`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <PurchaseTracker />
      <Outlet />
    </>
  );
};

export default WorkspaceGuard;
