import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Key, Loader2, Plus, Trash2, AlertTriangle, Archive, ChevronDown, BookOpen } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

interface Props { workspaceId?: string | null }

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomKey() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  const body = btoa(String.fromCharCode(...a)).replace(/[+/=]/g, "").slice(0, 32);
  return `nfk_live_${body}`;
}

const LEADS_URL = `https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/ingest-leads`;
const FUNCTION_URL = `https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/blog-ingest`;

export default function ApiKeysTab({ workspaceId }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | "all" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const activeKeys = keys.filter((key) => !key.revoked_at);
  const revokedKeys = keys.filter((key) => key.revoked_at);

  const load = async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("workspace_api_keys")
      .select("id, name, key_prefix, scopes, last_used_at, revoked_at, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setKeys(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspaceId]);

  const create = async () => {
    if (!workspaceId || !newName.trim()) return;
    setCreating(true);
    try {
      const raw = randomKey();
      const hash = await sha256Hex(raw);
      const prefix = raw.slice(0, 16);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("workspace_api_keys").insert({
        workspace_id: workspaceId,
        name: newName.trim(),
        key_hash: hash,
        key_prefix: prefix,
        scopes: ["leads:write", "blog:write"],
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      setRevealedKey(raw);
      setNewName("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this key? Any integrations using it will stop working.")) return;
    const { error } = await supabase
      .from("workspace_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Key revoked");
    load();
  };

  const copy = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const deleteArchived = async () => {
    if (!workspaceId || !deleteTarget || deleting) return;
    const ids = deleteTarget === "all" ? revokedKeys.map((key) => key.id) : [deleteTarget.id];
    if (!ids.length) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.from("workspace_api_keys")
        .delete().eq("workspace_id", workspaceId).not("revoked_at", "is", null)
        .in("id", ids).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No archived keys were deleted. Check your permissions and try again.");
      toast.success(`${data.length} archived ${data.length === 1 ? "key" : "keys"} permanently deleted`);
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete archived keys");
    } finally {
      setDeleting(false);
    }
  };

  const renderKey = (k: ApiKey) => (
    <div key={k.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-words min-w-0">{k.name}</span>
          <Badge variant={k.revoked_at ? "destructive" : "secondary"}>{k.revoked_at ? "Revoked" : "Active"}</Badge>
          {k.scopes.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-1 font-mono">
          <span>{k.key_prefix}••••••••</span>
          <span>Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="shrink-0" disabled={deleting}
        title={k.revoked_at ? `Delete ${k.name} permanently` : `Revoke ${k.name}`}
        aria-label={k.revoked_at ? `Delete ${k.name} permanently` : `Revoke ${k.name}`}
        onClick={() => k.revoked_at ? setDeleteTarget(k) : revoke(k.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );

  const sampleBody = JSON.stringify({
    title: "5 Marketing Automation Tips",
    content: "<p>Full HTML or markdown content here…</p>",
    excerpt: "Short summary shown on the blog index.",
    image_url: "https://example.com/cover.jpg",
    category: "Marketing",
    author: "NexusFlo24 Team",
    status: "published",
  }, null, 2);

  const leadBody = JSON.stringify({
    full_name: "Jane Doe",
    email: "jane@example.com",
    phone: "+447700900123",
    source: "Facebook Ad",
    tags: ["facebook-ads"],
  }, null, 2);

  const LEADS_NOTE = <>Use <code>email</code> or <code>phone</code> (at least one). Optional: <code>full_name</code>, <code>source</code>, <code>tags</code>, <code>notes</code>, <code>status</code>. No workspace ID is needed — it comes from the key.</>;
  const BLOG_NOTE = <><code>title</code> and <code>content</code> are required. Optional: <code>slug</code>, <code>excerpt</code>, <code>image_url</code>, <code>category</code>, <code>author</code>, <code>read_time</code>, <code>featured</code>, <code>status</code> (<code>draft</code> or <code>published</code>). Published posts auto-share to connected social channels.</>;

  const guide = (url: string, body: string, note: ReactNode) => (
    <div className="space-y-4 pt-2">
      <div>
        <Label className="text-xs">Endpoint URL</Label>
        <div className="flex gap-2 mt-1">
          <Input readOnly value={url} className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={() => copy(url, "URL copied")} aria-label="Copy URL"><Copy className="h-4 w-4" /></Button>
        </div>
      </div>
      <div>
        <Label className="text-xs">Method</Label>
        <Input readOnly value="POST" className="font-mono text-xs mt-1" />
      </div>
      <div>
        <Label className="text-xs">Headers</Label>
        <pre className="mt-1 rounded-md bg-muted p-3 text-xs overflow-x-auto">{`x-api-key: nfk_live_your_key_here
Content-Type: application/json`}</pre>
      </div>
      <div>
        <Label className="text-xs">Sample JSON body</Label>
        <div className="relative mt-1">
          <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{body}</pre>
          <Button variant="outline" size="icon" className="absolute top-2 right-2" onClick={() => copy(body, "Body copied")} aria-label="Copy body">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Alert><AlertDescription className="text-xs">{note}</AlertDescription></Alert>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</CardTitle>
            <CardDescription>Generate keys to let Make.com, Zapier, or n8n send leads and create blog posts in this workspace.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline"><BookOpen className="h-4 w-4 mr-1" /> Integration Guide</Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Integration Guide</SheetTitle>
                  <SheetDescription>Use the HTTP module in Make.com, Zapier or n8n with your API key.</SheetDescription>
                </SheetHeader>
                <Tabs defaultValue="leads" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="leads">Lead ingestion</TabsTrigger>
                    <TabsTrigger value="blog">Blog publishing</TabsTrigger>
                  </TabsList>
                  <TabsContent value="leads">{guide(LEADS_URL, leadBody, LEADS_NOTE)}</TabsContent>
                  <TabsContent value="blog">{guide(FUNCTION_URL, sampleBody, BLOG_NOTE)}</TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>
            <Button onClick={() => setOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1" /> New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : activeKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No active API keys.</p>
          ) : (
            <div className="space-y-2">
              {activeKeys.map(renderKey)}
            </div>
          )}
          {!loading && revokedKeys.length > 0 && (
            <Collapsible open={archiveOpen} onOpenChange={setArchiveOpen} className="mt-4 border-t pt-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Archive className="h-4 w-4" /> Revoked keys ({revokedKeys.length})
                  <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${archiveOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-3">
                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" disabled={deleting} onClick={() => setDeleteTarget("all")}>
                    <Trash2 className="h-4 w-4 mr-2" /> Clear archive
                  </Button>
                </div>
                {revokedKeys.map(renderKey)}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget === "all" ? "Clear revoked key archive?" : "Delete archived key permanently?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === "all"
                ? `Permanently delete ${revokedKeys.length} revoked key records?`
                : `Permanently delete the revoked key “${deleteTarget?.name ?? ""}”?`}
              {" "}This cannot be undone. Active keys will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={deleteArchived} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Delete permanently
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setRevealedKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{revealedKey ? "Save your API key" : "Create API Key"}</DialogTitle>
            <DialogDescription>
              {revealedKey
                ? "Copy this key now. For security, you won't be able to see it again."
                : "Give this key a recognizable name (e.g. 'Make.com - Blog Automation')."}
            </DialogDescription>
          </DialogHeader>

          {revealedKey ? (
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">This is the only time the full key will be shown. Store it in Make.com now.</AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Input readOnly value={revealedKey} className="font-mono text-xs" />
                <Button onClick={() => copy(revealedKey, "Key copied")}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input id="key-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Make.com - Blog" />
            </div>
          )}

          <DialogFooter>
            {revealedKey
              ? <Button onClick={() => { setOpen(false); setRevealedKey(null); }}>Done</Button>
              : <Button onClick={create} disabled={creating || !newName.trim()}>
                  {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create Key
                </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
