import { useCampaigns, type Campaign } from "@/hooks/useCampaigns";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Send, Eye, MousePointerClick, TrendingUp } from "lucide-react";

const CHANNEL_COLORS = ["hsl(213 70% 14%)", "hsl(46 67% 52%)", "hsl(160 60% 45%)", "hsl(280 60% 55%)"];

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

  const all = campaigns ?? [];
  const totalSent = all.reduce((s, c) => s + c.sent_count, 0);
  const avgOpenRate = all.length ? all.reduce((s, c) => s + c.open_rate, 0) / all.length : 0;
  const avgClickRate = all.length ? all.reduce((s, c) => s + c.click_rate, 0) / all.length : 0;
  const avgConversion = all.length ? all.reduce((s, c) => s + c.conversion_rate, 0) / all.length : 0;

  // Channel distribution for pie
  const channelMap: Record<string, number> = {};
  all.forEach((c) => { channelMap[c.type] = (channelMap[c.type] || 0) + 1; });
  const channelData = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

  // Recent campaigns for bar chart (last 8)
  const recentBar = all.slice(0, 8).reverse().map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    sent: c.sent_count,
    openRate: +(c.open_rate * 100).toFixed(1),
    clickRate: +(c.click_rate * 100).toFixed(1),
  }));

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
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Channel Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {channelData.map((_, i) => (
                  <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
