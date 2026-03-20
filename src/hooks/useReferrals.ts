import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReferralStats {
  totalClicks: number;
  totalSignups: number;
  totalConverted: number;
  totalRewardCredits: number;
  referrals: any[];
}

export function useReferrals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ReferralStats> => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const referrals = data || [];

      return {
        totalClicks: referrals.length,
        totalSignups: referrals.filter((r: any) => r.status === "signed_up" || r.status === "converted").length,
        totalConverted: referrals.filter((r: any) => r.status === "converted").length,
        totalRewardCredits: referrals.reduce((sum: number, r: any) => sum + (r.reward_credits || 0), 0),
        referrals,
      };
    },
  });
}
