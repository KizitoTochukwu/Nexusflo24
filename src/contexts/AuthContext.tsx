import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { SubscriptionData } from "@/lib/billing/access";
import { clearLastRoute } from "@/lib/routeMemory";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionData | null;
  subLoading: boolean;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  subscription: null,
  subLoading: true,
  refreshSubscription: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  const fetchSubscription = async (userId: string) => {
    setSubLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, status, billing_cycle, current_period_end, cancel_at_period_end, stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    setSubscription(data as SubscriptionData | null);
    setSubLoading(false);
  };

  const refreshSubscription = async () => {
    if (user) await fetchSubscription(user.id);
  };

  const signOut = async () => {
    const uid = user?.id;
    await supabase.auth.signOut();
    if (uid) clearLastRoute(uid);
    setUser(null);
    setSession(null);
    setSubscription(null);
  };

  const currentUserIdRef = useRef<string | null>(null);
  const currentAccessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const applySession = (
      nextSession: Session | null,
      opts: { allowSubFetch: boolean }
    ) => {
      const nextUserId = nextSession?.user?.id ?? null;
      const nextToken = nextSession?.access_token ?? null;
      const userChanged = nextUserId !== currentUserIdRef.current;
      const tokenChanged = nextToken !== currentAccessTokenRef.current;

      // Token refresh on tab focus: keep the session fresh internally but
      // don't trigger React re-renders / downstream refetches.
      if (tokenChanged) {
        currentAccessTokenRef.current = nextToken;
        if (userChanged) setSession(nextSession);
      }

      if (userChanged) {
        currentUserIdRef.current = nextUserId;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession?.user && opts.allowSubFetch) {
          setTimeout(() => fetchSubscription(nextSession.user.id), 0);
        } else if (!nextSession?.user) {
          setSubscription(null);
          setSubLoading(false);
        }
      }
    };

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only treat these as "auth changed"; TOKEN_REFRESHED / USER_UPDATED
        // should NOT cause the dashboard to reload.
        const meaningful =
          event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT";

        if (meaningful) {
          applySession(session, { allowSubFetch: true });
          setLoading(false);
        } else {
          // Silently keep the access token ref in sync for future requests.
          if (session?.access_token) {
            currentAccessTokenRef.current = session.access_token;
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session, { allowSubFetch: true });
      setLoading(false);
      if (!session?.user) setSubLoading(false);
    });

    return () => authSub.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, subscription, subLoading, refreshSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
