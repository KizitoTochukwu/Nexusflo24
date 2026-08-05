import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/seo/Seo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceInvites";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import {
  useContacts, useContactStats, useBulkUpdateContacts, useUpdateContact,
  fetchAllContacts, type Contact, type ContactFilters,
} from "@/hooks/useContacts";
import {
  CONTACT_PAGE_SIZE, DEFAULT_CONTACT_COLUMNS, type ContactColumnKey,
} from "@/lib/crm/constants";
import ContactFiltersBar from "@/components/crm/ContactFiltersBar";
import ContactColumnPicker from "@/components/crm/ContactColumnPicker";
import ContactBulkBar from "@/components/crm/ContactBulkBar";
import ContactsTable from "@/components/crm/ContactsTable";
import ContactCreateDrawer from "@/components/crm/ContactCreateDrawer";
import type { CrmSavedView } from "@/hooks/useCrmSavedViews";

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const DashboardContacts = () => {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const { canEdit, canManage } = useWorkspaceRole();

  const [filters, setFilters] = useState<ContactFilters>({ page: 0, sortKey: "created_at", sortDir: "desc" });
  const [columns, setColumns] = useState<ContactColumnKey[]>(DEFAULT_CONTACT_COLUMNS);
  const [selected, setSelected] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, error } = useContacts(workspaceId, filters);
  const { data: stats } = useContactStats(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const bulk = useBulkUpdateContacts();
  const updateContact = useUpdateContact();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? CONTACT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const sources = useMemo(
    () => Array.from(new Set(rows.map((r) => r.source).filter(Boolean) as string[])).sort(),
    [rows]
  );
  const tags = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => r.tags ?? []))).sort(),
    [rows]
  );

  const onSort = (key: ContactColumnKey) => {
    setFilters((f) => ({
      ...f,
      sortKey: key,
      sortDir: f.sortKey === key && f.sortDir === "desc" ? "asc" : "desc",
      page: 0,
    }));
  };

  const applyView = (view: CrmSavedView) => {
    setFilters({ ...(view.filters as ContactFilters), page: 0 });
    if (view.columns?.length) setColumns(view.columns as ContactColumnKey[]);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllContacts(workspaceId, filters);
      if (!all.length) { toast.error("Nothing to export with the current filters."); return; }
      const cols: (keyof Contact)[] = [
        "full_name", "first_name", "last_name", "email", "phone", "whatsapp_number",
        "company_name", "job_title", "lifecycle_stage", "score", "source",
        "consent_status", "tags", "owner_user_id", "created_at", "last_activity_at",
      ];
      const csv = [
        cols.join(","),
        ...all.map((r) => cols.map((c) => csvEscape(r[c])).join(",")),
      ].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} contacts`);
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const statCards = [
    { label: "Total contacts", value: stats?.total ?? 0 },
    { label: "Sales ready", value: stats?.salesReady ?? 0 },
    { label: "Customers", value: stats?.customers ?? 0 },
    { label: "New (30 days)", value: stats?.newThisMonth ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <Seo title="Contacts | NexusFlo24 CRM" description="Manage every person in your CRM: filter, segment, and act on contacts across email, SMS and WhatsApp." noindex />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">Every person in your CRM, with full history and one-click follow-up.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" /> {exporting ? "Exporting…" : "Export"}
          </Button>
          <Button onClick={() => setCreateOpen(true)} disabled={!canEdit}>
            <Plus className="mr-2 h-4 w-4" /> New contact
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
        <div className="min-w-[240px] flex-1">
          <ContactFiltersBar
            workspaceId={workspaceId}
            filters={filters}
            onChange={setFilters}
            members={members as any[]}
            sources={sources}
            tags={tags}
            columns={columns}
            onApplyView={applyView}
          />
        </div>
        <ContactColumnPicker value={columns} onChange={setColumns} />
      </div>

      <ContactBulkBar
        selectedCount={selected.length}
        members={members as any[]}
        canManage={canManage}
        busy={bulk.isPending}
        onClear={() => setSelected([])}
        onAssignOwner={(uid) => bulk.mutate({ ids: selected, workspaceId, patch: { owner_user_id: uid } })}
        onSetStage={(stage) => bulk.mutate({ ids: selected, workspaceId, patch: { lifecycle_stage: stage } })}
        onAddTag={(tag) => bulk.mutate({ ids: selected, workspaceId, addTags: [tag] })}
        onArchive={() => bulk.mutate({ ids: selected, workspaceId, archive: true }, { onSuccess: () => setSelected([]) })}
      />

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Couldn't load contacts: {(error as any)?.message || "unknown error"}
        </div>
      ) : !isLoading && rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-medium">No contacts match this view</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add a contact manually, import a CSV, or capture new people automatically through your forms and funnels.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => setCreateOpen(true)} disabled={!canEdit}>
              <Plus className="mr-2 h-4 w-4" /> New contact
            </Button>
            <Button variant="outline" onClick={() => navigate(`/dashboard/${workspaceId}/leads`)}>
              Import from Leads
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ContactsTable
            workspaceId={workspaceId}
            rows={rows}
            columns={columns}
            loading={isLoading}
            selected={selected}
            onSelect={setSelected}
            sortKey={filters.sortKey}
            sortDir={filters.sortDir}
            onSort={onSort}
            members={members as any[]}
            canEdit={canEdit}
            onInlineSave={(contact, patch) =>
              updateContact.mutate({ id: contact.id, prev: contact, silent: true, ...patch })
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {total.toLocaleString()} contact{total === 1 ? "" : "s"} · page {page + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm" disabled={page === 0}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(0, (f.page ?? 0) - 1) }))}
              >
                Previous
              </Button>
              <Button
                variant="outline" size="sm" disabled={page + 1 >= pageCount}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <ContactCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspaceId}
        members={members as any[]}
        onCreated={(id) => navigate(`/dashboard/${workspaceId}/crm/contacts/${id}`)}
      />
    </div>
  );
};

export default DashboardContacts;
