import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { clearLastRoute } from "@/lib/routeMemory";

/**
 * Route memory disabled: we no longer persist or restore the last visited
 * dashboard route. This hook now only clears any stale stored entries.
 */
export function useRouteMemory() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) clearLastRoute(user.id);
  }, [user]);
}
