import { useState, useMemo } from "react";
import { format } from "date-fns";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Upload, Search, Pencil, Trash2, Eye } from "lucide-react";
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, type Lead, type LeadFilters } from "@/hooks/useLeads";
import AddLeadDialog from "@/components/leads/AddLeadDialog";
import LeadDetailsDrawer from "@/components/leads/LeadDetailsDrawer";
import CsvImportDialog from "@/components/leads/CsvImportDialog";
import { useSearchParams } from "react-router-dom";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

const STATUSES = ["All", "New", "Warm", "Hot", "Won", "Lost"];
const SOURCES = ["All", "Landing Page", "WhatsApp", "Facebook Ad", "Referral", "Organic", "Other"];
const SORTS: { label: string; value: LeadFilters["sort"] }[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Highest Score", value: "highest_score" },
];

const statusColor: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Warm: "bg-amber-100 text-amber-700",
  Hot: "bg-red-100 text-red-700",
  Won: "bg-green-100 text-green-700",
  Lost: "bg-muted text-muted-foreground",
};

const DashboardLeads = () => {
  const workspaceId = useWorkspaceId();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "All";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [source, setSource] = useState("All");
  const [sort, setSort] = useState<LeadFilters["sort"]>("newest");

  const filters: LeadFilters = useMemo(() => ({
    search: search || undefined,
    status: status !== "All" ? status : undefined,
    source: source !== "All" ? source : undefined,
    sort,
  }), [search, status, source, sort]);

  const { data: leads = [], isLoading } = useLeads(workspaceId, filters);
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const [addOpen, setAddOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const handleCreate = (values: Partial<Lead>) => {
    createLead.mutate({ ...values, workspace_id: workspaceId } as any, { onSuccess: () => setAddOpen(false) });
  };

  const handleUpdate = (values: Partial<Lead>) => {
    if (!editLead) return;
    updateLead.mutate(
      { ...values, id: editLead.id, prev: { status: editLead.status }, workspace_id: workspaceId },
      { onSuccess: () => setEditLead(null) }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteLead.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track your leads. {leads.length} total.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => setAddOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as LeadFilters["sort"])}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>{SORTS.map((s) => <SelectItem key={s.value} value={s.value!}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="mt-6 rounded-xl border bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">Loading…</div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <p className="font-medium">No leads found</p>
            <p className="mt-1 text-sm">Add your first lead or import from CSV.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer" onClick={() => setDetailLead(lead)}>
                  <TableCell className="font-medium">{lead.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.source}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${lead.score >= 80 ? "text-accent" : lead.score >= 60 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {lead.score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColor[lead.status] || ""}>{lead.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {lead.last_activity_at ? format(new Date(lead.last_activity_at), "MMM d, h:mm a") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(lead.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => setDetailLead(lead)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditLead(lead)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(lead.id)} title="Delete" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={handleCreate} loading={createLead.isPending} />
      <AddLeadDialog open={!!editLead} onOpenChange={(v) => { if (!v) setEditLead(null); }} onSubmit={handleUpdate} defaultValues={editLead || undefined} loading={updateLead.isPending} />
      <LeadDetailsDrawer lead={detailLead} open={!!detailLead} onOpenChange={(v) => { if (!v) setDetailLead(null); }} workspaceId={workspaceId} />
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} workspaceId={workspaceId} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this lead and all its activities. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default DashboardLeads;
