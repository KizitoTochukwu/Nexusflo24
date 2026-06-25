import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Key, Loader2, Plus, Trash2, AlertTriangle } from "lucide-react";
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

const FUNCTION_URL = `https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/blog-ingest`;

export default function ApiKeysTab({ workspaceId }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

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
        scopes: ["blog:write"],
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

  const sampleBody = JSON.stringify({
    title: "5 Marketing Automation Tips",
    content: "<p>Full HTML or markdown content here…</p>",
    excerpt: "Short summary shown on the blog index.",
    image_url: "https://example.com/cover.jpg",
    category: "Marketing",
    author: "NexusFlo24 Team",
    status: "published",
  }, null, 2);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</CardTitle>
            <CardDescription>Generate keys to let Make.com, Zapier, or n8n create blog posts in this workspace.</CardDescription>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-1" /> New Key
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No API keys yet. Create one to start automating blog posts.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{k.name}</span>
                      {k.revoked_at
                        ? <Badge variant="destructive">Revoked</Badge>
                        : <Badge variant="secondary">Active</Badge>}
                      {k.scopes.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      {k.key_prefix}••••••••
                      <span className="ml-3">Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</span>
                    </div>
                  </div>
                  {!k.revoked_at && (
                    <Button variant="ghost" size="icon" onClick={() => revoke(k.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Make.com Setup</CardTitle>
          <CardDescription>Use the HTTP module in Make.com (or any tool that can call an HTTP endpoint) with the values below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Endpoint URL</Label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={FUNCTION_URL} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(FUNCTION_URL, "URL copied")}><Copy className="h-4 w-4" /></Button>
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
              <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{sampleBody}</pre>
              <Button variant="outline" size="icon" className="absolute top-2 right-2" onClick={() => copy(sampleBody, "Body copied")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Alert>
            <AlertDescription className="text-xs">
              <strong>Fields:</strong> <code>title</code> and <code>content</code> are required.
              Optional: <code>slug</code>, <code>excerpt</code>, <code>image_url</code>, <code>category</code>, <code>author</code>, <code>read_time</code>, <code>featured</code>, <code>status</code> (<code>draft</code> or <code>published</code>).
              When <code>status: "published"</code>, posts auto-share to LinkedIn, Facebook & Instagram if those channels are connected.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

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
