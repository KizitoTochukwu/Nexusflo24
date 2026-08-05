import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useOnboarding } from "@/hooks/useOnboarding";

const DashboardRedirect = () => {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: wsLoading } = useWorkspace();
  const firstWorkspaceId = workspaces[0]?.id;
  const { data: onboarding, isLoading: onboardingLoading } = useOnboarding(firstWorkspaceId);

  if (authLoading || wsLoading || (firstWorkspaceId && onboardingLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (firstWorkspaceId) {
    // New users (no onboarding record yet) get the guided setup first.
    if (!onboarding) return <Navigate to="/onboarding" replace />;
    return <Navigate to={`/dashboard/${firstWorkspaceId}/overview`} replace />;
  }

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
