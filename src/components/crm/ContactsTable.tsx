import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import {
  CONTACT_COLUMNS, lifecycleMeta, consentMeta, scoreBand, type ContactColumnKey,
} from "@/lib/crm/constants";
import type { Contact } from "@/hooks/useContacts";

type Member = { user_id: string; profile?: { full_name?: string | null; email?: string | null } | null };

type Props = {
  workspaceId: string;
  rows: Contact[];
  columns: ContactColumnKey[];
  loading: boolean;
  selected: string[];
  onSelect: (ids: string[]) => void;
  sortKey?: ContactColumnKey;
  sortDir?: "asc" | "desc";
  onSort: (key: ContactColumnKey) => void;
  members: Member[];
  canEdit: boolean;
  onInlineSave: (contact: Contact, patch: Partial<Contact>) => void;
};

const editableInline: ContactColumnKey[] = ["full_name", "email", "phone", "company_name", "job_title"];

const ContactsTable = ({
  workspaceId, rows, columns, loading, selected, onSelect, sortKey, sortDir, onSort, members, canEdit, onInlineSave,
}: Props) => {
  const [editing, setEditing] = useState<{ id: string; key: ContactColumnKey } | null>(null);
  const [draft, setDraft] = useState("");

  const visible = CONTACT_COLUMNS.filter((c) => columns.includes(c.key));
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const ownerLabel = (id: string | null) => {
    if (!id) return "—";
    const m = members.find((x) => x.user_id === id);
    return m?.profile?.full_name || m?.profile?.email || id.slice(0, 8);
  };

  const startEdit = (c: Contact, key: ContactColumnKey) => {
    if (!canEdit || !editableInline.includes(key)) return;
    setEditing({ id: c.id, key });
    setDraft(((c as any)[key] as string) ?? "");
  };

  const commit = (c: Contact, key: ContactColumnKey) => {
    const original = ((c as any)[key] as string) ?? "";
    if (draft !== original) onInlineSave(c, { [key]: draft || null } as Partial<Contact>);
    setEditing(null);
  };

  const cell = (c: Contact, key: ContactColumnKey) => {
    if (editing?.id === c.id && editing.key === key) {
      return (
        <Input
          autoFocus
          value={draft}
          className="h-8"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(c, key)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(c, key);
            if (e.key === "Escape") setEditing(null);
          }}
        />
      );
    }

    switch (key) {
      case "full_name":
        return (
          <div className="flex items-center gap-2">
            <Link
              to={`/dashboard/${workspaceId}/crm/contacts/${c.id}`}
              className="font-medium text-foreground hover:text-accent hover:underline"
            >
              {c.full_name || c.email || "Unnamed contact"}
            </Link>
            {c.archived_at && <Badge variant="outline" className="text-[10px]">Archived</Badge>}
          </div>
        );
      case "lifecycle_stage": {
        const m = lifecycleMeta(c.lifecycle_stage);
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.color}`}>{m.label}</span>;
      }
      case "consent_status": {
        const m = consentMeta(c.consent_status);
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.color}`}>{m.label}</span>;
      }
      case "score": {
        const b = scoreBand(c.score ?? 0);
        return (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.color}`}>
            {c.score ?? 0} · {b.label}
          </span>
        );
      }
      case "owner_user_id":
        return <span className="text-sm text-muted-foreground">{ownerLabel(c.owner_user_id)}</span>;
      case "tags":
        return (
          <div className="flex flex-wrap gap-1">
            {(c.tags ?? []).slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
            {(c.tags?.length ?? 0) > 3 && <span className="text-xs text-muted-foreground">+{c.tags.length - 3}</span>}
          </div>
        );
      case "created_at":
      case "last_activity_at": {
        const v = c[key];
        return <span className="text-sm text-muted-foreground">{v ? new Date(v).toLocaleDateString() : "—"}</span>;
      }
      default: {
        const v = (c as any)[key] as string | null;
        return (
          <span className="group inline-flex items-center gap-1 text-sm">
            <span className={v ? "" : "text-muted-foreground"}>{v || "—"}</span>
            {canEdit && editableInline.includes(key) && (
              <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
            )}
          </span>
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 rounded-lg border p-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(v) => onSelect(v ? rows.map((r) => r.id) : [])}
                aria-label="Select all contacts on this page"
              />
            </TableHead>
            {visible.map((col) => (
              <TableHead key={col.key} className="whitespace-nowrap">
                {col.sortable ? (
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => onSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                ) : (
                  col.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id} data-state={selected.includes(c.id) ? "selected" : undefined}>
              <TableCell>
                <Checkbox
                  checked={selected.includes(c.id)}
                  onCheckedChange={(v) =>
                    onSelect(v ? [...selected, c.id] : selected.filter((id) => id !== c.id))
                  }
                  aria-label={`Select ${c.full_name || c.email}`}
                />
              </TableCell>
              {visible.map((col) => (
                <TableCell
                  key={col.key}
                  className="max-w-[240px] truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  tabIndex={0}
                  onDoubleClick={() => startEdit(c, col.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget === e.target) {
                      e.preventDefault();
                      startEdit(c, col.key);
                    }
                  }}
                >
                  {cell(c, col.key)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ContactsTable;
