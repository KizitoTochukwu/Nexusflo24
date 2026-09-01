import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCatalogueRows, useDeleteCatalogueRow, useSaveCatalogueRow, type CatalogueTable,
} from "@/hooks/useStoreAdmin";
import { LEVEL_ORDER, LEVELS } from "@/lib/store/constants";
import { formatGbp } from "@/lib/store/price";

type FieldType = "text" | "textarea" | "number" | "price" | "list" | "switch" | "level";
type Field = { key: string; label: string; type: FieldType; help?: string };

const SCHEMAS: Record<CatalogueTable, { label: string; fields: Field[] }> = {
  store_products: {
    label: "Automations",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "slug", label: "URL slug", type: "text", help: "Lowercase, words separated by hyphens." },
      { key: "category_slug", label: "Category slug", type: "text" },
      { key: "level", label: "Level", type: "level" },
      { key: "badge", label: "Badge", type: "text" },
      { key: "outcome", label: "Outcome statement", type: "textarea" },
      { key: "summary", label: "Short summary", type: "textarea" },
      { key: "problem_statement", label: "Problem this solves", type: "textarea" },
      { key: "base_price_pence", label: "Starting price", type: "price" },
      { key: "delivery_estimate", label: "Delivery estimate", type: "text" },
      { key: "delivery_days", label: "Delivery days", type: "number" },
      { key: "deliverables", label: "What you get", type: "list" },
      { key: "best_for", label: "Best for", type: "list" },
      { key: "integrations", label: "Integrations", type: "list" },
      { key: "industries", label: "Industries", type: "list" },
      { key: "workflow", label: "Workflow steps", type: "list" },
      { key: "problem_slugs", label: "Problem slugs", type: "list" },
      { key: "tags", label: "Tags", type: "list" },
      { key: "position", label: "Sort position", type: "number" },
      { key: "is_popular", label: "Show as popular", type: "switch" },
      { key: "managed_support", label: "Managed support available", type: "switch" },
      { key: "is_published", label: "Published", type: "switch" },
    ],
  },
  store_bundles: {
    label: "Bundles",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "slug", label: "URL slug", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "best_for", label: "Best for", type: "textarea" },
      { key: "includes", label: "What is included", type: "list" },
      { key: "product_slugs", label: "Product slugs", type: "list" },
      { key: "price_pence", label: "Bundle price", type: "price" },
      { key: "saving_pence", label: "Saving vs buying separately", type: "price" },
      { key: "badge", label: "Badge", type: "text" },
      { key: "delivery_estimate", label: "Delivery estimate", type: "text" },
      { key: "position", label: "Sort position", type: "number" },
      { key: "is_published", label: "Published", type: "switch" },
    ],
  },
  store_categories: {
    label: "Categories",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "slug", label: "URL slug", type: "text" },
      { key: "tagline", label: "Tagline", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "icon", label: "Icon name", type: "text", help: "Any Lucide icon name, e.g. Sparkles." },
      { key: "position", label: "Sort position", type: "number" },
      { key: "is_published", label: "Published", type: "switch" },
    ],
  },
  store_problems: {
    label: "Business problems",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "slug", label: "URL slug", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "category_slug", label: "Category slug", type: "text" },
      { key: "icon", label: "Icon name", type: "text" },
      { key: "position", label: "Sort position", type: "number" },
      { key: "is_published", label: "Published", type: "switch" },
    ],
  },
  store_plans: {
    label: "Managed plans",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "slug", label: "URL slug", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "price_pence", label: "Monthly price", type: "price" },
      { key: "price_prefix", label: "Price prefix", type: "text", help: 'For example "From".' },
      { key: "billing_interval", label: "Billing interval", type: "text" },
      { key: "features", label: "Features", type: "list" },
      { key: "position", label: "Sort position", type: "number" },
      { key: "is_published", label: "Published", type: "switch" },
    ],
  },
};

const TABLES = Object.keys(SCHEMAS) as CatalogueTable[];

function titleOf(row: Record<string, any>) {
  return row.name ?? row.title ?? row.slug ?? "Untitled";
}

