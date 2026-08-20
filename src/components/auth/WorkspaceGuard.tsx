import { useEffect, useState } from "react";
import { Navigate, useParams, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import PurchaseTracker from "@/components/analytics/PurchaseTracker";

const WorkspaceGuard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { workspaces, loading: wsLoading, error, setCurrentWorkspaceId, refreshWorkspaces } = useWorkspace();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [showStuck, setShowStuck] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      setCurrentWorkspaceId(workspaceId);
    }
  }, [workspaceId, setCurrentWorkspaceId]);

  useEffect(() => {
    if (!(authLoading || wsLoading)) {
      setShowStuck(false);
      return;
    }
    const t = window.setTimeout(() => setShowStuck(true), 6000);
    return () => window.clearTimeout(t);
  }, [authLoading, wsLoading]);

  // Error state is checked outside the loading gate: fetchWorkspaces clears
  // `loading` in its finally block, so an error would otherwise fall through.
  if (error || authLoading || wsLoading) {
    if (showStuck || error) {

      return (
        <div className="flex min-h-screen items-center justify-center bg-surface p-6">
          <div className="w-full max-w-sm rounded-xl border bg-background p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <p className="text-sm font-medium text-foreground">
              {error ? "We couldn't load your workspace" : "Still loading your workspace…"}
            </p>
            {error && (
              <p className="mt-2 text-xs text-muted-foreground break-words">{error}</p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowStuck(false);
                  refreshWorkspaces();
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Retry
              </button>
              <button
                onClick={async () => {
                  await signOut();
                  navigate("/login");
                }}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      );
    }
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
