import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users, Mail, MousePointerClick, DollarSign,
  TrendingUp, CreditCard, Loader2, ChevronRight, Zap, Rocket, FileDown, Send, Info,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import LockedFeature from "@/components/billing/LockedFeature";
import { usePlanGating } from "@/hooks/usePlanGating";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useDemoMode } from "@/hooks/useDemoMode";

const workflowNodes = [
  { label: "Form Submitted", type: "trigger" },
  { label: "AI Score Lead", type: "action" },
  { label: "Send Email", type: "action" },
  { label: "WhatsApp Follow-up", type: "action" },
  { label: "Tag as Warm", type: "condition" },
  { label: "Notify Sales", type: "action" },
];

const Dashboard = () => {
  const workspaceId = useWorkspaceId();
  const [searchParams] = useSearchParams();
  const { user, subscription, refreshSubscription } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { data: metrics, isLoading } = useDashboardMetrics(workspaceId);
  const { data: demoSettings } = useDemoMode(workspaceId);
  const { isPro, isAgency, isFree } = usePlanGating();

  const isDemoMode = demoSettings?.demo_mode_enabled ?? false;

  useEffect(() => {
    const isNewSignup = localStorage.getItem("nexusflo_new_signup");
    if (isNewSignup) {
      setShowWelcome(true);
      localStorage.removeItem("nexusflo_new_signup");
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Subscription activated! Welcome aboard 🎉");
      refreshSubscription();
    }
  }, [searchParams]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const planLabel = subscription?.plan === "agency" ? "Agency" : subscription?.plan === "pro" ? "Pro" : "Free";
  const statusLabel = subscription?.status === "trialing" ? "Trial" : subscription?.status === "active" ? "Active" : subscription?.status || "—";

  const hasNoData = metrics && !metrics.isDemo && metrics.totalLeads === 0 && !metrics.hasCampaignData;

  const formatRevenue = (val: number | null | undefined) => {
    if (val == null) return "—";
    return `$${val.toLocaleString()}`;
  };

  const stats = [
    {
      label: "New Leads (Today)",
      value: metrics?.newLeadsToday?.toString() ?? "0",
      change: `${metrics?.totalLeads ?? 0} total`,
      icon: Users,
      color: "text-accent",
      to: `/dashboard/${workspaceId}/leads?status=New`,
    },
    {
      label: "Open Rate",
      value: metrics?.hasEmailData ? `${metrics.openRate}%` : "—",
      change: metrics?.hasEmailData ? "From delivered messages" : "Connect email to unlock",
      icon: Mail,
      color: "text-accent",
      to: `/dashboard/${workspaceId}/analytics`,
    },
    {
      label: "Click Rate",
      value: metrics?.hasEmailData ? `${metrics.clickRate}%` : "—",
      change: metrics?.hasEmailData ? "From delivered messages" : "Connect email to unlock",
      icon: MousePointerClick,
      color: "text-accent",
      to: `/dashboard/${workspaceId}/analytics`,
    },
    {
      label: "Revenue",
      value: formatRevenue(metrics?.revenue),
      change: metrics?.revenue != null ? "Total tracked" : "Connect payments to track revenue",
      icon: DollarSign,
      color: "text-accent",
      to: `/dashboard/${workspaceId}/analytics`,
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        {isDemoMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-700 gap-1 cursor-help">
                  <Info className="h-3 w-3" />
                  Demo Data
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">Analytics are simulated for demo purposes. Disable Demo Mode in Settings to see real data.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Welcome back! Here's what's happening today.</p>

      {showWelcome && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-4">
          <p className="text-sm font-semibold text-accent">🎉 Welcome to NexusFlo24!</p>
          <p className="mt-1 text-xs text-muted-foreground">Your account is all set. Explore your dashboard, set up automations, and start growing!</p>
          <button onClick={() => setShowWelcome(false)} className="mt-2 text-xs font-medium text-accent hover:underline">Dismiss</button>
        </div>
      )}

      {/* Billing Card */}
      {user && (
        <div className="mt-6 rounded-xl border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-semibold">
                  Plan: <span className="text-accent">{planLabel}</span>
                  {subscription?.status && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{statusLabel}</span>}
                </p>
                {subscription?.current_period_end && (
                  <p className="text-xs text-muted-foreground">
                    Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                    {subscription.cancel_at_period_end && " (cancels at end)"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {(!subscription || subscription.plan === "free" || subscription.status === "canceled") && (
                <Link to="/pricing">
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-gold-dark">Upgrade</Button>
                </Link>
              )}
              {subscription?.stripe_customer_id && (
                <Button size="sm" variant="outline" disabled={portalLoading} onClick={handleManageBilling}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage Billing"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="rounded-xl border bg-card p-4 shadow-card transition-shadow hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {s.value !== "—" && <TrendingUp className="h-3 w-3 text-accent" />}
              {s.change}
            </p>
          </Link>
        ))}
      </div>

      {/* Getting Started - shown when no data and not demo */}
      {hasNoData && (
        <div className="mt-8 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-6">
          <h3 className="font-semibold flex items-center gap-2"><Rocket className="h-5 w-5 text-accent" /> Getting Started</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your workspace is empty. Start by adding data to see real metrics here.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to={`/dashboard/${workspaceId}/funnels`}>
              <Button size="sm" variant="outline" className="gap-1"><Zap className="h-3.5 w-3.5" /> Create Funnel</Button>
            </Link>
            <Link to={`/dashboard/${workspaceId}/leads`}>
              <Button size="sm" variant="outline" className="gap-1"><FileDown className="h-3.5 w-3.5" /> Import Leads</Button>
            </Link>
            <Link to={`/dashboard/${workspaceId}/campaigns`}>
              <Button size="sm" variant="outline" className="gap-1"><Send className="h-3.5 w-3.5" /> Send First Campaign</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-card overflow-hidden">
          <h3 className="mb-4 font-semibold">Leads Over Time</h3>
          {metrics && (metrics.totalLeads > 0 || metrics.isDemo) ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics.leadsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <RechartTooltip />
                <Line type="monotone" dataKey="leads" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center">
              <p className="text-sm text-muted-foreground">No leads yet. <Link to={`/dashboard/${workspaceId}/leads`} className="text-accent hover:underline">Add your first lead</Link>.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-card overflow-hidden">
          <h3 className="mb-4 font-semibold">Campaign Performance</h3>
          {metrics?.hasCampaignData ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.campaignChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <RechartTooltip />
                <Bar dataKey="sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicked" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center">
              <p className="text-sm text-muted-foreground text-center">Campaign analytics will appear here once you send campaigns.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent leads */}
      <div className="mt-8 rounded-xl border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Leads</h3>
          <Link to={`/dashboard/${workspaceId}/leads`} className="text-xs text-accent hover:underline">View all →</Link>
        </div>
        {!metrics?.recentLeads?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">No leads yet. <Link to={`/dashboard/${workspaceId}/leads`} className="text-accent hover:underline">Add your first lead</Link>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Source</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Score</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentLeads.map((lead: any) => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="px-3 py-3 font-medium">{lead.full_name || lead.email || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{lead.source || "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold ${(lead.score ?? 0) >= 80 ? "text-accent" : (lead.score ?? 0) >= 60 ? "text-amber-600" : "text-muted-foreground"}`}>{lead.score ?? 0}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        lead.status === "Hot" ? "bg-red-100 text-red-700" :
                        lead.status === "Warm" ? "bg-amber-100 text-amber-700" :
                        lead.status === "Won" ? "bg-green-100 text-green-700" :
                        "bg-muted text-muted-foreground"
                      }`}>{lead.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workflow preview */}
      <LockedFeature locked={isFree} featureName="Automation Workflows">
        <div className="mt-8 rounded-xl border bg-card p-6 shadow-card">
          <h3 className="mb-4 font-semibold">Automation Workflow Preview</h3>
          <div className="flex flex-wrap items-center gap-2">
            {workflowNodes.map((node, i) => (
              <div key={node.label} className="flex items-center gap-2">
                <div className={`rounded-lg border px-4 py-2 text-xs font-medium ${
                  node.type === "trigger" ? "border-accent bg-accent/10 text-accent" :
                  node.type === "condition" ? "border-amber-600 bg-amber-50 text-amber-700" :
                  "border-border bg-muted"
                }`}>{node.label}</div>
                {i < workflowNodes.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      </LockedFeature>

      {/* Agency-only */}
      <LockedFeature locked={!isAgency} featureName="Advanced Analytics" requiredPlan="agency">
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <h4 className="text-sm font-medium text-muted-foreground">Client Revenue</h4>
            <p className="mt-1 text-2xl font-bold text-accent">$0</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <h4 className="text-sm font-medium text-muted-foreground">Team Activity</h4>
            <p className="mt-1 text-2xl font-bold">0 actions</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <h4 className="text-sm font-medium text-muted-foreground">Automation ROI</h4>
            <p className="mt-1 text-2xl font-bold text-accent">—</p>
          </div>
        </div>
      </LockedFeature>
    </DashboardLayout>
  );
};

export default Dashboard;
