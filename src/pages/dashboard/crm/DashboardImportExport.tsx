import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/seo/Seo";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useMarkOnboardingFlag } from "@/hooks/useOnboarding";
import { useQueryClient } from "@tanstack/react-query";

type Entity = "contacts" | "companies" | "crm_deals";

const FIELDS: Record<Entity, { key: string; label: string; required?: boolean }[]> = {
  contacts: [
    { key: "full_name", label: "Full name" },
    { key: "first_name", label: "First name" },
    { key: "last_name", label: "Last name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "job_title", label: "Job title" },
    { key: "company_name", label: "Company name" },
    { key: "lifecycle_stage", label: "Lifecycle stage" },
    { key: "source", label: "Source" },
    { key: "notes", label: "Notes" },
  ],
  companies: [
    { key: "name", label: "Company name", required: true },
    { key: "domain", label: "Domain" },
    { key: "industry", label: "Industry" },
    { key: "phone", label: "Phone" },
    { key: "website", label: "Website" },
    { key: "city", label: "City" },
    { key: "country", label: "Country" },
    { key: "notes", label: "Notes" },
  ],
  crm_deals: [
    { key: "name", label: "Deal name", required: true },
    { key: "amount", label: "Amount" },
    { key: "currency", label: "Currency" },
    { key: "status", label: "Status" },
    { key: "source", label: "Source" },
    { key: "description", label: "Description" },
  ],
};

const LABELS: Record<Entity, string> = { contacts: "Contacts", companies: "Companies", crm_deals: "Deals" };

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Minimal RFC4180-ish CSV parser (handles quotes, commas and newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const DashboardImportExport = () => {
  const workspaceId = useWorkspaceId();
  const { canEdit } = useWorkspaceRole();
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const markImported = useMarkOnboardingFlag(workspaceId);

  const [entity, setEntity] = useState<Entity>("contacts");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);
  const [exporting, setExporting] = useState<Entity | null>(null);

  const fields = FIELDS[entity];

  const autoMap = (hdrs: string[]) => {
    const map: Record<string, string> = {};
    fields.forEach((f) => {
      const hit = hdrs.find(
        (h) => h.toLowerCase().replace(/[^a-z]/g, "") === f.key.replace(/[^a-z]/g, "") ||
          h.toLowerCase() === f.label.toLowerCase(),
      );
      if (hit) map[f.key] = hit;
    });
    return map;
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) { toast.error("That CSV has no data rows."); return; }
    const [hdrs, ...body] = parsed;
    setHeaders(hdrs);
    setRows(body.slice(0, 5000));
    setMapping(autoMap(hdrs));
    setResult(null);
  };

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  const runImport = async () => {
    const missing = fields.filter((f) => f.required && !mapping[f.key]);
    if (missing.length) { toast.error(`Map a column for: ${missing.map((m) => m.label).join(", ")}`); return; }
    if (!Object.keys(mapping).length) { toast.error("Map at least one column."); return; }

    setImporting(true);
    setProgress(0);
    let inserted = 0;
    let failed = 0;

    const records = rows.map((r) => {
      const rec: Record<string, any> = { workspace_id: workspaceId };
      Object.entries(mapping).forEach(([field, header]) => {
        const idx = headers.indexOf(header);
        if (idx < 0) return;
        const raw = (r[idx] ?? "").trim();
        if (!raw) return;
        rec[field] = field === "amount" ? Number(raw.replace(/[^0-9.-]/g, "")) || 0 : raw;
      });
      return rec;
    }).filter((rec) => Object.keys(rec).length > 1);

    const chunkSize = 200;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const { error } = await supabase.from(entity as any).insert(chunk as any);
      if (error) {
        // Retry row-by-row so one bad row can't drop the whole batch.
        for (const rec of chunk) {
          const single = await supabase.from(entity as any).insert(rec as any);
          if (single.error) failed++; else inserted++;
        }
      } else inserted += chunk.length;
      setProgress(Math.round(Math.min(100, ((i + chunk.length) / records.length) * 100)));
    }

    setImporting(false);
    setResult({ inserted, failed });
    if (inserted > 0) {
      qc.invalidateQueries({ queryKey: ["getting-started"] });
      if (entity === "contacts") markImported("contacts_imported");
    }
    toast.success(`Imported ${inserted} ${LABELS[entity].toLowerCase()}${failed ? `, ${failed} skipped` : ""}`);
  };

  const exportEntity = async (target: Entity) => {
    setExporting(target);
    try {
      const { data, error } = await supabase
        .from(target as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .limit(10000);
      if (error) throw error;
      const list = (data ?? []) as any[];
      if (!list.length) { toast.error(`No ${LABELS[target].toLowerCase()} to export.`); return; }
      const cols = Object.keys(list[0]);
      const csv = [cols.join(","), ...list.map((r) => cols.map((c) => csvEscape(r[c])).join(","))].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexusflo24-${target}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const downloadTemplate = () => {
    const csv = fields.map((f) => f.label).join(",");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexusflo24-${entity}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Seo title="CRM Import & Export | NexusFlo24" description="Bulk import contacts, companies and deals from CSV, or export your CRM data." />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import &amp; Export</h1>
        <p className="text-sm text-muted-foreground">Move CRM data in and out of NexusFlo24 with CSV files.</p>
      </div>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Upload a CSV</CardTitle>
              <CardDescription>Choose what you are importing, upload the file, then map your columns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label>Record type</Label>
                  <Select
                    value={entity}
                    onValueChange={(v) => { setEntity(v as Entity); setHeaders([]); setRows([]); setMapping({}); setResult(null); }}
                  >
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contacts">Contacts</SelectItem>
                      <SelectItem value="companies">Companies</SelectItem>
                      <SelectItem value="crm_deals">Deals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="gap-1.5">
                  <FileSpreadsheet className="h-4 w-4" /> Download template
                </Button>
                <Button onClick={() => fileRef.current?.click()} disabled={!canEdit} className="gap-1.5">
                  <Upload className="h-4 w-4" /> Choose CSV
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
                />
              </div>

              {headers.length > 0 && (
                <>
                  <div className="rounded-lg border p-4">
                    <p className="mb-3 text-sm font-medium">Map columns ({rows.length} rows detected)</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {fields.map((f) => (
                        <div key={f.key} className="space-y-1.5">
                          <Label className="text-xs">
                            {f.label}{f.required && <span className="text-destructive"> *</span>}
                          </Label>
                          <Select
                            value={mapping[f.key] ?? "none"}
                            onValueChange={(v) =>
                              setMapping((m) => {
                                const next = { ...m };
                                if (v === "none") delete next[f.key]; else next[f.key] = v;
                                return next;
                              })
                            }
                          >
                            <SelectTrigger><SelectValue placeholder="Not mapped" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Not mapped</SelectItem>
                              {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.map((r, i) => (
                          <tr key={i} className="border-t">
                            {headers.map((_, j) => <td key={j} className="max-w-[200px] truncate px-3 py-2">{r[j]}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importing && <Progress value={progress} />}

                  {result && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Imported {result.inserted} records{result.failed ? `, ${result.failed} skipped (duplicates or invalid data)` : ""}.
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={runImport} disabled={importing || !canEdit}>
                      {importing ? "Importing…" : `Import ${rows.length} ${LABELS[entity].toLowerCase()}`}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {(Object.keys(LABELS) as Entity[]).map((e) => (
              <Card key={e} className="rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base">{LABELS[e]}</CardTitle>
                  <CardDescription>Download all workspace {LABELS[e].toLowerCase()} as CSV.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full gap-1.5" onClick={() => exportEntity(e)} disabled={exporting === e}>
                    <Download className="h-4 w-4" /> {exporting === e ? "Exporting…" : "Export CSV"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardImportExport;
