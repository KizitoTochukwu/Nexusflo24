import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

      // Find user's first workspace to redirect to
      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (memberships && memberships.length > 0) {
        navigate(`/dashboard/${memberships[0].workspace_id}/overview`, { replace: true });
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
