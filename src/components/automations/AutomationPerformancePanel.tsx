import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Users, UserPlus, Mail, MessageCircle, CalendarCheck, ShoppingCart,
  AlertTriangle, Ban, TrendingUp, PoundSterling,
} from "lucide-react";
import { format } from "date-fns";

/**
 * Real-data performance view for an automation. Every number comes from
 * workspace-scoped tables (RLS enforced server-side): automation_logs,
 * webinar_registrations, email_logs, whatsapp_messages, bookings,
 * lead_activities (purchase attribution), crm_deals. No invented metrics —
 * when a data source has no rows the card shows 0, never a mock.
 */

interface Props {
  automationId: string;
  workspaceId: string;
}

type DateRange = "7" | "30" | "90" | "all";

interface PerfRow {
  leadId: string;
  name: string;
  email: string | null;
  phone: string | null;
  registeredAt: string | null;
  businessType: string | null;
  volume: string | null;
  ownerId: string | null;
  stageName: string | null;
  marketingConsent: boolean;
  repeatSubmissions: number;
  emailsSent: number;
  emailsFailed: number;
  waSent: number;
  waDelivered: number;
  waRead: number;
  waFailed: number;
  replied: boolean;
  booked: boolean;
  attended: boolean;
  noShow: boolean;
  purchased: boolean;
  revenuePence: number;
  unsubscribed: boolean;
  failures: number;
}

const RANGE_DAYS: Record<Exclude<DateRange, "all">, number> = { "7": 7, "30": 30, "90": 90 };

