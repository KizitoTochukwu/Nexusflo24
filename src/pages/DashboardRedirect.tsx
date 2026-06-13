import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { resolveRestoreTarget } from "@/lib/routeMemory";

const DashboardRedirect = () => {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: wsLoading } = useWorkspace();
  const [target, setTarget] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user || workspaces.length === 0) {
        setResolving(false);
        return;
      }
      const allowedIds = new Set(workspaces.map((w) => w.id));
      const restored = await resolveRestoreTarget(user.id, workspaces[0].id);
      if (!active) return;
      if (restored) {
        const m = restored.match(/^\/dashboard\/([^/]+)\//);
        if (m && allowedIds.has(m[1])) {
          setTarget(restored);
          setResolving(false);
          return;
        }
      }
      setTarget(`/dashboard/${workspaces[0].id}/overview`);
      setResolving(false);
    })();
    return () => {
      active = false;
    };
  }, [user, workspaces]);

  if (authLoading || wsLoading || resolving) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (target) return <Navigate to={target} replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">Setting up your workspace…</p>
      </div>
    </div>
  );
};

export default DashboardRedirect;
