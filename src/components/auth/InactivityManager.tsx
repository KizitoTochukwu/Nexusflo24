import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import InactivityWarningDialog from "@/components/auth/InactivityWarningDialog";

const InactivityManager = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate("/login", { replace: true });
  }, [signOut, navigate]);

  const { showWarning, stayLoggedIn, logoutNow } = useInactivityTimeout({
    isAuthenticated: !!user,
    onLogout: handleLogout,
  });

  return (
    <InactivityWarningDialog
      open={showWarning}
      onStay={stayLoggedIn}
      onLogout={logoutNow}
    />
  );
};

export default InactivityManager;