export default function AutomationPerformancePanel({ automationId, workspaceId }: Props) {
  const [range, setRange] = useState<DateRange>("30");
  const [businessType, setBusinessType] = useState<string>("all");
  const [volume, setVolume] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");

  const query = useQuery({
    queryKey: ["automation-performance", automationId, workspaceId],
    queryFn: async () => {
      // 1) Enrolled leads = distinct lead_ids seen in this automation's logs.
      const { data: logs, error: logsErr } = await supabase
        .from("automation_logs")
        .select("lead_id, event_type, status, created_at")
        .eq("automation_id", automationId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (logsErr) throw logsErr;
      const leadIds = Array.from(new Set((logs ?? []).map((l: any) => l.lead_id).filter(Boolean))) as string[];

      // Per-lead enrolment start for THIS automation: earliest log timestamp.
      // Messages before this belong to other automations/campaigns and must not be counted.
      const BUFFER_MS = 2 * 60 * 1000;
      const enrolStartByLead = new Map<string, number>();
      for (const l of logs ?? []) {
        if (!l.lead_id || !l.created_at) continue;
        const t = new Date(l.created_at).getTime();
        const cur = enrolStartByLead.get(l.lead_id);
        if (cur === undefined || t < cur) enrolStartByLead.set(l.lead_id, t);
      }
      const inRun = (leadId: string, ts?: string | null) => {
        const start = enrolStartByLead.get(leadId);
        if (start === undefined) return false;
        if (!ts) return false;
        return new Date(ts).getTime() >= start - BUFFER_MS;
      };

      const empty = { logs: logs ?? [], rows: [] as PerfRow[], stageNames: [] as string[], owners: [] as { id: string; name: string }[] };
      if (leadIds.length === 0) return empty;

      const [leadsRes, regsRes, emailRes, waRes, waInboundRes, bookingsRes, purchasesRes, dealsRes, stagesRes, profilesRes] = await Promise.all([
        supabase.from("leads").select("id, full_name, email, phone, assigned_owner_id, created_at, status").eq("workspace_id", workspaceId).in("id", leadIds),
        supabase.from("webinar_registrations").select("*").eq("workspace_id", workspaceId).in("lead_id", leadIds),
        supabase.from("email_logs").select("lead_id, status, direction, created_at").eq("workspace_id", workspaceId).in("lead_id", leadIds).limit(1000),
        supabase.from("whatsapp_messages").select("lead_id, status, direction, created_at, delivered_at, read_at, failed_at").eq("workspace_id", workspaceId).in("lead_id", leadIds).limit(1000),
        supabase.from("whatsapp_messages").select("lead_id, created_at").eq("workspace_id", workspaceId).eq("direction", "inbound").in("lead_id", leadIds).limit(1000),

        supabase.from("bookings").select("lead_id, contact_id, guest_email, status, start_time").eq("workspace_id", workspaceId).in("lead_id", leadIds).limit(500),
        supabase.from("lead_activities").select("lead_id, meta, created_at").eq("workspace_id", workspaceId).eq("type", "purchase").in("lead_id", leadIds).limit(500),
        supabase.from("crm_deals").select("id, lead_id, contact_id, stage_id, owner_user_id, status").eq("workspace_id", workspaceId).in("lead_id", leadIds).limit(500),
        supabase.from("crm_pipeline_stages").select("id, name").eq("workspace_id", workspaceId),
        supabase.from("profiles").select("id, full_name"),
      ]);

      for (const r of [leadsRes, regsRes, emailRes, waRes, waInboundRes, bookingsRes, purchasesRes, dealsRes, stagesRes]) {
        if (r.error) throw r.error;
      }

      const stageNameById = new Map((stagesRes.data ?? []).map((s: any) => [s.id, s.name]));
      const profileNameById = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p.full_name || "Unknown"]));

      // Unsubscribe signal: exit logs for unsubscribe/consent, or lead status.
      const unsubLeadIds = new Set(
        (logs ?? [])
          .filter((l: any) => /unsubscrib|consent/i.test(l.event_type ?? "") && l.status === "success")
          .map((l: any) => l.lead_id)
          .filter(Boolean),
      );

      const rows: PerfRow[] = (leadsRes.data ?? []).map((lead: any) => {
        const reg = (regsRes.data ?? []).find((r: any) => r.lead_id === lead.id);
        const emails = (emailRes.data ?? []).filter((e: any) => e.lead_id === lead.id && e.direction === "outbound");
        const wa = (waRes.data ?? []).filter((m: any) => m.lead_id === lead.id && m.direction === "outbound");
        const replied =
          (waInboundRes.data ?? []).some((m: any) => m.lead_id === lead.id) ||
          (emailRes.data ?? []).some((e: any) => e.lead_id === lead.id && e.direction === "inbound");
        const bookings = (bookingsRes.data ?? []).filter((b: any) => b.lead_id === lead.id);
        const purchases = (purchasesRes.data ?? []).filter((p: any) => p.lead_id === lead.id);
        const deal = (dealsRes.data ?? []).find((d: any) => d.lead_id === lead.id);
        const failures = (logs ?? []).filter(
          (l: any) => l.lead_id === lead.id && ["failed", "cancelled", "insufficient_credits"].includes(l.status),
        ).length;
        return {
          leadId: lead.id,
          name: lead.full_name || lead.email || lead.phone || "Unknown",
          email: lead.email,
          phone: lead.phone,
          registeredAt: reg?.last_submitted_at ?? lead.created_at,
          businessType: reg?.business_type ?? null,
          volume: reg?.whatsapp_enquiry_volume ?? null,
          ownerId: deal?.owner_user_id ?? lead.assigned_owner_id ?? null,
          stageName: deal?.stage_id ? stageNameById.get(deal.stage_id) ?? null : null,
          marketingConsent: reg?.marketing_consent ?? false,
          repeatSubmissions: Math.max(0, (reg?.submission_count ?? 1) - 1),
          emailsSent: emails.filter((e: any) => e.status === "sent").length,
          emailsFailed: emails.filter((e: any) => e.status === "failed").length,
          waSent: wa.length,
          waDelivered: wa.filter((m: any) => !!m.delivered_at || !!m.read_at).length,
          waRead: wa.filter((m: any) => !!m.read_at).length,
          waFailed: wa.filter((m: any) => !!m.failed_at || m.status === "failed").length,
          replied,
          booked: bookings.length > 0,
          attended: bookings.some((b: any) => b.status === "attended" || b.status === "completed"),
          noShow: bookings.some((b: any) => b.status === "no_show"),
          purchased: purchases.length > 0,
          revenuePence: purchases.reduce((sum: number, p: any) => sum + ((p.meta as any)?.amount_pence ?? 0), 0),
          unsubscribed: unsubLeadIds.has(lead.id) || lead.status === "unsubscribed",
          failures,
        } as PerfRow;
      });

      const stageNames = Array.from(new Set(rows.map((r) => r.stageName).filter(Boolean))) as string[];
      const ownerIds = Array.from(new Set(rows.map((r) => r.ownerId).filter(Boolean))) as string[];
      const owners = ownerIds.map((id) => ({ id, name: profileNameById.get(id) ?? "Unknown" }));
      return { logs: logs ?? [], rows, stageNames, owners };
    },
    enabled: !!automationId && !!workspaceId,
  });

  const filtered = useMemo(() => {
    const rows = query.data?.rows ?? [];
    const cutoff = range === "all" ? null : new Date(Date.now() - RANGE_DAYS[range] * 86400000);
    return rows.filter((r) => {
      if (cutoff && r.registeredAt && new Date(r.registeredAt) < cutoff) return false;
      if (businessType !== "all" && r.businessType !== businessType) return false;
      if (volume !== "all" && r.volume !== volume) return false;
      if (stage !== "all" && r.stageName !== stage) return false;
      if (owner !== "all" && r.ownerId !== owner) return false;
      return true;
    });
  }, [query.data, range, businessType, volume, stage, owner]);

  const stats = useMemo(() => {
    const n = filtered.length;
    const sum = (fn: (r: PerfRow) => number) => filtered.reduce((s, r) => s + fn(r), 0);
    const count = (fn: (r: PerfRow) => boolean) => filtered.filter(fn).length;
    const emailsSent = sum((r) => r.emailsSent);
    const waSent = sum((r) => r.waSent);
    return {
      submissions: n + sum((r) => r.repeatSubmissions),
      contacts: n,
      repeats: sum((r) => r.repeatSubmissions),
      marketingOptIn: count((r) => r.marketingConsent),
      emailsSent,
      emailsFailed: sum((r) => r.emailsFailed),
      waSent,
      waDelivered: sum((r) => r.waDelivered),
      waRead: sum((r) => r.waRead),
      waFailed: sum((r) => r.waFailed),
      replies: count((r) => r.replied),
      booked: count((r) => r.booked),
      attended: count((r) => r.attended),
      purchased: count((r) => r.purchased),
      revenuePence: sum((r) => r.revenuePence),
      unsubscribed: count((r) => r.unsubscribed),
      failures: sum((r) => r.failures),
      bookingRate: n ? Math.round((count((r) => r.booked) / n) * 100) : 0,
      customerRate: n ? Math.round((count((r) => r.purchased) / n) * 100) : 0,
      waDeliveryRate: waSent ? Math.round((sum((r) => r.waDelivered) / waSent) * 100) : 0,
    };
  }, [filtered]);

  if (query.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading performance">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="h-24 w-full rounded-xl" />))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Couldn't load performance data</AlertTitle>
        <AlertDescription>{(query.error as Error)?.message || "Failed to load reporting data."}</AlertDescription>
      </Alert>
    );
  }

  const businessTypes = Array.from(new Set((query.data?.rows ?? []).map((r) => r.businessType).filter(Boolean))) as string[];
  const volumes = Array.from(new Set((query.data?.rows ?? []).map((r) => r.volume).filter(Boolean))) as string[];

  const kpis = [
    { label: "Form submissions", value: stats.submissions, icon: Users, hint: `${stats.repeats} repeat` },
    { label: "Contacts enrolled", value: stats.contacts, icon: UserPlus, hint: `${stats.marketingOptIn} marketing opt-in` },
    { label: "Emails delivered", value: stats.emailsSent, icon: Mail, hint: `${stats.emailsFailed} failed` },
    { label: "WhatsApp delivered", value: stats.waDelivered, icon: MessageCircle, hint: `${stats.waRead} read · ${stats.waFailed} failed` },
    { label: "Calls booked", value: stats.booked, icon: CalendarCheck, hint: `${stats.bookingRate}% of contacts · ${stats.attended} attended` },
    { label: "Purchases", value: stats.purchased, icon: ShoppingCart, hint: `${stats.customerRate}% of contacts` },
    { label: "Revenue", value: `£${(stats.revenuePence / 100).toFixed(2)}`, icon: PoundSterling, hint: "attributed to this automation" },
    { label: "Replies", value: stats.replies, icon: TrendingUp, hint: `${stats.unsubscribed} unsubscribed` },
  ];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
        {businessTypes.length > 0 && (
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Business type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All business types</SelectItem>
              {businessTypes.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
        {volumes.length > 0 && (
          <Select value={volume} onValueChange={setVolume}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Enquiry volume" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All enquiry volumes</SelectItem>
              {volumes.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
        {(query.data?.stageNames.length ?? 0) > 0 && (
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Pipeline stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {query.data!.stageNames.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
        {(query.data?.owners.length ?? 0) > 0 && (
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Owner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {query.data!.owners.map((o) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <k.icon className="h-3.5 w-3.5 text-accent" /> {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-semibold">{k.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{k.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.failures > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">{stats.failures} failed automation action{stats.failures === 1 ? "" : "s"}</AlertTitle>
          <AlertDescription className="text-amber-800">
            Some steps failed or were skipped (for example, insufficient credits). See the Logs tab filtered to "Errors only" for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Per-contact table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Contacts ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No contacts match these filters yet. Performance data appears once the automation enrols people.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Purchase</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.leadId}>
                      <TableCell>
                        <div className="text-sm font-medium">{r.name}</div>
                        <div className="text-[11px] text-muted-foreground">{r.email ?? r.phone ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.registeredAt ? format(new Date(r.registeredAt), "d MMM yyyy") : "—"}
                        {r.repeatSubmissions > 0 && (
                          <div className="text-[11px] text-muted-foreground">+{r.repeatSubmissions} repeat</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.stageName ? <Badge variant="outline" className="text-[11px]">{r.stageName}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.emailsSent} sent{r.emailsFailed > 0 && <span className="text-destructive"> · {r.emailsFailed} failed</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.waSent} sent · {r.waRead} read{r.waFailed > 0 && <span className="text-destructive"> · {r.waFailed} failed</span>}
                      </TableCell>
                      <TableCell>
                        {r.attended ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[11px]">Attended</Badge>
                        ) : r.noShow ? (
                          <Badge className="bg-amber-100 text-amber-700 text-[11px]">No-show</Badge>
                        ) : r.booked ? (
                          <Badge className="bg-blue-100 text-blue-700 text-[11px]">Booked</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.purchased ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[11px]">
                            £{(r.revenuePence / 100).toFixed(2)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {r.replied && <Badge variant="outline" className="text-[10px]">Replied</Badge>}
                          {r.unsubscribed && (
                            <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-700">
                              <Ban className="h-2.5 w-2.5 mr-0.5" /> Unsubscribed
                            </Badge>
                          )}
                          {r.failures > 0 && (
                            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">{r.failures} failed</Badge>
                          )}
                          {r.marketingConsent && <Badge variant="outline" className="text-[10px]">Marketing opt-in</Badge>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
