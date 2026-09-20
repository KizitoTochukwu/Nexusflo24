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
import { useMarkOnboardingFlag } from "@/hooks/useOnboarding";
import { fireAutomationsForLeads } from "@/lib/automations/fireTriggers";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; workspaceId: string; folders?: LeadFolder[] };

type ImportMode = "skip" | "update" | "cancel";

type ParsedRow = Record<string, string>;

type ErrorRow = { data: ParsedRow; _error: string; _row: number };

// ─── Header aliasing — map common variants to canonical names ──
const HEADER_ALIASES: Record<string, string> = {
  name: "full_name",
  fullname: "full_name",
  full_name: "full_name",
  contact: "full_name",
  contact_name: "full_name",
  customer: "full_name",
  customer_name: "full_name",
  lead: "full_name",
  lead_name: "full_name",
  first_name: "full_name",
  firstname: "full_name",
  last_name: "full_name",
  lastname: "full_name",
  email: "email",
  email_address: "email",
  e_mail: "email",
  phone: "phone",
  phone_number: "phone",
  mobile: "phone",
  mobile_number: "phone",
  whatsapp: "phone",
  whatsapp_number: "phone",
  source: "source",
  lead_source: "source",
  status: "status",
  lead_status: "status",
  tags: "tags",
  tag: "tags",
};

function canonicalHeader(h: string): string {
  const key = h.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return HEADER_ALIASES[key] || key;
}

// ─── Phone normalisation ───────────────────────────────────────
function normalizePhone(raw: string): string {
  if (!raw) return "";
  let p = raw.trim();
  // Reject Excel scientific notation (e.g. 2.35E+12) — data is unrecoverable
  if (/e\+?\d+/i.test(p) || /\.\d+E/i.test(p)) {
    return "";
  }
  p = p.replace(/[\s\-().]/g, "");
  // UK local → E.164
  if (/^0[1-9]\d{8,9}$/.test(p)) {
    p = "+44" + p.slice(1);
  }
  // Add + for plain international digits
  if (/^\d{10,15}$/.test(p) && !p.startsWith("+")) {
    p = "+" + p;
  }
  return p;
}

