import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard, Users, Megaphone, Workflow, LayoutTemplate,
  BarChart3, Settings, Zap, TrendingUp, Mail, MousePointerClick,
  DollarSign, ListChecks, ChevronRight, Menu, X, CreditCard, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: Users, label: "Leads" },
  { icon: Megaphone, label: "Campaigns" },
  { icon: Workflow, label: "Automations" },
  { icon: LayoutTemplate, label: "Funnels" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Settings, label: "Settings" },
];

const stats = [
  { label: "New Leads", value: "1,247", change: "+12%", icon: Users, color: "text-accent" },
  { label: "Open Rate", value: "42.8%", change: "+3.2%", icon: Mail, color: "text-accent" },
  { label: "Click Rate", value: "18.4%", change: "+1.5%", icon: MousePointerClick, color: "text-accent" },
  { label: "Revenue", value: "$34,520", change: "+22%", icon: DollarSign, color: "text-accent" },
  { label: "Tasks Due", value: "8", change: "Today", icon: ListChecks, color: "text-accent" },
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchParams] = useSearchParams();
  const { user, subscription, subLoading, refreshSubscription } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);

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
    <div className="flex min-h-screen bg-surface">
      {/* Demo banner */}
      <div className="fixed left-0 right-0 top-0 z-50 bg-accent py-2 text-center text-xs font-semibold text-accent-foreground">
        {user ? (
          <>👋 Welcome, {user.email}</>
        ) : (
          <>🎯 Demo Dashboard — Viewing sample data.{" "}
          <Link to="/register" className="underline">Start your free trial</Link></>
        )}
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-8 z-40 flex h-[calc(100vh-2rem)] flex-col border-r bg-primary transition-all duration-300 ${
          sidebarOpen ? "w-56" : "w-14"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-3">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2 text-sm font-bold text-primary-foreground">
              <Zap className="h-4 w-4 text-accent" />
              NexusFlo24
            </Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded p-1 text-primary-foreground/60 hover:text-primary-foreground">
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                item.active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-primary-foreground/60 hover:bg-sidebar-accent/50 hover:text-primary-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className={`flex-1 transition-all duration-300 pt-8 ${sidebarOpen ? "ml-56" : "ml-14"}`}>
        <div className="p-6 lg:p-8">
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Welcome back! Here's what's happening today.</p>

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

          {/* Stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
                <p className="flex items-center gap-1 text-xs text-accent">
                  <TrendingUp className="h-3 w-3" />
                  {s.change}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <h3 className="mb-4 font-semibold">Leads Over Time</h3>
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
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <h3 className="mb-4 font-semibold">Campaign Performance</h3>
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
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
