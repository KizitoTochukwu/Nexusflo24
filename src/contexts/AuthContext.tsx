import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { SubscriptionData } from "@/lib/billing/access";

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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSubscription(null);
  };

  const syncAdminRole = async () => {
    try {
      await supabase.rpc("sync_admin_role");
    } catch {
      // Fail silently — default to user role
    }
  };

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          await syncAdminRole();
          setTimeout(() => fetchSubscription(session.user.id), 0);
        } else {
          setSubscription(null);
          setSubLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        await syncAdminRole();
        fetchSubscription(session.user.id);
      } else {
        setSubLoading(false);
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, subscription, subLoading, refreshSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
