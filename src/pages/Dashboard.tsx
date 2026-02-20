import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Users, Mail, MousePointerClick, DollarSign, ListChecks,
  TrendingUp, CreditCard, Loader2, ChevronRight, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const stats = [
  { label: "New Leads", value: "1,247", change: "+12%", icon: Users, color: "text-accent", to: "/dashboard/leads" },
  { label: "Open Rate", value: "42.8%", change: "+3.2%", icon: Mail, color: "text-accent", to: "/dashboard/analytics" },
  { label: "Click Rate", value: "18.4%", change: "+1.5%", icon: MousePointerClick, color: "text-accent", to: "/dashboard/analytics" },
  { label: "Revenue", value: "$34,520", change: "+22%", icon: DollarSign, color: "text-accent", to: "/dashboard/analytics" },
  { label: "Tasks Due", value: "8", change: "Today", icon: ListChecks, color: "text-accent", to: "/dashboard/automations" },
];

const leadsData = [
  { day: "Mon", leads: 42 }, { day: "Tue", leads: 58 }, { day: "Wed", leads: 35 },
  { day: "Thu", leads: 72 }, { day: "Fri", leads: 65 }, { day: "Sat", leads: 28 },
  { day: "Sun", leads: 45 },
];

const campaignData = [
  { name: "Email Blast", sent: 4500, opened: 1890, clicked: 720 },
  { name: "WhatsApp Promo", sent: 2100, opened: 1470, clicked: 630 },
  { name: "SMS Flash", sent: 3200, opened: 2240, clicked: 480 },
  { name: "Newsletter", sent: 5800, opened: 2610, clicked: 870 },
];

const recentLeads = [
  { name: "Emma Wilson", source: "Landing Page", score: 92, status: "Hot" },
  { name: "John Carter", source: "WhatsApp", score: 78, status: "Warm" },
  { name: "Lisa Chen", source: "Facebook Ad", score: 85, status: "Hot" },
  { name: "Mark Davis", source: "Referral", score: 64, status: "Warm" },
  { name: "Sarah Kim", source: "Organic", score: 45, status: "Cold" },
];

const workflowNodes = [
  { label: "Form Submitted", type: "trigger" },
  { label: "AI Score Lead", type: "action" },
  { label: "Send Email", type: "action" },
  { label: "WhatsApp Follow-up", type: "action" },
  { label: "Tag as Warm", type: "condition" },
  { label: "Notify Sales", type: "action" },
];

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, subscription, refreshSubscription } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

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

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      <p className="text-sm text-muted-foreground">Welcome back! Here's what's happening today.</p>

      {showWelcome && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-4">
          <p className="text-sm font-semibold text-accent">🎉 Welcome to NexusFlo24!</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your account is all set. Explore your dashboard, set up automations, and start growing!
          </p>
          <button onClick={() => setShowWelcome(false)} className="mt-2 text-xs font-medium text-accent hover:underline">
            Dismiss
          </button>
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
                  {subscription?.status && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{statusLabel}</span>
                  )}
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
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-gold-dark">
                    Upgrade
                  </Button>
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

      {/* Stats - clickable KPI cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="rounded-xl border bg-card p-4 shadow-card transition-shadow hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
            <p className="flex items-center gap-1 text-xs text-accent">
              <TrendingUp className="h-3 w-3" />
              {s.change}
            </p>
          </Link>
        ))}
      </div>

      {/* Charts - contained with pointer-events */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="relative rounded-xl border bg-card p-6 shadow-card overflow-hidden">
          <h3 className="mb-4 font-semibold">Leads Over Time</h3>
          <div className="pointer-events-auto">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={leadsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="hsl(46 67% 52%)" strokeWidth={2} dot={{ fill: "hsl(46 67% 52%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="relative rounded-xl border bg-card p-6 shadow-card overflow-hidden">
          <h3 className="mb-4 font-semibold">Campaign Performance</h3>
          <div className="pointer-events-auto">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="sent" fill="hsl(213 70% 14%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" fill="hsl(213 50% 25%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicked" fill="hsl(46 67% 52%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent leads table */}
      <div className="mt-8 rounded-xl border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-semibold">Recent Leads</h3>
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
              {recentLeads.map((lead) => (
                <tr key={lead.name} className="border-b last:border-0">
                  <td className="px-3 py-3 font-medium">{lead.name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{lead.source}</td>
                  <td className="px-3 py-3">
                    <span className={`font-semibold ${lead.score >= 80 ? "text-accent" : lead.score >= 60 ? "text-gold-dark" : "text-muted-foreground"}`}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      lead.status === "Hot" ? "bg-accent/10 text-accent" :
                      lead.status === "Warm" ? "bg-gold-light/20 text-gold-dark" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow preview */}
      <div className="mt-8 rounded-xl border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-semibold">Automation Workflow Preview</h3>
        <div className="flex flex-wrap items-center gap-2">
          {workflowNodes.map((node, i) => (
            <div key={node.label} className="flex items-center gap-2">
              <div className={`rounded-lg border px-4 py-2 text-xs font-medium ${
                node.type === "trigger" ? "border-accent bg-accent/10 text-accent" :
                node.type === "condition" ? "border-gold-dark bg-gold-light/10 text-gold-dark" :
                "border-border bg-muted"
              }`}>
                {node.label}
              </div>
              {i < workflowNodes.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
