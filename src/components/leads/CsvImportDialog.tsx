import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
}

const CsvImportDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target?.result as string);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file || !user) return;
    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const leads = rows.map((r) => ({
        user_id: user.id,
        full_name: r.full_name || r.name || null,
        email: r.email || null,
        phone: r.phone || null,
        source: r.source || "Organic",
        status: r.status || "New",
        score: parseInt(r.score) || 0,
        tags: r.tags ? r.tags.split(";").map((t: string) => t.trim()).filter(Boolean) : [],
        notes: r.notes || null,
      }));

      const { error } = await supabase.from("leads").insert(leads as any);
      if (error) throw error;

      toast.success(`${leads.length} leads imported`);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-stats"] });
      onOpenChange(false);
      setPreview([]);
      setFile(null);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setPreview([]); setFile(null); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          CSV should have headers: <code className="text-xs">full_name, email, phone, source, status, score, tags, notes</code>.<br />
          Tags should be separated by semicolons.
        </p>
        <div className="mt-4">
          <input type="file" accept=".csv" ref={inputRef} onChange={handleFile} className="hidden" />
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> {file ? file.name : "Choose CSV file"}
          </Button>
        </div>
        {preview.length > 0 && (
          <div className="mt-4 max-h-40 overflow-auto rounded border text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted">
                  {Object.keys(preview[0]).map((h) => <th key={h} className="px-2 py-1 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {Object.values(r).map((v, j) => <td key={j} className="px-2 py-1">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="p-2 text-muted-foreground">Showing first 5 rows…</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {loading ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportDialog;
