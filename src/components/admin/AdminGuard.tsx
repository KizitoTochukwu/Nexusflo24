import { Navigate, Outlet } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AdminGuard() {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading } = useIsAdmin();

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
