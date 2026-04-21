import { useState, useRef, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, Download, AlertTriangle, FolderOpen, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCreateFolder, type LeadFolder } from "@/hooks/useLeadFolders";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; workspaceId: string; folders?: LeadFolder[] };

type ImportMode = "skip" | "update" | "cancel";

type ParsedRow = Record<string, string>;

type ErrorRow = { data: ParsedRow; _error: string; _row: number };

// ─── Phone normalisation ───────────────────────────────────────
function normalizePhone(raw: string): string {
  let p = raw.trim().replace(/[\s\-().]/g, "");
  // UK local → E.164
  if (/^0[1-9]\d{8,9}$/.test(p)) {
    p = "+44" + p.slice(1);
  }
  // ensure leading +
  if (/^\d{10,15}$/.test(p) && !p.startsWith("+")) {
    // leave as-is if ambiguous
  }
  return p;
}

// ─── CSV parser ────────────────────────────────────────────────
function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj: ParsedRow = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
}

// ─── Build a CSV string from error rows ────────────────────────
function buildErrorCsv(rows: ErrorRow[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0].data);
  const header = [...keys, "error", "row_number"].join(",");
  const body = rows.map((r) =>
    [...keys.map((k) => `"${(r.data[k] || "").replace(/"/g, '""')}"`), `"${r._error}"`, r._row].join(",")
  );
  return [header, ...body].join("\n");
}

