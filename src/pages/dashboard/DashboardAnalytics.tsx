import { useState, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Users, Mail, MousePointerClick, TrendingUp, DollarSign, Zap,
  BarChart3, Download, Calendar, MessageCircle, Smartphone, LayoutTemplate,
  ArrowDownRight, ArrowUpRight, Target, Eye
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  useLeadAnalytics,
  useCampaignAnalytics,
  useFunnelAnalytics,
  useAutomationAnalytics,
  useRevenueAnalytics,
  type DateRange,
} from "@/hooks/useAnalytics";
import { format, subDays, subMonths } from "date-fns";

const COLORS = [
  "hsl(46 67% 52%)", "hsl(213 70% 14%)", "hsl(213 50% 25%)",
  "hsl(46 60% 70%)", "hsl(213 40% 35%)", "hsl(0 84% 60%)",
  "hsl(142 71% 45%)", "hsl(262 83% 58%)",
];

const PRESET_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 },
];

function StatCard({ label, value, change, icon: Icon, color = "text-accent" }: {
  label: string; value: string; change?: string; icon: any; color?: string;
}) {
  const isPositive = change?.startsWith("+") || !change?.startsWith("-");
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {change && (
        <p className={`flex items-center gap-1 text-xs ${isPositive ? "text-accent" : "text-destructive"}`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {change}
        </p>
      )}
    </div>
  );
}

function exportCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${r[k] ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.csv`;
  a.click();
}

const DashboardAnalytics = () => {
  const workspaceId = useWorkspaceId();
  const [rangePreset, setRangePreset] = useState(1); // 30 days default
  const [drilldown, setDrilldown] = useState<string | null>(null);

  const range: DateRange | undefined = useMemo(() => {
    const days = PRESET_RANGES[rangePreset]?.days;
    if (!days) return undefined;
    return { from: subDays(new Date(), days).toISOString(), to: new Date().toISOString() };
  }, [rangePreset]);

  const { data: leadData, isLoading: leadLoading } = useLeadAnalytics(workspaceId, range);
  const { data: campaignData, isLoading: campLoading } = useCampaignAnalytics(workspaceId, range);
  const { data: funnelData, isLoading: funnelLoading } = useFunnelAnalytics(workspaceId, range);
  const { data: autoData, isLoading: autoLoading } = useAutomationAnalytics(workspaceId, range);
  const { data: revenueData } = useRevenueAnalytics(workspaceId);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Marketing intelligence dashboard — all your data in one place.</p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={String(rangePreset)} onValueChange={(v) => setRangePreset(Number(v))}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_RANGES.map((r, i) => (
                <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="leads" className="mt-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="leads" className="gap-1.5"><Users className="h-3.5 w-3.5" />Leads</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Campaigns</TabsTrigger>
          <TabsTrigger value="funnels" className="gap-1.5"><LayoutTemplate className="h-3.5 w-3.5" />Funnels</TabsTrigger>
          <TabsTrigger value="revenue" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" />Revenue</TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Automations</TabsTrigger>
        </TabsList>

        {/* ====== LEADS ====== */}
        <TabsContent value="leads">
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" onClick={() => leadData && exportCSV(leadData.leads.map((l: any) => ({ name: l.full_name, email: l.email, source: l.source, score: l.score, status: l.status, created: l.created_at })), "leads-export")}>
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard label="Total Leads" value={String(leadData?.total ?? 0)} icon={Users} />
            <StatCard label="Conversion Rate" value={`${leadData?.conversionRate ?? 0}%`} icon={Target} />
            <StatCard label="Top Source" value={leadData?.sources[0]?.name ?? "—"} icon={TrendingUp} />
            <StatCard label="Won Deals" value={String(leadData?.statuses.find((s) => s.name === "Won")?.count ?? 0)} icon={DollarSign} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold">Lead Source Breakdown</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={leadData?.sources ?? []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.name}: ${e.count}`}>
                    {(leadData?.sources ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold">Lead Score Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={leadData?.scoreBuckets ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(46 67% 52%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-card lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold">Status Pipeline</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={leadData?.statuses ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(213 70% 14%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* ====== CAMPAIGNS ====== */}
        <TabsContent value="campaigns">
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" onClick={() => campaignData && exportCSV(campaignData.campaigns.map((c: any) => ({ name: c.name, type: c.type, sent: c.sent_count, open_rate: c.open_rate, click_rate: c.click_rate, status: c.status })), "campaigns-export")}>
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard label="Email Open Rate" value={`${campaignData?.emailOpenRate ?? 0}%`} icon={Mail} />
            <StatCard label="Email Click Rate" value={`${campaignData?.emailClickRate ?? 0}%`} icon={MousePointerClick} />
            <StatCard label="WhatsApp Reply" value={`${campaignData?.whatsappReplyRate ?? 0}%`} icon={MessageCircle} />
            <StatCard label="SMS Delivery" value={`${campaignData?.smsDeliveryRate ?? 0}%`} icon={Smartphone} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold">Messages by Channel</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={[
                    { name: "Email", count: campaignData?.emailCount ?? 0 },
                    { name: "WhatsApp", count: campaignData?.whatsappCount ?? 0 },
                    { name: "SMS", count: campaignData?.smsCount ?? 0 },
                  ]} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.name}: ${e.count}`}>
                    {[0, 1, 2].map((i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold">Campaign Performance</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={(campaignData?.campaigns ?? []).slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="sent_count" name="Sent" fill="hsl(213 70% 14%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="open_rate" name="Open %" fill="hsl(46 67% 52%)" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Drill-down table */}
            <div className="rounded-xl border bg-card p-5 shadow-card lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold">All Campaigns</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-3 py-2 font-medium text-muted-foreground">Name</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Type</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Sent</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Open %</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Click %</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Conv %</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(campaignData?.campaigns ?? []).map((c: any) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2 text-muted-foreground capitalize">{c.type}</td>
                        <td className="px-3 py-2">{c.sent_count}</td>
                        <td className="px-3 py-2">{c.open_rate}%</td>
                        <td className="px-3 py-2">{c.click_rate}%</td>
                        <td className="px-3 py-2">{c.conversion_rate}%</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "active" ? "bg-green-100 text-green-700" : c.status === "completed" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                    {!(campaignData?.campaigns?.length) && (
                      <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No campaigns yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ====== FUNNELS ====== */}
        <TabsContent value="funnels">
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" onClick={() => funnelData && exportCSV(funnelData.funnels.map((f: any) => ({ name: f.name, visitors: f.totalVisitors, converted: f.converted, conversion: f.conversionRate, objective: f.objective })), "funnels-export")}>
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard label="Total Funnel Visits" value={String(funnelData?.totalVisits ?? 0)} icon={Eye} />
            <StatCard label="Active Funnels" value={String(funnelData?.funnels.filter((f: any) => f.status === "active").length ?? 0)} icon={LayoutTemplate} />
            <StatCard label="Avg Conversion" value={
              funnelData?.funnels.length
                ? (funnelData.funnels.reduce((s: number, f: any) => s + Number(f.conversionRate), 0) / funnelData.funnels.length).toFixed(1) + "%"
                : "0%"
            } icon={Target} />
            <StatCard label="Top Funnel" value={funnelData?.funnels.sort((a: any, b: any) => b.totalVisitors - a.totalVisitors)[0]?.name ?? "—"} icon={TrendingUp} />
          </div>
          <div className="space-y-6">
            {(funnelData?.funnels ?? []).map((funnel: any) => (
              <div key={funnel.id} className="rounded-xl border bg-card p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">{funnel.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{funnel.objective?.replace("_", " ")} · {funnel.totalVisitors} visitors · {funnel.conversionRate}% conversion</p>
                  </div>
                </div>
                {/* Drop-off visualization */}
                {funnel.stepBreakdown.length > 0 && (
                  <div className="mb-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={funnel.stepBreakdown.map((s: any) => ({ name: s.step_type, visitors: s.visitors, conversions: s.conversions }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="visitors" name="Visitors" fill="hsl(213 70% 14%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="conversions" name="Converted" fill="hsl(46 67% 52%)" radius={[4, 4, 0, 0]} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {funnel.devices.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Device Breakdown</h4>
                      <div className="space-y-1">
                        {funnel.devices.map((d: any) => (
                          <div key={d.name} className="flex items-center justify-between text-sm">
                            <span className="capitalize">{d.name}</span>
                            <span className="font-medium">{d.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {funnel.utmSources.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Traffic Sources (UTM)</h4>
                      <div className="space-y-1">
                        {funnel.utmSources.slice(0, 5).map((u: any) => (
                          <div key={u.name} className="flex items-center justify-between text-sm">
                            <span>{u.name}</span>
                            <span className="font-medium">{u.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!(funnelData?.funnels.length) && (
              <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground shadow-card">No funnels created yet.</div>
            )}
          </div>
        </TabsContent>

        {/* ====== REVENUE ====== */}
        <TabsContent value="revenue">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard label="Total Revenue" value={`$${(revenueData?.totalRevenue ?? 0).toLocaleString()}`} icon={DollarSign} />
            <StatCard label="MRR" value={`$${revenueData?.mrr ?? 0}`} icon={TrendingUp} />
            <StatCard label="Est. LTV" value={`$${revenueData?.ltv ?? 0}`} icon={BarChart3} />
            <StatCard label="Payments" value={String(revenueData?.paymentEvents ?? 0)} icon={DollarSign} />
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold">Subscription Status</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Current Plan</p>
                <p className="text-lg font-bold capitalize">{revenueData?.subscription?.plan ?? "Free"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-lg font-bold capitalize">{revenueData?.subscription?.status ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Billing Cycle</p>
                <p className="text-lg font-bold capitalize">{revenueData?.subscription?.billing_cycle ?? "—"}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ====== AUTOMATIONS ====== */}
        <TabsContent value="automations">
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" onClick={() => autoData && exportCSV(autoData.automations.map((a: any) => ({ name: a.name, trigger: a.trigger_type, runs: a.run_count, logs: a.logCount, success: a.successCount, status: a.status })), "automations-export")}>
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard label="Triggers Fired" value={String(autoData?.totalTriggers ?? 0)} icon={Zap} />
            <StatCard label="Messages Sent" value={String(autoData?.messageSent ?? 0)} icon={Mail} />
            <StatCard label="Successful" value={String(autoData?.successLogs ?? 0)} icon={Target} color="text-green-600" />
            <StatCard label="Failed" value={String(autoData?.failedLogs ?? 0)} icon={ArrowDownRight} color="text-destructive" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold">Automation Performance</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={(autoData?.automations ?? []).slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="run_count" name="Runs" fill="hsl(213 70% 14%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="successCount" name="Success" fill="hsl(46 67% 52%)" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold">All Automations</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-3 py-2 font-medium text-muted-foreground">Name</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Trigger</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Runs</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(autoData?.automations ?? []).map((a: any) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{a.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.trigger_type}</td>
                        <td className="px-3 py-2">{a.run_count}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{a.status}</span>
                        </td>
                      </tr>
                    ))}
                    {!(autoData?.automations?.length) && (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No automations yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default DashboardAnalytics;
