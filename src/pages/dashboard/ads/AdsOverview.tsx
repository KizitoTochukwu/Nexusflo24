import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Banknote, Eye, MousePointerClick, Percent, Users, Coins, BadgeCheck, Target,
  CalendarCheck, TrendingUp, Gauge, Megaphone, Sparkles, ArrowRight, TriangleAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useAdCampaigns, useAdAccounts, useAdMetrics, useAdAttribution, useAdConnections,
} from "@/hooks/useAds";
import { useSeedAdsDemo } from "@/hooks/useAdsDemo";
import {
  DATE_PRESETS, resolveRange, iso, sumMetrics, pctChange, groupByProvider,
  groupByCampaign, seriesByDate, formatMoney, formatNumber, formatPct,
  type DateRangePreset,
} from "@/lib/ads/metrics";
import { AD_PROVIDERS, CHANNEL_COLORS, METRIC_TOOLTIPS, type AdProvider } from "@/lib/ads/constants";
import { KpiCard, ProviderBadge, StatusPill, AdsEmptyState, CardSkeletonGrid } from "@/components/ads/AdsPrimitives";
import { format } from "date-fns";

export default function AdsOverview() {
  const workspaceId = useWorkspaceId();
  const [preset, setPreset] = useState<DateRangePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [channel, setChannel] = useState<"all" | AdProvider>("all");
  const [accountId, setAccountId] = useState("all");
  const [status, setStatus] = useState("all");

  const range = useMemo(
    () => resolveRange(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo],
  );

  const { data: connections = [] } = useAdConnections(workspaceId);
  const { data: accounts = [] } = useAdAccounts(workspaceId);
  const { data: campaigns = [], isLoading: campaignsLoading } = useAdCampaigns(workspaceId);
  const { data: rows = [], isLoading } = useAdMetrics(workspaceId, range);
  const { data: attribution = [] } = useAdAttribution(workspaceId);
  const seed = useSeedAdsDemo();

  const campaignById = useMemo(
    () => Object.fromEntries(campaigns.map((c) => [c.id, c])),
    [campaigns],
  );

  const filtered = useMemo(() => rows.filter((r) => {
    if (channel !== "all" && r.provider !== channel) return false;
    if (accountId !== "all" && r.ad_account_id !== accountId) return false;
    if (status !== "all" && campaignById[r.campaign_id]?.status !== status) return false;
    return true;
  }), [rows, channel, accountId, status, campaignById]);

  const fromIso = iso(range.from);
  const toIso = iso(range.to);
  const prevFromIso = iso(range.prevFrom);
  const prevToIso = iso(range.prevTo);

  const current = useMemo(() => filtered.filter((r) => r.date >= fromIso && r.date <= toIso), [filtered, fromIso, toIso]);
  const previous = useMemo(() => filtered.filter((r) => r.date >= prevFromIso && r.date <= prevToIso), [filtered, prevFromIso, prevToIso]);

  const totals = useMemo(() => sumMetrics(current), [current]);
  const prevTotals = useMemo(() => sumMetrics(previous), [previous]);

  const byProvider = useMemo(() => groupByProvider(current), [current]);
  const byCampaign = useMemo(() => groupByCampaign(current), [current]);
  const series = useMemo(() => seriesByDate(current), [current]);

  const channelChart = useMemo(
    () => Object.entries(byProvider).map(([provider, t]) => ({
      name: AD_PROVIDERS[provider as AdProvider]?.shortLabel ?? provider,
      provider,
      spend: Math.round(t.spend),
      leads: t.leads,
    })),
    [byProvider],
  );

  const campaignRows = useMemo(() => Object.entries(byCampaign)
    .map(([id, t]) => ({ id, campaign: campaignById[id], ...t }))
    .filter((r) => r.campaign)
    .sort((a, b) => b.spend - a.spend), [byCampaign, campaignById]);

  const bestCampaigns = useMemo(
    () => [...campaignRows].filter((r) => r.leads > 0).sort((a, b) => b.roas - a.roas).slice(0, 3),
    [campaignRows],
  );
  const needsAttention = useMemo(
    () => [...campaignRows]
      .filter((r) => r.spend > 0 && (r.leads === 0 || r.cpl > (totals.cpl || 0) * 1.4))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 3),
    [campaignRows, totals.cpl],
  );

  const recentLeads = useMemo(() => attribution.slice(0, 8), [attribution]);

  const funnel = [
    { label: "Impressions", value: totals.impressions },
    { label: "Clicks", value: totals.clicks },
    { label: "Leads", value: totals.leads },
    { label: "Qualified leads", value: totals.qualifiedLeads },
    { label: "Appointments", value: totals.appointments },
    { label: "Won deals", value: totals.wonDeals },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  const hasData = rows.length > 0 || campaigns.length > 0;

  if (!isLoading && !campaignsLoading && !hasData) {
    return (
      <div className="space-y-4 pb-10">
        <Header />
        <AdsEmptyState
          icon={Megaphone}
          title="Connect your first ad account"
          description="Link Meta, Google or LinkedIn Ads to see spend, leads, appointments and attributed revenue in one place. You can also load sample data to explore the Ads Hub first."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild><Link to="../accounts">Connect an ad account</Link></Button>
              <Button variant="outline" className="gap-2" disabled={seed.isPending} onClick={() => seed.mutate(workspaceId)}>
                <Sparkles className="h-4 w-4" /> Load sample data
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <Header />

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[150px] space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date range</label>
            <Select value={preset} onValueChange={(v) => setPreset(v as DateRangePreset)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[70]">
                {DATE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {preset === "custom" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-[150px]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-[150px]" />
              </div>
            </>
          )}

          <div className="min-w-[140px] space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Channel</label>
            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[70]">
                <SelectItem value="all">All channels</SelectItem>
                {Object.values(AD_PROVIDERS).map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[170px] space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Ad account</label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[70]">
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[140px] space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Campaign status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[70]">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="ml-auto text-xs text-muted-foreground">
            {format(range.from, "d MMM")} – {format(range.to, "d MMM yyyy")} · compared with {format(range.prevFrom, "d MMM")} – {format(range.prevTo, "d MMM")}
          </p>
        </CardContent>
      </Card>

      {/* KPIs */}
      {isLoading ? <CardSkeletonGrid count={8} /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Ad spend" icon={Banknote} value={formatMoney(totals.spend)} hint={METRIC_TOOLTIPS.spend} change={pctChange(totals.spend, prevTotals.spend)} />
          <KpiCard label="Impressions" icon={Eye} value={formatNumber(totals.impressions)} hint={METRIC_TOOLTIPS.impressions} change={pctChange(totals.impressions, prevTotals.impressions)} />
          <KpiCard label="Clicks" icon={MousePointerClick} value={formatNumber(totals.clicks)} hint={METRIC_TOOLTIPS.clicks} change={pctChange(totals.clicks, prevTotals.clicks)} />
          <KpiCard label="CTR" icon={Percent} value={formatPct(totals.ctr)} hint={METRIC_TOOLTIPS.ctr} change={pctChange(totals.ctr, prevTotals.ctr)} />
          <KpiCard label="Leads" icon={Users} value={formatNumber(totals.leads)} hint={METRIC_TOOLTIPS.leads} change={pctChange(totals.leads, prevTotals.leads)} />
          <KpiCard label="Cost per lead" icon={Coins} value={formatMoney(totals.cpl)} hint={METRIC_TOOLTIPS.cpl} change={pctChange(totals.cpl, prevTotals.cpl)} invertChange />
          <KpiCard label="Qualified leads" icon={BadgeCheck} value={formatNumber(totals.qualifiedLeads)} hint={METRIC_TOOLTIPS.qualifiedLeads} change={pctChange(totals.qualifiedLeads, prevTotals.qualifiedLeads)} />
          <KpiCard label="Cost per qualified lead" icon={Target} value={formatMoney(totals.cpql)} hint={METRIC_TOOLTIPS.cpql} change={pctChange(totals.cpql, prevTotals.cpql)} invertChange />
          <KpiCard label="Booked appointments" icon={CalendarCheck} value={formatNumber(totals.appointments)} hint={METRIC_TOOLTIPS.appointments} change={pctChange(totals.appointments, prevTotals.appointments)} />
          <KpiCard label="Revenue attributed" icon={TrendingUp} value={formatMoney(totals.revenue)} hint={METRIC_TOOLTIPS.revenue} change={pctChange(totals.revenue, prevTotals.revenue)} />
          <KpiCard label="ROAS" icon={Gauge} value={`${totals.roas.toFixed(2)}x`} hint={METRIC_TOOLTIPS.roas} change={pctChange(totals.roas, prevTotals.roas)} />
          <KpiCard label="Won deals" icon={BadgeCheck} value={formatNumber(totals.wonDeals)} change={pctChange(totals.wonDeals, prevTotals.wonDeals)} />
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spend by channel</CardTitle>
            <CardDescription>Where your budget went during this period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {channelChart.length === 0 ? <NoChartData /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
                    {channelChart.map((c) => (
                      <Cell key={c.provider} fill={CHANNEL_COLORS[c.provider as AdProvider] ?? "hsl(213 70% 14%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leads by channel</CardTitle>
            <CardDescription>Share of ad leads captured into the CRM.</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {channelChart.length === 0 ? <NoChartData /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelChart} dataKey="leads" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {channelChart.map((c) => (
                      <Cell key={c.provider} fill={CHANNEL_COLORS[c.provider as AdProvider] ?? "hsl(213 70% 14%)"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attribution funnel */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attribution funnel</CardTitle>
          <CardDescription>From impression to revenue — {formatMoney(totals.revenue)} attributed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnel.map((step, i) => {
            const prev = i === 0 ? null : funnel[i - 1].value;
            const rate = prev ? (prev > 0 ? (step.value / prev) * 100 : 0) : null;
            return (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{step.label}</span>
                  <span className="text-muted-foreground">
                    {formatNumber(step.value)}{rate != null && ` · ${rate.toFixed(1)}% of previous step`}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${Math.max(2, (step.value / funnelMax) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Best / attention */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Best performing campaigns</CardTitle>
            <CardDescription>Highest return on ad spend this period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bestCampaigns.length === 0 && <p className="py-4 text-sm text-muted-foreground">Not enough data yet.</p>}
            {bestCampaigns.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.campaign!.name}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(r.leads)} leads · {formatMoney(r.cpl)} CPL</p>
                </div>
                <Badge className="shrink-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">{r.roas.toFixed(2)}x ROAS</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="h-4 w-4 text-amber-500" /> Campaigns requiring attention
            </CardTitle>
            <CardDescription>Spending without leads, or well above your average cost per lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {needsAttention.length === 0 && <p className="py-4 text-sm text-muted-foreground">Everything looks healthy.</p>}
            {needsAttention.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.campaign!.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(r.spend)} spent · {r.leads === 0 ? "no leads yet" : `${formatMoney(r.cpl)} CPL`}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link to={`../campaigns/${r.id}`}>Review</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Campaign performance table */}
      <Card className="border-border/60">
        <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base">Campaign performance</CardTitle>
            <CardDescription>Every campaign active in the selected period.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link to="../campaigns">All campaigns <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignRows.slice(0, 8).map((r) => (
                  <TableRow key={r.id} className="cursor-pointer">
                    <TableCell className="max-w-[240px] truncate font-medium">
                      <Link to={`../campaigns/${r.id}`} className="hover:underline">{r.campaign!.name}</Link>
                    </TableCell>
                    <TableCell><ProviderBadge provider={r.campaign!.provider} /></TableCell>
                    <TableCell><StatusPill status={r.campaign!.status} /></TableCell>
                    <TableCell className="text-right">{formatMoney(r.spend)}</TableCell>
                    <TableCell className="text-right">{formatNumber(r.leads)}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.cpl)}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.revenue)}</TableCell>
                    <TableCell className="text-right font-medium">{r.roas.toFixed(2)}x</TableCell>
                  </TableRow>
                ))}
                {campaignRows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No campaign activity in this period.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent ad leads */}
      <Card className="border-border/60">
        <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base">Recent ad leads</CardTitle>
            <CardDescription>Latest people captured from advertising.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link to="../attribution">Attribution <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentLeads.length === 0 && <p className="py-4 text-sm text-muted-foreground">No ad leads recorded yet.</p>}
          {recentLeads.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.lead_name || l.lead_email || "Unnamed lead"}</p>
                <p className="truncate text-xs text-muted-foreground">{l.campaign_name} · {l.creative_name}</p>
              </div>
              <div className="flex items-center gap-2">
                {l.is_qualified && <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-700">Qualified</Badge>}
                {l.has_appointment && <Badge variant="outline" className="text-[11px]">Booked</Badge>}
                <ProviderBadge provider={l.provider} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ads Overview</h1>
        <p className="text-sm text-muted-foreground">
          Spend, leads, appointments and attributed revenue across every advertising channel.
        </p>
      </div>
    </div>
  );
}

function NoChartData() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      No data for the selected filters.
    </div>
  );
}
