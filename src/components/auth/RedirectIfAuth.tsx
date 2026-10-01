import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

function safeNext(next: string | null): string | null {
  if (!next) return null;
  // Same-origin relative paths only.
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

const RedirectIfAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: wsLoading } = useWorkspace();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  // Fallback: if loading drags on (slow/blocked storage on mobile), show the
  // login form instead of an endless spinner.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 11000);
    return () => clearTimeout(t);
  }, []);

  if (!waited && (authLoading || (user && !next && wsLoading))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }


  if (user) {
    if (next) return <Navigate to={next} replace />;
    const preferred = workspaces[0]?.id;
    return <Navigate to={preferred ? `/dashboard/${preferred}/overview` : "/dashboard"} replace />;
  }

  return <>{children}</>;
};

export default RedirectIfAuth;