function RowEditor({
  table, row, open, onOpenChange,
}: {
  table: CatalogueTable;
  row: Record<string, any> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const schema = SCHEMAS[table];
  const save = useSaveCatalogueRow(table);
  const [values, setValues] = useState<Record<string, any>>(() => row ?? {});

  const set = (key: string, value: any) => setValues((v) => ({ ...v, [key]: value }));

  const handleSave = async () => {
    const payload: Record<string, any> = {};
    for (const field of schema.fields) {
      const raw = values[field.key];
      if (field.type === "price" || field.type === "number") {
        payload[field.key] = raw === "" || raw === undefined || raw === null ? null : Number(raw);
      } else if (field.type === "list") {
        payload[field.key] = Array.isArray(raw)
          ? raw
          : String(raw ?? "")
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
      } else if (field.type === "switch") {
        payload[field.key] = !!raw;
      } else {
        payload[field.key] = raw === "" ? null : raw ?? null;
      }
    }
    if (!payload.slug) {
      toast.error("A URL slug is required.");
      return;
    }
    try {
      await save.mutateAsync({ id: row?.id, values: payload });
      toast.success(row?.id ? "Changes saved." : "Item created.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not save this item.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {row?.id ? `Edit ${titleOf(row)}` : `New ${schema.label.replace(/s$/, "").toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {schema.fields.map((field) => {
            const value = values[field.key];
            return (
              <div key={field.key}>
                <Label className="text-xs">{field.label}</Label>
                {field.type === "textarea" && (
                  <Textarea rows={3} value={value ?? ""} onChange={(e) => set(field.key, e.target.value)} />
                )}
                {field.type === "list" && (
                  <Textarea
                    rows={3}
                    placeholder="One per line"
                    value={Array.isArray(value) ? value.join("\n") : value ?? ""}
                    onChange={(e) => set(field.key, e.target.value)}
                  />
                )}
                {field.type === "switch" && (
                  <div className="pt-1">
                    <Switch checked={!!value} onCheckedChange={(v) => set(field.key, v)} />
                  </div>
                )}
                {field.type === "level" && (
                  <Select value={value ?? "quick"} onValueChange={(v) => set(field.key, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVEL_ORDER.map((level) => (
                        <SelectItem key={level} value={level}>{LEVELS[level].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {(field.type === "text" || field.type === "number" || field.type === "price") && (
                  <Input
                    value={value ?? ""}
                    inputMode={field.type === "text" ? undefined : "numeric"}
                    onChange={(e) => set(field.key, e.target.value)}
                  />
                )}
                {field.type === "price" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    In pence — {formatGbp(Number(value) || 0)}
                  </p>
                )}
                {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
              </div>
            );
          })}

          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-gold-dark"
            onClick={handleSave}
            disabled={save.isPending}
          >
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CatalogueTab({ table }: { table: CatalogueTable }) {
  const { data: rows = [], isLoading } = useCatalogueRows(table);
  const remove = useDeleteCatalogueRow(table);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        `${titleOf(row)} ${row.slug ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );

  const startNew = () => {
    setEditing({ is_published: true, position: rows.length });
    setOpen(true);
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!window.confirm(`Delete "${titleOf(row)}"? This cannot be undone.`)) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success("Item deleted.");
    } catch (err: any) {
      toast.error(err?.message || "Could not delete this item.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button className="ml-auto bg-accent text-accent-foreground hover:bg-gold-dark" onClick={startNew}>
          <Plus className="mr-2 h-4 w-4" /> New {SCHEMAS[table].label.replace(/s$/, "").toLowerCase()}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          {filtered.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-3 border-b p-4 last:border-b-0">
              <div className="min-w-[220px] flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{titleOf(row)}</span>
                  {row.is_published === false && <Badge variant="secondary">Draft</Badge>}
                  {row.is_popular && <Badge className="bg-accent/15 text-accent hover:bg-accent/15">Popular</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">/{row.slug}</p>
              </div>
              {"base_price_pence" in row && (
                <span className="text-sm font-semibold">{formatGbp(row.base_price_pence ?? 0)}</span>
              )}
              {"price_pence" in row && (
                <span className="text-sm font-semibold">{formatGbp(row.price_pence ?? 0)}</span>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(row);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(row)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <RowEditor
          key={editing?.id ?? "new"}
          table={table}
          row={editing}
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/** `bare` renders without the dashboard shell so Platform Admin can embed it. */
export default function AdminStoreCatalogue({ bare = false }: { bare?: boolean }) {
  const body = (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      {!bare && (
        <div>
          <h1 className="text-2xl font-bold">Automation Store catalogue</h1>
          <p className="text-sm text-muted-foreground">
            Add, edit, price and publish everything shoppers see in the store — no developer needed.
          </p>
        </div>
      )}

      <Tabs defaultValue="store_products">
        <TabsList className="flex-wrap">
          {TABLES.map((table) => (
            <TabsTrigger key={table} value={table}>{SCHEMAS[table].label}</TabsTrigger>
          ))}
        </TabsList>
        {TABLES.map((table) => (
          <TabsContent key={table} value={table} className="mt-4">
            <CatalogueTab table={table} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );

  if (bare) return body;
  return <DashboardLayout>{body}</DashboardLayout>;
}
