import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ACADEMY_PENDING_COURSE_KEY } from "@/data/academyCourses";

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
    // Only genuinely new accounts get the guided setup. Existing users have no
    // onboarding row either (the table is new), so gate on account age.
    const createdAt = user?.created_at ? new Date(user.created_at).getTime() : 0;
    const isNewAccount = createdAt > 0 && Date.now() - createdAt < 3 * 24 * 60 * 60 * 1000;
    if (!onboarding && isNewAccount) return <Navigate to="/onboarding" replace />;
    const pendingCourse = localStorage.getItem(ACADEMY_PENDING_COURSE_KEY);
    if (pendingCourse !== null) {
      localStorage.removeItem(ACADEMY_PENDING_COURSE_KEY);
      const safe = pendingCourse.replace(/[^a-z0-9-]/gi, "");
      return <Navigate to={`/dashboard/${firstWorkspaceId}/academy${safe ? `/${safe}` : ""}`} replace />;
    }
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
