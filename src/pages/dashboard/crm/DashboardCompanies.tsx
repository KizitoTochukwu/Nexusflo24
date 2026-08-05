import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Download, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/seo/Seo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceInvites";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import {
  useCompanies, useCompanyStats, fetchAllCompanies, COMPANY_PAGE_SIZE,
  type Company, type CompanyFilters,
} from "@/hooks/useCompanies";
import { COMPANY_SIZE_BANDS, INDUSTRIES, LIFECYCLE_STAGES, lifecycleMeta } from "@/lib/crm/constants";
import CompanyCreateDrawer from "@/components/crm/CompanyCreateDrawer";

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const DashboardCompanies = () => {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const { canEdit } = useWorkspaceRole();

  const [filters, setFilters] = useState<CompanyFilters>({ page: 0, sortKey: "created_at", sortDir: "desc" });
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, error } = useCompanies(workspaceId, filters);
  const { data: stats } = useCompanyStats(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const page = filters.page ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / (filters.pageSize ?? COMPANY_PAGE_SIZE)));

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    (members as any[]).forEach((m) => map.set(m.user_id, m.full_name || m.email || "Member"));
    return map;
  }, [members]);

  const sort = (key: string) =>
    setFilters((f) => ({ ...f, sortKey: key, sortDir: f.sortKey === key && f.sortDir === "desc" ? "asc" : "desc", page: 0 }));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllCompanies(workspaceId, filters);
      if (!all.length) { toast.error("Nothing to export with the current filters."); return; }
      const cols: (keyof Company)[] = [
        "name", "domain", "website", "industry", "size_band", "annual_revenue", "email", "phone",
        "city", "country", "lifecycle_stage", "created_at",
      ];
      const csv = [cols.join(","), ...all.map((r) => cols.map((c) => csvEscape(r[c])).join(","))].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `companies-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} companies`);
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const statCards = [
    { label: "Total companies", value: stats?.total ?? 0 },
    { label: "Customers", value: stats?.customers ?? 0 },
    { label: "Industries", value: stats?.industries ?? 0 },
    { label: "New (30 days)", value: stats?.newThisMonth ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <Seo title="Companies | NexusFlo24 CRM" description="Track the organisations behind your contacts: industry, size, owners and full account activity." />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">Account-level view of every organisation in your CRM.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" /> {exporting ? "Exporting…" : "Export"}
          </Button>
          <Button onClick={() => setCreateOpen(true)} disabled={!canEdit}>
            <Plus className="mr-2 h-4 w-4" /> New company
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, domain, industry or city…"
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 0 }))}
            aria-label="Search companies"
          />
        </div>
        <Select value={filters.industry ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, industry: v, page: 0 }))}>
          <SelectTrigger className="w-[190px]"><SelectValue placeholder="Industry" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All industries</SelectItem>
            {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.size_band ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, size_band: v, page: 0 }))}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Size" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any size</SelectItem>
            {COMPANY_SIZE_BANDS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.lifecycle_stage ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, lifecycle_stage: v, page: 0 }))}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {LIFECYCLE_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Couldn't load companies: {(error as any)?.message || "unknown error"}
        </div>
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-medium">No companies yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add the organisations your contacts belong to so you can see account-level activity in one place.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)} disabled={!canEdit}>
            <Plus className="mr-2 h-4 w-4" /> New company
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => sort("name")}>Company</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort("domain")}>Domain</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort("industry")}>Industry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const stage = lifecycleMeta(c.lifecycle_stage);
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/dashboard/${workspaceId}/crm/companies/${c.id}`)}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.domain || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.industry || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.size_band || "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className={stage.color}>{stage.label}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.owner_user_id ? memberName.get(c.owner_user_id) ?? "Member" : "Unassigned"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {total.toLocaleString()} compan{total === 1 ? "y" : "ies"} · page {page + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(0, (f.page ?? 0) - 1) }))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= pageCount}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))}>Next</Button>
            </div>
          </div>
        </>
      )}

      <CompanyCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspaceId}
        members={members as any[]}
        onCreated={(id) => navigate(`/dashboard/${workspaceId}/crm/companies/${id}`)}
      />
    </div>
  );
};

export default DashboardCompanies;
