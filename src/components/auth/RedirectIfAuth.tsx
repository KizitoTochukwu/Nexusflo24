import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const RedirectIfAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: wsLoading } = useWorkspace();

  if (authLoading || (user && wsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (user) {
    const preferred = workspaces[0]?.id;
    return <Navigate to={preferred ? `/dashboard/${preferred}/overview` : "/dashboard"} replace />;
  }

  return <>{children}</>;
};

export default RedirectIfAuth;
