import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import Seo from "@/components/seo/Seo";
import SidebarLogo from "@/components/brand/SidebarLogo";

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: wsLoading } = useWorkspace();

  if (authLoading || wsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!workspaces.length) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-surface">
      <Seo title="Get started | NexusFlo24" description="Set up your NexusFlo24 workspace in a few guided steps." />
      <header className="flex h-14 items-center border-b bg-primary px-4 sm:px-6">
        <SidebarLogo collapsed={false} />
      </header>
      <OnboardingWizard workspaceId={workspaces[0].id} />
    </div>
  );
};

export default Onboarding;
