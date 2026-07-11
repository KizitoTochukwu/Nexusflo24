import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Pencil, MessageSquare, ExternalLink } from "lucide-react";

type Template = {
  id: string;
  workspace_id: string;
  name: string;
  language: string;
  category: string;
  body_preview: string;
  variable_count: number;
  status: string;
  notes: string | null;
  created_at: string;
  provider?: string;
  twilio_content_sid?: string | null;
  twilio_variable_sample?: Record<string, string> | null;
};

const LANGUAGES = [
  { value: "en", label: "English (en)" },
  { value: "en_US", label: "English US (en_US)" },
  { value: "en_GB", label: "English UK (en_GB)" },
  { value: "es", label: "Spanish (es)" },
  { value: "fr", label: "French (fr)" },
  { value: "de", label: "German (de)" },
  { value: "pt_BR", label: "Portuguese BR (pt_BR)" },
  { value: "it", label: "Italian (it)" },
  { value: "ar", label: "Arabic (ar)" },
];

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const PROVIDERS = [
  { value: "meta", label: "Meta (WhatsApp Cloud API)" },
  { value: "twilio", label: "Twilio (Content Template)" },
  { value: "both", label: "Both providers" },
];

const empty = {
  name: "",
  language: "en",
  category: "MARKETING",
  body_preview: "",
  variable_count: 0,
  notes: "",
  provider: "meta",
  twilio_content_sid: "",
  twilio_variable_sample: "" as string, // JSON edited as text
};

export default function WhatsAppTemplatesTab() {
  const workspaceId = useWorkspaceId();
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to load templates");
      return;
    }
    setItems((data ?? []) as Template[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspaceId]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name,
      language: t.language,
      category: t.category,
      body_preview: t.body_preview ?? "",
      variable_count: t.variable_count ?? 0,
      notes: t.notes ?? "",
      provider: t.provider || "meta",
      twilio_content_sid: t.twilio_content_sid ?? "",
      twilio_variable_sample: t.twilio_variable_sample ? JSON.stringify(t.twilio_variable_sample, null, 2) : "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!workspaceId) return;
    const name = form.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!name) { toast.error("Template name is required"); return; }

    const provider = form.provider || "meta";
    const contentSidRaw = form.twilio_content_sid.trim();
    if ((provider === "twilio" || provider === "both") && contentSidRaw && !/^HX[0-9a-fA-F]{32}$/.test(contentSidRaw)) {
      toast.error("Twilio Content SID must look like HX + 32 hex characters (from Twilio Content Template Builder).");
      return;
    }
    let sampleJson: Record<string, string> | null = null;
    if (form.twilio_variable_sample.trim()) {
      try {
        sampleJson = JSON.parse(form.twilio_variable_sample);
        if (typeof sampleJson !== "object" || Array.isArray(sampleJson)) throw new Error("bad shape");
      } catch {
        toast.error(`Variable sample must be JSON like {"1": "John", "2": "Acme"}`);
        return;
      }
    }

    setSaving(true);
    const payload = {
      workspace_id: workspaceId,
      name,
      language: form.language,
      category: form.category,
      body_preview: form.body_preview,
      variable_count: Number(form.variable_count) || 0,
      notes: form.notes || null,
      status: "approved",
      provider,
      twilio_content_sid: contentSidRaw || null,
      twilio_variable_sample: sampleJson,
    };
    const q = editing
      ? supabase.from("whatsapp_templates").update(payload).eq("id", editing.id)
      : supabase.from("whatsapp_templates").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "A template with that name + language already exists." : error.message);
      return;
    }
    toast.success(editing ? "Template updated" : "Template added");
    setOpen(false);
    load();
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`Delete template "${t.name}" (${t.language})?`)) return;
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Template deleted");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              <CardTitle className="text-lg">WhatsApp Approved Templates</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Save your Meta-approved re-engagement templates here so campaigns and automations can use them when the 24-hour window is closed.
            </CardDescription>
          </div>
          <Button onClick={openNew} className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Add template
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">How this works</p>
          <p>Templates must already be <strong>approved by Meta</strong> in WhatsApp Manager. Add them here using the exact <em>template name</em> and <em>language code</em>. NexusFlo24 sends them automatically when the recipient hasn't messaged you in the last 24 hours.</p>
          <a
            href="https://business.facebook.com/wa/manage/message-templates/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-accent hover:underline"
          >
            Open WhatsApp Manager <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="mt-2 text-sm text-muted-foreground">No templates yet. Add one to enable re-engagement sends.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-foreground">{t.name}</span>
                    <Badge variant="outline" className="text-[10px]">{t.language}</Badge>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        t.category === "MARKETING" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" :
                        t.category === "UTILITY" ? "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200" :
                        t.category === "AUTHENTICATION" ? "bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200" :
                        ""
                      }`}
                      title={
                        t.category === "MARKETING" ? "Requires recipient opt-in. Honors unsubscribe." :
                        t.category === "UTILITY" ? "Transactional only — order updates, confirmations." :
                        t.category === "AUTHENTICATION" ? "OTP / verification codes only." :
                        undefined
                      }
                    >{t.category}</Badge>
                    {t.variable_count > 0 && (
                      <Badge variant="outline" className="text-[10px]">{t.variable_count} variable{t.variable_count === 1 ? "" : "s"}</Badge>
                    )}
                  </div>
                  {t.body_preview && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.body_preview}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(t)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit template" : "Add approved template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Template name (from Meta)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. winback_offer_v1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Lowercase letters, numbers, underscores only. Must match Meta exactly.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Language</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Body preview (for your reference)</Label>
              <Textarea
                value={form.body_preview}
                onChange={(e) => setForm({ ...form, body_preview: e.target.value })}
                rows={3}
                placeholder="Hi {{1}}, we miss you! Here's 20% off your next order…"
              />
            </div>
            <div>
              <Label className="text-xs">Variable count</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={form.variable_count}
                onChange={(e) => setForm({ ...form, variable_count: Number(e.target.value) })}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Number of {`{{1}}, {{2}}…`} placeholders. Leave 0 if none.</p>
            </div>
            <div>
              <Label className="text-xs">Internal notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="When to use this template…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing ? "Save changes" : "Add template")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
