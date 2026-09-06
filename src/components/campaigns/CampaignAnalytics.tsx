import { useCampaigns, useCampaignMessages, type Campaign } from "@/hooks/useCampaigns";
import { useWorkspaceCampaignMetrics } from "@/hooks/useCampaignMetrics";
import { resolveCampaignMetrics } from "@/lib/campaigns/metrics";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { Send, Eye, MousePointerClick, TrendingUp, Mail, MessageSquare, Phone, Zap, Radio } from "lucide-react";

const CHANNEL_COLORS: Record<string, string> = {
  email: "hsl(213 70% 14%)",
  whatsapp: "hsl(160 60% 45%)",
  sms: "hsl(46 67% 52%)",
  "multi-channel": "hsl(280 60% 55%)",
};

const PIE_COLORS = Object.values(CHANNEL_COLORS);

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function CampaignAnalytics() {
  const workspaceId = useWorkspaceId();
  const { data: campaigns } = useCampaigns(workspaceId);
  const { data: metricsMap } = useWorkspaceCampaignMetrics(workspaceId);

  const all = campaigns ?? [];
  const metricsFor = (c: Campaign) => resolveCampaignMetrics(c, metricsMap?.[c.id]);
  const totalSent = all.reduce((s, c) => s + metricsFor(c).sent, 0);
  const avgOpenRate = all.length ? all.reduce((s, c) => s + metricsFor(c).openRate, 0) / all.length : 0;
  const avgClickRate = all.length ? all.reduce((s, c) => s + metricsFor(c).clickRate, 0) / all.length : 0;
  const avgConversion = all.length ? all.reduce((s, c) => s + c.conversion_rate, 0) / all.length : 0;
  const broadcastCount = all.filter(c => (c.campaign_mode || "broadcast") === "broadcast").length;
  const triggeredCount = all.filter(c => c.campaign_mode === "triggered").length;

  // Channel distribution for pie
  const channelMap: Record<string, number> = {};
  all.forEach((c) => { channelMap[c.type] = (channelMap[c.type] || 0) + 1; });
  const channelData = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

  // Per-channel performance
  const channelPerf: Record<string, { sent: number; opens: number; clicks: number; count: number }> = {};
  all.forEach((c) => {
    const m = metricsFor(c);
    if (!channelPerf[c.type]) channelPerf[c.type] = { sent: 0, opens: 0, clicks: 0, count: 0 };
    channelPerf[c.type].sent += m.sent;
    channelPerf[c.type].opens += m.openRate;
    channelPerf[c.type].clicks += m.clickRate;
    channelPerf[c.type].count++;
  });
  const channelPerfData = Object.entries(channelPerf).map(([channel, d]) => ({
    channel,
    sent: d.sent,
    avgOpen: d.count ? +((d.opens / d.count) * 100).toFixed(1) : 0,
    avgClick: d.count ? +((d.clicks / d.count) * 100).toFixed(1) : 0,
  }));

  // Recent campaigns for bar chart (last 8)
  const recentBar = all.slice(0, 8).reverse().map((c) => {
    const m = metricsFor(c);
    return {
      name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
      sent: m.sent,
      openRate: +(m.openRate * 100).toFixed(1),
      clickRate: +(m.clickRate * 100).toFixed(1),
    };
  });


  if (all.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground shadow-card">
        No campaign data yet. Create your first campaign to see analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Send className="h-5 w-5" />} label="Total Sent" value={totalSent.toLocaleString()} />
        <MetricCard icon={<Eye className="h-5 w-5" />} label="Avg Open Rate" value={`${(avgOpenRate * 100).toFixed(1)}%`} />
        <MetricCard icon={<MousePointerClick className="h-5 w-5" />} label="Avg Click Rate" value={`${(avgClickRate * 100).toFixed(1)}%`} />
        <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Avg Conversion" value={`${(avgConversion * 100).toFixed(1)}%`} />
      </div>

      {/* Mode breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><Radio className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Broadcast Campaigns</p>
            <p className="text-xl font-bold text-foreground">{broadcastCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><Zap className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Triggered Automations</p>
            <p className="text-xl font-bold text-foreground">{triggeredCount}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar chart */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Campaign Performance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={recentBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="sent" fill="hsl(213 70% 14%)" name="Sent" radius={[4, 4, 0, 0]} />
              <Bar dataKey="openRate" fill="hsl(46 67% 52%)" name="Open %" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clickRate" fill="hsl(160 60% 45%)" name="Click %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Channel Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {channelData.map((entry, i) => (
                  <Cell key={i} fill={CHANNEL_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel Performance Comparison */}
      {channelPerfData.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Channel Performance Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4">Channel</th>
                  <th className="py-2 pr-4">Total Sent</th>
                  <th className="py-2 pr-4">Avg Open Rate</th>
                  <th className="py-2 pr-4">Avg Click Rate</th>
                </tr>
              </thead>
              <tbody>
                {channelPerfData.map((row) => (
                  <tr key={row.channel} className="border-b last:border-0">
                    <td className="py-2 pr-4 capitalize font-medium">{row.channel}</td>
                    <td className="py-2 pr-4">{row.sent.toLocaleString()}</td>
                    <td className="py-2 pr-4">{row.avgOpen}%</td>
                    <td className="py-2 pr-4">{row.avgClick}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
