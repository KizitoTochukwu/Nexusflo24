import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { resolveRestoreTarget } from "@/lib/routeMemory";

const RedirectIfAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: wsLoading } = useWorkspace();
  const [target, setTarget] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user || wsLoading) return;
    setResolving(true);
    (async () => {
      const allowedIds = new Set(workspaces.map((w) => w.id));
      const preferred = workspaces[0]?.id;
      const restored = preferred ? await resolveRestoreTarget(user.id, preferred) : null;
      if (!active) return;
      if (restored) {
        const m = restored.match(/^\/dashboard\/([^/]+)\//);
        if (m && allowedIds.has(m[1])) {
          setTarget(restored);
          setResolving(false);
          return;
        }
      }
      setTarget(preferred ? `/dashboard/${preferred}/overview` : "/dashboard");
      setResolving(false);
    })();
    return () => {
      active = false;
    };
  }, [user, wsLoading, workspaces]);

  if (authLoading || (user && (wsLoading || resolving))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (user && target) return <Navigate to={target} replace />;

  return <>{children}</>;
};

export default RedirectIfAuth;
