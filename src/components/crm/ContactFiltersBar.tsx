import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, Save, Search, Star, Trash2, X } from "lucide-react";
import { LIFECYCLE_STAGES, CONSENT_STATUSES } from "@/lib/crm/constants";
import type { ContactFilters } from "@/hooks/useContacts";
import { useSavedViews, useCreateSavedView, useDeleteSavedView, type CrmSavedView } from "@/hooks/useCrmSavedViews";

type Member = { user_id: string; profile?: { full_name?: string | null; email?: string | null } | null };

type Props = {
  workspaceId: string;
  filters: ContactFilters;
  onChange: (next: ContactFilters) => void;
  members: Member[];
  sources: string[];
  tags: string[];
  columns: string[];
  onApplyView: (view: CrmSavedView) => void;
};

const ContactFiltersBar = ({ workspaceId, filters, onChange, members, sources, tags, columns, onApplyView }: Props) => {
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [shared, setShared] = useState(false);
  const { data: views = [] } = useSavedViews(workspaceId);
  const createView = useCreateSavedView();
  const deleteView = useDeleteSavedView();

  const set = (patch: Partial<ContactFilters>) => onChange({ ...filters, ...patch, page: 0 });

  const activeCount = [
    filters.lifecycle_stage && filters.lifecycle_stage !== "all",
    filters.owner_user_id && filters.owner_user_id !== "all",
    filters.source && filters.source !== "all",
    filters.consent_status && filters.consent_status !== "all",
    filters.company,
    filters.tags?.length,
    typeof filters.scoreMin === "number",
    typeof filters.scoreMax === "number",
    filters.createdFrom,
    filters.createdTo,
    filters.activityFrom,
    filters.includeArchived,
  ].filter(Boolean).length;

  const toggleTag = (t: string) => {
    const current = filters.tags ?? [];
    set({ tags: current.includes(t) ? current.filter((x) => x !== t) : [...current, t] });
  };

  const memberLabel = (m: Member) => m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search ?? ""}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search name, email, phone, company…"
          className="pl-9"
          aria-label="Search contacts"
        />
        {filters.search && (
          <button
            onClick={() => set({ search: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeCount > 0 && <Badge className="ml-2 h-5 px-1.5">{activeCount}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[340px] max-h-[70vh] overflow-y-auto">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Lifecycle stage</Label>
                <Select value={filters.lifecycle_stage ?? "all"} onValueChange={(v) => set({ lifecycle_stage: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {LIFECYCLE_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Owner</Label>
                <Select value={filters.owner_user_id ?? "all"} onValueChange={(v) => set({ owner_user_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Anyone</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{memberLabel(m)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Select value={filters.source ?? "all"} onValueChange={(v) => set({ source: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any source</SelectItem>
                    {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Consent</Label>
                <Select value={filters.consent_status ?? "all"} onValueChange={(v) => set({ consent_status: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {CONSENT_STATUSES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Company</Label>
              <Input className="h-9" value={filters.company ?? ""} onChange={(e) => set({ company: e.target.value })} placeholder="Company name" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Min score</Label>
                <Input className="h-9" type="number" value={filters.scoreMin ?? ""} onChange={(e) => set({ scoreMin: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Max score</Label>
                <Input className="h-9" type="number" value={filters.scoreMax ?? ""} onChange={(e) => set({ scoreMax: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Created from</Label>
                <Input className="h-9" type="date" value={filters.createdFrom ?? ""} onChange={(e) => set({ createdFrom: e.target.value || undefined })} />
              </div>
              <div>
                <Label className="text-xs">Created to</Label>
                <Input className="h-9" type="date" value={filters.createdTo ?? ""} onChange={(e) => set({ createdTo: e.target.value || undefined })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Active since</Label>
                <Input className="h-9" type="date" value={filters.activityFrom ?? ""} onChange={(e) => set({ activityFrom: e.target.value || undefined })} />
              </div>
            </div>

            {tags.length > 0 && (
              <div>
                <Label className="text-xs">Tags</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {tags.slice(0, 30).map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleTag(t)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        filters.tags?.includes(t) ? "border-accent bg-accent/15 text-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">Include archived</Label>
              <Switch checked={!!filters.includeArchived} onCheckedChange={(v) => set({ includeArchived: v })} />
            </div>

            <div className="flex justify-between gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => onChange({ search: filters.search, page: 0 })}>Reset</Button>
              <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Star className="mr-2 h-4 w-4" /> Views
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Saved views</DropdownMenuLabel>
          {views.length === 0 && <DropdownMenuItem disabled>No saved views yet</DropdownMenuItem>}
          {views.map((v) => (
            <DropdownMenuItem key={v.id} onSelect={(e) => e.preventDefault()} className="flex items-center justify-between">
              <button className="flex-1 truncate text-left" onClick={() => onApplyView(v)}>
                {v.name}
                <span className="ml-1 text-xs text-muted-foreground">{v.visibility === "shared" ? "· shared" : ""}</span>
              </button>
              <button onClick={() => deleteView.mutate(v.id)} aria-label={`Delete ${v.name}`} className="ml-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSaveOpen(true); }}>
            <Save className="mr-2 h-4 w-4" /> Save current view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <PopoverTrigger asChild><span /></PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">View name</Label>
              <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="e.g. Sales ready in London" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Share with workspace</Label>
              <Switch checked={shared} onCheckedChange={setShared} />
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!viewName.trim() || createView.isPending}
              onClick={async () => {
                await createView.mutateAsync({
                  workspace_id: workspaceId,
                  name: viewName.trim(),
                  filters: filters as Record<string, unknown>,
                  columns,
                  sort: { key: filters.sortKey, dir: filters.sortDir },
                  visibility: shared ? "shared" : "private",
                });
                setViewName("");
                setSaveOpen(false);
              }}
            >
              Save view
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ContactFiltersBar;