const CsvImportDialog = ({ open, onOpenChange, workspaceId, folders = [] }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const createFolder = useCreateFolder();

  const [loading, setLoading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [allRows, setAllRows] = useState<ParsedRow[]>([]);
  const [mode, setMode] = useState<ImportMode>("skip");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("__none__");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Analysis results
  const [dupsInFile, setDupsInFile] = useState<Set<string>>(new Set());
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set());
  const [analysed, setAnalysed] = useState(false);

  // Result
  const [result, setResult] = useState<{ imported: number; updated: number; skipped: number; errors: ErrorRow[] } | null>(null);

  const reset = () => {
    setFile(null);
    setAllRows([]);
    setMode("skip");
    setSelectedFolderId("__none__");
    setDupsInFile(new Set());
    setExistingPhones(new Set());
    setAnalysed(false);
    setResult(null);
    setLoading(false);
    setAnalysing(false);
  };

  // ── Step 1: parse file & analyse duplicates ──────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    reset();
    setFile(f);
    setAnalysing(true);

    try {
      const text = await f.text();
      const rows = parseCsv(text);
      setAllRows(rows);

      // Detect in-file phone duplicates
      const phoneCount = new Map<string, number>();
      rows.forEach((r) => {
        const p = normalizePhone(r.phone || "");
        if (p) phoneCount.set(p, (phoneCount.get(p) || 0) + 1);
      });
      const fileDups = new Set<string>();
      phoneCount.forEach((count, phone) => { if (count > 1) fileDups.add(phone); });
      setDupsInFile(fileDups);

      // Detect phones already in DB for this workspace
      const phonesInFile = [...new Set(rows.map((r) => normalizePhone(r.phone || "")).filter(Boolean))];
      if (phonesInFile.length > 0) {
        const { data } = await supabase
          .from("leads")
          .select("phone")
          .eq("workspace_id", workspaceId)
          .in("phone", phonesInFile);
        setExistingPhones(new Set((data || []).map((d: any) => d.phone).filter(Boolean)));
      }

      setAnalysed(true);
    } catch {
      toast.error("Failed to analyse CSV");
    } finally {
      setAnalysing(false);
    }
  };

  // ── Analysis summary ─────────────────────────────────────────
  const summary = useMemo(() => {
    if (!analysed) return null;
    const total = allRows.length;
    const withPhone = allRows.filter((r) => normalizePhone(r.phone || "")).length;
    const dupsInFileCount = dupsInFile.size;
    const existingCount = existingPhones.size;
    return { total, withPhone, dupsInFileCount, existingCount };
  }, [analysed, allRows, dupsInFile, existingPhones]);

  // ── Step 2: import ───────────────────────────────────────────
  const handleImport = async () => {
    if (!file || !user || mode === "cancel") return;
    setLoading(true);

    const errors: ErrorRow[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const newLeadIds: string[] = [];

    try {
      const seenPhones = new Set<string>();

      for (let i = 0; i < allRows.length; i++) {
        const r = allRows[i];
        const phone = normalizePhone(r.phone || "");
        const email = (r.email || "").trim().toLowerCase() || null;
        const fullName = r.full_name || r.name || null;

        // Skip in-file duplicates (keep first occurrence)
        if (phone && seenPhones.has(phone)) {
          skipped++;
          errors.push({ data: r, _error: "Duplicate phone in file (kept first occurrence)", _row: i + 2 });
          continue;
        }
        if (phone) seenPhones.add(phone);

        // Check if exists in DB
        const isExisting = phone ? existingPhones.has(phone) : false;

        if (isExisting && mode === "skip") {
          skipped++;
          errors.push({ data: r, _error: "Phone already exists in workspace (skipped)", _row: i + 2 });
          continue;
        }

        if (isExisting && mode === "update") {
          // Update existing lead
          const { error } = await supabase
            .from("leads")
            .update({
              full_name: fullName,
              email,
              source: r.source || undefined,
              status: r.status || undefined,
              tags: r.tags ? r.tags.split(";").map((t: string) => t.trim()).filter(Boolean) : undefined,
            })
            .eq("workspace_id", workspaceId)
            .eq("phone", phone);
          if (error) {
            errors.push({ data: r, _error: error.message, _row: i + 2 });
          } else {
            updated++;
          }
          continue;
        }

        // Insert new
        const { data: newLead, error } = await supabase.from("leads").insert({
          user_id: user.id,
          workspace_id: workspaceId,
          full_name: fullName,
          email,
          phone: phone || null,
          source: r.source || "Organic",
          status: r.status || "New",
          tags: r.tags ? r.tags.split(";").map((t: string) => t.trim()).filter(Boolean) : [],
        } as any).select("id").single();

        if (error) {
          errors.push({ data: r, _error: error.message, _row: i + 2 });
        } else {
          imported++;
          if (newLead?.id) newLeadIds.push(newLead.id);
        }
      }

      // Assign imported leads to selected folder
      const folderId = selectedFolderId !== "__none__" ? selectedFolderId : null;
      if (folderId && newLeadIds.length > 0) {
        const folderRows = newLeadIds.map((lead_id) => ({
          folder_id: folderId,
          lead_id,
          workspace_id: workspaceId,
        }));
        // Insert in batches of 50
        for (let i = 0; i < folderRows.length; i += 50) {
          await supabase.from("lead_folder_leads").upsert(folderRows.slice(i, i + 50) as any, { onConflict: "folder_id,lead_id" });
        }
        qc.invalidateQueries({ queryKey: ["lead-folders"] });
      }

      setResult({ imported, updated, skipped, errors });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-stats"] });

      const parts: string[] = [];
      if (imported) parts.push(`${imported} imported`);
      if (updated) parts.push(`${updated} updated`);
      if (skipped) parts.push(`${skipped} skipped`);
      if (errors.length) parts.push(`${errors.length} error(s)`);
      toast.success(`Import complete: ${parts.join(", ")}`);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadErrors = () => {
    if (!result?.errors.length) return;
    const csv = buildErrorCsv(result.errors);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_errors.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          CSV should have headers: <code className="text-xs">full_name, email, phone, source, status, tags</code>.<br />
          Tags separated by semicolons. Phones are normalised automatically.
        </p>

        {/* Template download */}
        <div className="mt-2">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const csv = [
                "full_name,email,phone,source,status,tags",
                "Jane Doe,jane@example.com,+447700900123,Organic,New,vip;newsletter",
                "John Smith,john@example.com,+447700900456,Referral,New,trial",
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "nexusflo24_leads_import_template.csv";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            Download sample CSV template
          </a>
          <p className="mt-1 text-xs text-muted-foreground">Use this template to format your leads correctly before importing.</p>
        </div>

        {/* File picker */}
        <div className="mt-4">
          <input type="file" accept=".csv" ref={inputRef} onChange={handleFile} className="hidden" />
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={analysing}>
            <Upload className="mr-2 h-4 w-4" /> {analysing ? "Analysing…" : file ? file.name : "Choose CSV file"}
          </Button>
        </div>

        {/* Analysis Report */}
        {analysed && summary && !result && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
              <p><strong>{summary.total}</strong> total rows</p>
              <p><strong>{summary.withPhone}</strong> rows with phone numbers</p>
              {summary.dupsInFileCount > 0 && (
                <p className="flex items-center gap-1 text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <strong>{summary.dupsInFileCount}</strong> duplicate phone(s) within the file
                </p>
              )}
              {summary.existingCount > 0 && (
                <p className="flex items-center gap-1 text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <strong>{summary.existingCount}</strong> phone(s) already exist in your workspace
                </p>
              )}
              {summary.dupsInFileCount === 0 && summary.existingCount === 0 && (
                <p className="text-accent">✓ No duplicates detected</p>
              )}
            </div>

            {/* Import mode */}
            {(summary.dupsInFileCount > 0 || summary.existingCount > 0) && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">How should we handle duplicates?</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as ImportMode)} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="skip" id="mode-skip" />
                    <Label htmlFor="mode-skip" className="text-sm font-normal">Skip duplicates (import only new records)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="update" id="mode-update" />
                    <Label htmlFor="mode-update" className="text-sm font-normal">Update existing (overwrite name/email/source/status/score)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="cancel" id="mode-cancel" />
                    <Label htmlFor="mode-cancel" className="text-sm font-normal">Cancel import</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Assign to folder */}
            {folders.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Assign imported leads to folder
                </Label>
                <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No folder</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.color ? `${f.color} ` : ""}{f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview first 5 rows */}
            {allRows.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted">
                      {Object.keys(allRows[0]).map((h) => <th key={h} className="px-2 py-1 text-left">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {allRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {Object.values(r).map((v, j) => <td key={j} className="px-2 py-1">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="p-2 text-muted-foreground">Showing first 5 rows…</p>
              </div>
            )}
          </div>
        )}

        {/* Result Summary */}
        {result && (
          <div className="mt-4 rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
            <p className="font-medium">Import Complete</p>
            <p>✓ <strong>{result.imported}</strong> imported</p>
            {result.updated > 0 && <p>✓ <strong>{result.updated}</strong> updated</p>}
            {result.skipped > 0 && <p>⏭ <strong>{result.skipped}</strong> skipped</p>}
            {result.errors.length > 0 && (
              <>
                <p className="text-destructive">✗ <strong>{result.errors.length}</strong> error(s)</p>
                <Button variant="outline" size="sm" onClick={downloadErrors} className="mt-2">
                  <Download className="mr-2 h-3.5 w-3.5" /> Download error rows CSV
                </Button>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || loading || !analysed || mode === "cancel"}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {loading ? "Importing…" : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportDialog;
