import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resolveRestoreTarget } from "@/lib/routeMemory";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        toast.error("Google sign-in failed, please try again.");
        navigate("/login", { replace: true });
        return;
      }

      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      const allowed = new Set((memberships ?? []).map((m) => m.workspace_id));
      const preferred = memberships?.[0]?.workspace_id;

      if (preferred) {
        const restored = await resolveRestoreTarget(session.user.id, preferred);
        if (restored) {
          const m = restored.match(/^\/dashboard\/([^/]+)\//);
          if (m && allowed.has(m[1])) {
            navigate(restored, { replace: true });
            return;
          }
        }
        navigate(`/dashboard/${preferred}/overview`, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  );
};

export default AuthCallback;
