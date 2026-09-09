import { useState, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Upload, Search, Pencil, Trash2, Eye, MoreVertical, Sparkles, LayoutGrid, List } from "lucide-react";
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, PIPELINE_STAGES, type Lead, type LeadFilters, type PipelineStage } from "@/hooks/useLeads";
import { useQualifyLead } from "@/hooks/useQualifyLead";
import { useLeadFolders, useFolderLeadIds, useFiledLeadIds, useAssignLeadsToFolder, useRemoveLeadsFromFolder, useMoveLeadsBetweenFolders, useBulkDeleteLeads, useDeleteAllLeads } from "@/hooks/useLeadFolders";
import AddLeadDialog from "@/components/leads/AddLeadDialog";
import LeadDetailsDrawer from "@/components/leads/LeadDetailsDrawer";
import CsvImportDialog from "@/components/leads/CsvImportDialog";
import FolderPanel from "@/components/leads/FolderPanel";
import BulkActionBar from "@/components/leads/BulkActionBar";
import DeleteAllDialog from "@/components/leads/DeleteAllDialog";
import PipelineView from "@/components/leads/PipelineView";
import SmartListPanel from "@/components/leads/SmartListPanel";
import { useSearchParams } from "react-router-dom";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

const STATUSES = ["All", "New", "Warm", "Hot", "Won", "Lost"];
const SOURCES = ["All", "Landing Page", "WhatsApp", "Facebook Ad", "Referral", "Organic", "Other"];
const AI_VERDICTS = ["All", "hot", "warm", "cold", "not_qualified"];
const AI_VERDICT_LABELS: Record<string, string> = { All: "All AI", hot: "🔥 Hot", warm: "🌤 Warm", cold: "❄️ Cold", not_qualified: "⛔ Not Qualified" };
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
  const initialAiVerdict = searchParams.get("ai_verdict") || "All";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [source, setSource] = useState("All");
  const [aiVerdict, setAiVerdict] = useState(initialAiVerdict);
  const [pipelineStage, setPipelineStage] = useState<string>("All");
  const [sort, setSort] = useState<LeadFilters["sort"]>("newest");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const activeFolderId = folderFilter === "all" || folderFilter === "unfiled" ? null : folderFilter;

  const filters: LeadFilters = useMemo(() => ({
    search: search || undefined,
    status: status !== "All" ? status : undefined,
    source: source !== "All" ? source : undefined,
    pipeline_stage: pipelineStage !== "All" ? pipelineStage as PipelineStage : undefined,
    sort,
  }), [search, status, source, pipelineStage, sort]);

  const { data: allLeads = [], isLoading } = useLeads(workspaceId, filters);
  const { data: unfilteredLeads = [] } = useLeads(workspaceId, {});
  const { data: folders = [] } = useLeadFolders(workspaceId);
  const { data: folderLeadIds } = useFolderLeadIds(activeFolderId, workspaceId);
  const { data: filedLeadIds } = useFiledLeadIds(workspaceId);

  const leads = useMemo(() => {
    let filtered = allLeads;
    if (folderFilter === "unfiled") {
      const filed = new Set(filedLeadIds ?? []);
      filtered = filtered.filter((l) => !filed.has(l.id));
    } else if (activeFolderId && folderLeadIds) {
      const idSet = new Set(folderLeadIds);
      filtered = filtered.filter((l) => idSet.has(l.id));
    }
    if (aiVerdict !== "All") {
      filtered = filtered.filter((l) => (l as any).ai_qualification?.verdict === aiVerdict);
    }
    return filtered;
  }, [allLeads, folderFilter, activeFolderId, folderLeadIds, filedLeadIds, aiVerdict]);

  // Reset to first page whenever the result set changes
  useEffect(() => { setPage(1); }, [leads.length, folderFilter, search, status, source, pipelineStage, aiVerdict, sort]);

  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedLeads = useMemo(
    () => leads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [leads, currentPage]
  );

  const unfiledCount = useMemo(() => {
    const filed = new Set(filedLeadIds ?? []);
    return unfilteredLeads.filter((l) => !filed.has(l.id)).length;
  }, [unfilteredLeads, filedLeadIds]);

  const hiddenCount = Math.max(unfilteredLeads.length - leads.length, 0);
  

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus("All");
    setSource("All");
    setPipelineStage("All");
    setAiVerdict("All");
    setFolderFilter("all");
  }, []);


  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const assignToFolder = useAssignLeadsToFolder();
  const removeFromFolder = useRemoveLeadsFromFolder();
  const moveBetweenFolders = useMoveLeadsBetweenFolders();
  const bulkDelete = useBulkDeleteLeads();
  const deleteAll = useDeleteAllLeads();

  const [addOpen, setAddOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkQualifying, setBulkQualifying] = useState(false);
  const [qualifyProgress, setQualifyProgress] = useState<{ done: number; total: number } | null>(null);
  const qualifyLead = useQualifyLead();

  const handleCreate = (values: Partial<Lead>, folderId?: string) => {
    createLead.mutate({ ...values, workspace_id: workspaceId } as any, {
      onSuccess: (newLead: any) => {
        if (folderId && newLead?.id) {
          assignToFolder.mutate({ leadIds: [newLead.id], folderId, workspaceId });
        }
        setAddOpen(false);
      },
    });
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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  }, [leads, selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkDelete = () => {
    bulkDelete.mutate([...selectedIds], {
      onSuccess: () => { clearSelection(); setBulkDeleteConfirmOpen(false); },
    });
  };

  const handleMoveToFolder = (folderId: string) => {
    assignToFolder.mutate({ leadIds: [...selectedIds], folderId, workspaceId }, {
      onSuccess: clearSelection,
    });
  };

  const handleMoveBetweenFolders = (toFolderId: string) => {
    if (!activeFolderId) return;
    moveBetweenFolders.mutate(
      { leadIds: [...selectedIds], fromFolderId: activeFolderId, toFolderId, workspaceId },
      { onSuccess: clearSelection }
    );
  };

  const handleRemoveFromFolder = () => {
    if (!activeFolderId) return;
    removeFromFolder.mutate(
      { leadIds: [...selectedIds], folderId: activeFolderId, workspaceId },
      { onSuccess: clearSelection }
    );
  };

  const handleDeleteAll = () => {
    deleteAll.mutate({ workspaceId, folderId: activeFolderId || undefined }, {
      onSuccess: () => { setDeleteAllOpen(false); clearSelection(); },
    });
  };

  const handleBulkQualify = async () => {
    const ids = [...selectedIds];
    setBulkQualifying(true);
    setQualifyProgress({ done: 0, total: ids.length });
    for (let i = 0; i < ids.length; i++) {
      try {
        await qualifyLead.mutateAsync({ leadId: ids[i], workspaceId });
      } catch {
        // individual errors already toasted
      }
      setQualifyProgress({ done: i + 1, total: ids.length });
    }
    setBulkQualifying(false);
    setQualifyProgress(null);
  };

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  const getPipelineStageLabel = (stage: string) => {
    return PIPELINE_STAGES.find((s) => s.value === stage)?.label || stage;
  };

  const getPipelineStageColor = (stage: string) => {
    return PIPELINE_STAGES.find((s) => s.value === stage)?.color || "";
  };

  return (
    <>
      <div className="flex gap-6">
        <div className="hidden lg:block w-56 shrink-0 space-y-4">
          <FolderPanel
            folders={folders}
            activeFolderId={folderFilter}
            onSelectFolder={(id) => { setFolderFilter(id || "all"); clearSelection(); }}
            workspaceId={workspaceId}
            totalLeadCount={unfilteredLeads.length}
            unfiledCount={unfiledCount}
          />
          <SmartListPanel
            workspaceId={workspaceId}
            currentFilters={{ status, source, pipeline_stage: pipelineStage, ai_verdict: aiVerdict, sort: sort || "newest" }}
            onApply={(filters) => {
              setStatus(filters.status || "All");
              setSource(filters.source || "All");
              setPipelineStage(filters.pipeline_stage || "All");
              setAiVerdict(filters.ai_verdict || "All");
              setSort((filters.sort as any) || "newest");
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {activeFolder ? activeFolder.name : folderFilter === "unfiled" ? "Unfiled leads" : "All leads"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {leads.length} lead{leads.length !== 1 ? "s" : ""}{activeFolder ? ` in ${activeFolder.name}` : ""}
                {leads.length > 0 && hiddenCount > 0 && (
                  <>
                    {" · "}
                    <span>{hiddenCount} hidden by the current folder or filters</span>
                    {" "}
                    <button type="button" className="underline hover:text-foreground" onClick={clearFilters}>
                      Show all
                    </button>
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-lg border bg-card">
                <Button
                  size="sm"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  className="rounded-r-none gap-1.5"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" /> Table
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "pipeline" ? "default" : "ghost"}
                  className="rounded-l-none gap-1.5"
                  onClick={() => setViewMode("pipeline")}
                >
                  <LayoutGrid className="h-4 w-4" /> Pipeline
                </Button>
              </div>

              <div className="lg:hidden">
                <Select value={folderFilter} onValueChange={(v) => { setFolderFilter(v); clearSelection(); }}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Folder" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All leads</SelectItem>
                    <SelectItem value="unfiled">Unfiled</SelectItem>
                    {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setDeleteAllOpen(true)}
                    disabled={!activeFolder}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete all in {activeFolder ? `"${activeFolder.name}"` : "current folder"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => setCsvOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </Button>
              <Button onClick={() => setAddOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="mr-2 h-4 w-4" /> Add Lead
              </Button>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="mt-4">
              <BulkActionBar
                selectedCount={selectedIds.size}
                folders={folders}
                activeFolderId={activeFolderId}
                onMoveToFolder={handleMoveToFolder}
                onMoveBetweenFolders={handleMoveBetweenFolders}
                onRemoveFromFolder={handleRemoveFromFolder}
                onDeleteSelected={() => setBulkDeleteConfirmOpen(true)}
                onClearSelection={clearSelection}
                onBulkQualify={handleBulkQualify}
                isDeleting={bulkDelete.isPending}
                isMoving={assignToFolder.isPending || moveBetweenFolders.isPending}
                isRemoving={removeFromFolder.isPending}
                isQualifying={bulkQualifying}
                qualifyProgress={qualifyProgress}
              />
            </div>
          )}

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
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
            <Select value={pipelineStage} onValueChange={setPipelineStage}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Pipeline Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Stages</SelectItem>
                {PIPELINE_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={aiVerdict} onValueChange={setAiVerdict}>
              <SelectTrigger className="w-40"><SelectValue placeholder="AI Verdict" /></SelectTrigger>
              <SelectContent>{AI_VERDICTS.map((v) => <SelectItem key={v} value={v}>{AI_VERDICT_LABELS[v]}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as LeadFilters["sort"])}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>{SORTS.map((s) => <SelectItem key={s.value} value={s.value!}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Pipeline or Table view */}
          {viewMode === "pipeline" ? (
            <div className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-12 text-muted-foreground">Loading…</div>
              ) : (
                <PipelineView leads={leads} onLeadClick={setDetailLead} workspaceId={workspaceId} />
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border bg-card shadow-card overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center p-12 text-muted-foreground">Loading…</div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <p className="font-medium">No leads found</p>
                  <p className="mt-1 text-sm">
                    {hiddenCount > 0
                      ? `${hiddenCount} lead${hiddenCount !== 1 ? "s are" : " is"} hidden by the current folder or filters.`
                      : activeFolder
                        ? `No leads in "${activeFolder.name}". Move leads here using bulk actions.`
                        : "Add your first lead or import from CSV."}
                  </p>
                  {hiddenCount > 0 && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                      Show all leads
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={pagedLeads.length > 0 && pagedLeads.every((l) => selectedIds.has(l.id))}
                          onCheckedChange={() => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              const allSelected = pagedLeads.every((l) => next.has(l.id));
                              pagedLeads.forEach((l) => allSelected ? next.delete(l.id) : next.add(l.id));
                              return next;
                            });
                          }}
                          aria-label="Select all on this page"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pipeline</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedLeads.map((lead) => (
                      <TableRow key={lead.id} className="cursor-pointer" data-state={selectedIds.has(lead.id) ? "selected" : undefined}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                            aria-label={`Select ${lead.full_name || lead.email}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium" onClick={() => setDetailLead(lead)}>{lead.full_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground" onClick={() => setDetailLead(lead)}>{lead.email || "—"}</TableCell>
                        <TableCell className="text-muted-foreground" onClick={() => setDetailLead(lead)}>{lead.source}</TableCell>
                        <TableCell onClick={() => setDetailLead(lead)}>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${lead.score >= 80 ? "text-accent" : lead.score >= 60 ? "text-amber-600" : "text-muted-foreground"}`}>
                              {lead.score}
                            </span>
                            {(lead as any).ai_qualification?.verdict && (
                              <span title={`AI: ${(lead as any).ai_qualification.verdict}`} className="inline-flex">
                                <Sparkles className="h-3 w-3 text-accent" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => setDetailLead(lead)}>
                          <Badge variant="secondary" className={statusColor[lead.status] || ""}>{lead.status}</Badge>
                        </TableCell>
                        <TableCell onClick={() => setDetailLead(lead)}>
                          <Badge variant="outline" className={`text-[10px] ${getPipelineStageColor(lead.pipeline_stage)}`}>
                            {getPipelineStageLabel(lead.pipeline_stage)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs" onClick={() => setDetailLead(lead)}>
                          {lead.last_activity_at ? format(new Date(lead.last_activity_at), "MMM d, h:mm a") : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs" onClick={() => setDetailLead(lead)}>{format(new Date(lead.created_at), "MMM d, yyyy")}</TableCell>
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
              {viewMode === "table" && leads.length > 0 && (
                <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, leads.length)} of {leads.length} leads
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={handleCreate} loading={createLead.isPending} workspaceId={workspaceId} folders={folders} />
      <AddLeadDialog open={!!editLead} onOpenChange={(v) => { if (!v) setEditLead(null); }} onSubmit={handleUpdate} defaultValues={editLead || undefined} loading={updateLead.isPending} workspaceId={workspaceId} folders={folders} />
      <LeadDetailsDrawer lead={detailLead} open={!!detailLead} onOpenChange={(v) => { if (!v) setDetailLead(null); }} workspaceId={workspaceId} />
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} workspaceId={workspaceId} folders={folders} />
      <DeleteAllDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        onConfirm={handleDeleteAll}
        loading={deleteAll.isPending}
        context={activeFolder ? `all leads in "${activeFolder.name}"` : "leads in this folder"}
      />

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

      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Lead{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the selected leads and all their activities. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDelete.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDelete.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DashboardLeads;
