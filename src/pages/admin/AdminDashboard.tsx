import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Users, Search, Loader2, Save, Crown } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  // Fetch all profiles (admin RLS policy allows this)
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("user_id, plan, status, billing_cycle, current_period_end, stripe_customer_id");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all roles
  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles" as any).select("user_id, role");
      if (error) throw error;
      return (data as unknown as { user_id: string; role: string }[]) || [];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      // Check if subscription exists
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("subscriptions")
          .update({ plan, status: plan === "free" ? "inactive" : "active" })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscriptions")
          .insert({ user_id: userId, plan, status: plan === "free" ? "inactive" : "active" } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success("Plan updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles" as any).insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles" as any).delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      toast.success("Role updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const subMap = new Map(subscriptions?.map((s) => [s.user_id, s]) || []);
  const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

  const filtered = (profiles || []).filter(
    (p) =>
      !search ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-accent" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold">{profiles?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Active Subscriptions</p>
            <p className="text-3xl font-bold text-accent">
              {subscriptions?.filter((s) => ["active", "trialing"].includes(s.status)).length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Admin Users</p>
            <p className="text-3xl font-bold">{roles?.filter((r) => r.role === "admin").length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            All Users
          </CardTitle>
          <CardDescription>Manage roles and billing overrides for all accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2 font-medium text-muted-foreground">User</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Plan</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Role</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const sub = subMap.get(p.id);
                    const isUserAdmin = roleMap.get(p.id) === "admin";
                    const currentPlan = sub?.plan || "free";
                    const isSelf = p.id === user?.id;

                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-3 py-3">
                          <p className="font-medium">{p.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          <Select
                            value={currentPlan}
                            onValueChange={(plan) => updatePlan.mutate({ userId: p.id, plan })}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="agency">Agency</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={sub?.status === "active" || sub?.status === "trialing" ? "default" : "secondary"}>
                            {sub?.status || "inactive"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          {isUserAdmin && (
                            <Badge className="bg-accent/20 text-accent border border-accent/30">
                              <Crown className="h-3 w-3 mr-1" />Admin
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Button
                            size="sm"
                            variant={isUserAdmin ? "destructive" : "outline"}
                            disabled={isSelf}
                            onClick={() => toggleAdmin.mutate({ userId: p.id, makeAdmin: !isUserAdmin })}
                          >
                            {isUserAdmin ? "Remove Admin" : "Make Admin"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