// ─── CSV parser (RFC 4180 — handles quoted fields, embedded commas & newlines) ──
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function parseCsv(text: string): ParsedRow[] {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  // Walk char-by-char to honour quoted newlines
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cur.trim()); cur = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cur.trim());
        if (row.some((c) => c.length > 0)) rows.push(row);
        row = [];
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map(canonicalHeader);

  // Track which raw headers map to full_name so we can combine first+last name
  const rawHeaders = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const firstNameIdx = rawHeaders.indexOf("first_name") !== -1 ? rawHeaders.indexOf("first_name") : rawHeaders.indexOf("firstname");
  const lastNameIdx = rawHeaders.indexOf("last_name") !== -1 ? rawHeaders.indexOf("last_name") : rawHeaders.indexOf("lastname");
  const hasSplitName = firstNameIdx !== -1 && lastNameIdx !== -1;

  return rows.slice(1).map((values) => {
    const obj: ParsedRow = {};
    headers.forEach((h, i) => {
      // If we have BOTH first_name and last_name columns, skip overwriting full_name from individual cols
      if (hasSplitName && (i === firstNameIdx || i === lastNameIdx)) return;
      if (!obj[h]) obj[h] = values[i] || "";
    });
    if (hasSplitName) {
      const fn = (values[firstNameIdx] || "").trim();
      const ln = (values[lastNameIdx] || "").trim();
      const combined = [fn, ln].filter(Boolean).join(" ");
      if (combined) obj.full_name = combined;
    }
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
  const markImported = useMarkOnboardingFlag(workspaceId);

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
    setShowNewFolder(false);
    setNewFolderName("");
    setDupsInFile(new Set());
    setExistingPhones(new Set());
    setAnalysed(false);
    setResult(null);
    setLoading(false);
    setAnalysing(false);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const folder = await createFolder.mutateAsync({ name, workspace_id: workspaceId });
      setSelectedFolderId((folder as any).id);
      setShowNewFolder(false);
      setNewFolderName("");
    } catch {
      // toast handled in hook
    }
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
      const emailCount = new Map<string, number>();
      rows.forEach((r) => {
        const p = normalizePhone(r.phone || "");
        if (p) phoneCount.set(p, (phoneCount.get(p) || 0) + 1);
        const e = (r.email || "").trim().toLowerCase();
        if (e) emailCount.set(e, (emailCount.get(e) || 0) + 1);
      });
      const fileDups = new Set<string>();
      phoneCount.forEach((count, phone) => { if (count > 1) fileDups.add(phone); });
      emailCount.forEach((count, em) => { if (count > 1) fileDups.add("email:" + em); });
      setDupsInFile(fileDups);

      // Detect phones AND emails already in DB for this workspace
      const phonesInFile = [...new Set(rows.map((r) => normalizePhone(r.phone || "")).filter(Boolean))];
      const emailsInFile = [...new Set(rows.map((r) => (r.email || "").trim().toLowerCase()).filter(Boolean))];
      const existing = new Set<string>();
      if (phonesInFile.length > 0) {
        const { data } = await supabase
          .from("leads").select("phone").eq("workspace_id", workspaceId).in("phone", phonesInFile);
        (data || []).forEach((d: any) => { if (d.phone) existing.add("phone:" + d.phone); });
      }
      if (emailsInFile.length > 0) {
        // Chunk into batches of 200 to avoid URL length limits
        for (let i = 0; i < emailsInFile.length; i += 200) {
          const chunk = emailsInFile.slice(i, i + 200);
          const { data } = await supabase
            .from("leads").select("email").eq("workspace_id", workspaceId).in("email", chunk);
          (data || []).forEach((d: any) => { if (d.email) existing.add("email:" + d.email.toLowerCase()); });
        }
      }
      setExistingPhones(existing);

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
      const seenEmails = new Set<string>();

      for (let i = 0; i < allRows.length; i++) {
        const r = allRows[i];
        const phone = normalizePhone(r.phone || "");
        const email = (r.email || "").trim().toLowerCase() || null;
        let fullName = (r.full_name || (r as any).name || "").trim() || null;
        // Fallback: derive a friendly name from the email local-part if no name provided
        if (!fullName && email) {
          const local = email.split("@")[0].replace(/[._\-+]+/g, " ").trim();
          if (local) fullName = local.replace(/\b\w/g, (c) => c.toUpperCase());
        }

        // Need at least one identifier
        if (!phone && !email) {
          skipped++;
          errors.push({ data: r, _error: "Row has no phone or email — skipped", _row: i + 2 });
          continue;
        }

        // Skip in-file duplicates (keep first occurrence)
        if (phone && seenPhones.has(phone)) {
          skipped++;
          errors.push({ data: r, _error: "Duplicate phone in file (kept first occurrence)", _row: i + 2 });
          continue;
        }
        if (email && seenEmails.has(email)) {
          skipped++;
          errors.push({ data: r, _error: "Duplicate email in file (kept first occurrence)", _row: i + 2 });
          continue;
        }
        if (phone) seenPhones.add(phone);
        if (email) seenEmails.add(email);

        // Check if exists in DB (by phone OR email)
        const phoneExists = phone ? existingPhones.has("phone:" + phone) : false;
        const emailExists = email ? existingPhones.has("email:" + email) : false;
        const isExisting = phoneExists || emailExists;

        if (isExisting && mode === "skip") {
          skipped++;
          errors.push({ data: r, _error: `${phoneExists ? "Phone" : "Email"} already exists in workspace (skipped)`, _row: i + 2 });
          continue;
        }

        if (isExisting && mode === "update") {
          let updateQuery = supabase
            .from("leads")
            .update({
              full_name: fullName,
              email,
              phone: phone || undefined,
              source: r.source || undefined,
              status: r.status || undefined,
              tags: r.tags ? r.tags.split(";").map((t: string) => t.trim()).filter(Boolean) : undefined,
            })
            .eq("workspace_id", workspaceId);
          updateQuery = phoneExists && phone
            ? updateQuery.eq("phone", phone)
            : updateQuery.eq("email", email!);
          const { error } = await updateQuery;
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

      // Destination folder: user-picked → workspace default → "Uncategorized"
      let folderId: string | null = selectedFolderId !== "__none__" ? selectedFolderId : null;
      if (!folderId) folderId = folders.find((f) => f.is_default)?.id ?? null;
      if (!folderId) {
        const uncategorized = folders.find((f) => f.name.trim().toLowerCase() === "uncategorized");
        if (uncategorized) {
          folderId = uncategorized.id;
        } else {
          // Create one if it doesn't exist (defensive — migration should have made it)
          try {
            const created = await createFolder.mutateAsync({ name: "Uncategorized", color: "#94A3B8", workspace_id: workspaceId });
            folderId = (created as any).id;
          } catch {
            folderId = null;
          }
        }
      }
      if (folderId && newLeadIds.length > 0) {
        const folderRows = newLeadIds.map((lead_id) => ({
          folder_id: folderId,
          lead_id,
          workspace_id: workspaceId,
        }));
        // Insert in batches of 50
        for (let i = 0; i < folderRows.length; i += 50) {
          await supabase.from("lead_folder_leads").upsert(folderRows.slice(i, i + 50) as any, { onConflict: "folder_id,lead_id", ignoreDuplicates: true });
        }
        qc.invalidateQueries({ queryKey: ["lead-folders"] });

        // Fire matching automations for the imported batch (best-effort)
        fireAutomationsForLeads({
          workspaceId,
          leadIds: newLeadIds,
          triggerType: "lead_added_to_folder",
          triggerConfigMatch: { folder_id: folderId },
        });
      }

      setResult({ imported, updated, skipped, errors });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-stats"] });
      qc.invalidateQueries({ queryKey: ["getting-started"] });
      if (imported > 0 || updated > 0) markImported("contacts_imported");

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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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

            {/* Assign to folder — always visible, with inline create */}
            <div className="space-y-2 rounded-lg border bg-card p-3">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" />
                Add imported leads to a folder
              </Label>
              <div className="flex items-center gap-2">
                <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Default — Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Default — Uncategorized</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}{typeof f.lead_count === "number" ? ` (${f.lead_count})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewFolder((s) => !s)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> New
                </Button>
              </div>
              {showNewFolder && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    autoFocus
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateFolder();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || createFolder.isPending}
                  >
                    {createFolder.isPending ? "Creating…" : "Create"}
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedFolderId !== "__none__"
                  ? "All newly imported leads will be added to this folder."
                  : "Leads will land in the Uncategorized folder. You can move them later."}
              </p>
            </div>

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
