import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        toast.error("Google sign-in failed, please try again.");
        navigate(next ? `/login?next=${encodeURIComponent(next)}` : "/login", { replace: true });
        return;
      }

      if (next) {
        window.location.replace(next);
        return;
      }

      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      const preferred = memberships?.[0]?.workspace_id;

      if (preferred) {
        navigate(`/dashboard/${preferred}/overview`, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    };

    handleCallback();
  }, [navigate, next]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  );
};

export default AuthCallback;

