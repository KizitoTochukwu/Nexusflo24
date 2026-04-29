import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Instagram, Facebook, Copy, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  workspaceId: string | null;
}

interface MetaSettings {
  id?: string;
  page_id: string | null;
  page_name: string | null;
  ig_user_id: string | null;
  ig_username: string | null;
  fb_user_name: string | null;
  is_active: boolean;
  connection_method: string;
  updated_at?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/meta-webhook`;

export default function MetaChannelTab({ workspaceId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<MetaSettings | null>(null);

  // Form state
  const [pageId, setPageId] = useState("");
  const [pageName, setPageName] = useState("");
  const [igUserId, setIgUserId] = useState("");
  const [igUsername, setIgUsername] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  // Test
  const [testRecipient, setTestRecipient] = useState("");
  const [testMessage, setTestMessage] = useState("Hello from NexusFlo24! 👋");
  const [testPlatform, setTestPlatform] = useState<"instagram" | "facebook">("instagram");

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("meta_settings")
        .select("id, page_id, page_name, ig_user_id, ig_username, fb_user_name, is_active, connection_method, updated_at")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (data) {
        setSettings(data as MetaSettings);
        setPageId(data.page_id || "");
        setPageName(data.page_name || "");
        setIgUserId(data.ig_user_id || "");
        setIgUsername(data.ig_username || "");
      }
      setLoading(false);
    })();
  }, [workspaceId]);

  const handleSave = async () => {
    if (!workspaceId) return;
    if (!pageAccessToken.trim()) { toast.error("Page Access Token is required"); return; }
    if (!verifyToken.trim()) { toast.error("Verify Token is required (you choose any random string)"); return; }
    if (!pageId.trim() && !igUserId.trim()) {
      toast.error("Provide at least Page ID or Instagram Business Account ID");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-save-settings", {
        body: {
          workspace_id: workspaceId,
          page_id: pageId.trim() || null,
          page_name: pageName.trim() || null,
          ig_user_id: igUserId.trim() || null,
          ig_username: igUsername.trim().replace(/^@/, "") || null,
          page_access_token: pageAccessToken.trim(),
          verify_token: verifyToken.trim(),
          connection_method: "manual",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Meta channel saved. Now configure the webhook in Meta (see below).");
      setPageAccessToken(""); // never display token after save
      // Refresh
      const { data: refreshed } = await supabase
        .from("meta_settings")
        .select("id, page_id, page_name, ig_user_id, ig_username, fb_user_name, is_active, connection_method, updated_at")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (refreshed) setSettings(refreshed as MetaSettings);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!workspaceId) return;
    if (!testRecipient.trim()) { toast.error("Enter recipient ID (IGSID or Page-Scoped ID)"); return; }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-send", {
        body: {
          workspace_id: workspaceId,
          platform: testPlatform,
          recipient_id: testRecipient.trim(),
          message: testMessage || "Hello from NexusFlo24!",
        },
      });
      if (error) throw error;
      if (!data?.success) {
        const reason = data?.error || "Send failed";
        toast.error(reason);
      } else {
        toast.success("Test message sent!");
      }
    } catch (err: any) {
      toast.error(err.message || "Test send failed");
    } finally {
      setTesting(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const isConfigured = !!settings?.id;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-accent" />
              <Facebook className="h-5 w-5 text-accent" />
              <CardTitle className="text-lg">Instagram & Facebook</CardTitle>
            </div>
            {isConfigured ? (
              <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600">
                <AlertCircle className="h-3 w-3" /> Not connected
              </Badge>
            )}
          </div>
          <CardDescription>
            Capture leads from Instagram and Facebook comments and DMs. When someone comments a keyword
            (e.g. <code className="px-1 rounded bg-muted text-xs">START</code>) on your post or DMs your account,
            NexusFlo24 saves them as a lead and fires your automation (auto-DM, email follow-up, etc.).
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Setup guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1 — Create a Meta Developer App (one-time, ~10 min)</CardTitle>
          <CardDescription>You only need to do this once. NexusFlo24 will guide you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Go to{" "}
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-accent inline-flex items-center gap-1 underline">
                developers.facebook.com/apps <ExternalLink className="h-3 w-3" />
              </a>{" "}
              and click <strong>Create App</strong>.
            </li>
            <li>Choose <strong>Business</strong> use case → name it (e.g. "NexusFlo24") → create.</li>
            <li>In the app dashboard, add the products: <strong>Instagram</strong>, <strong>Messenger</strong>, and <strong>Webhooks</strong>.</li>
            <li>Make sure your Instagram is a <strong>Business or Creator account</strong> linked to a Facebook Page.</li>
            <li>
              In the app, go to <strong>Instagram → API setup with Instagram login</strong> (or Messenger → Settings) and
              connect your Page + Instagram account. Generate a <strong>long-lived Page Access Token</strong>.
            </li>
            <li>Copy the <strong>Page ID</strong>, <strong>Instagram Business Account ID</strong>, and <strong>Page Access Token</strong> — paste below.</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Need it for production users beyond yourself? Submit your app for <strong>Meta App Review</strong> (2-4 weeks). For your own
            account, dev mode works immediately.
          </p>
        </CardContent>
      </Card>

      {/* Credentials form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 2 — Paste your Meta credentials</CardTitle>
          <CardDescription>Stored encrypted at rest. Page Access Token is never displayed after save.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="pageId">Facebook Page ID</Label>
              <Input id="pageId" value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="123456789012345" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pageName">Page Name (display only)</Label>
              <Input id="pageName" value={pageName} onChange={(e) => setPageName(e.target.value)} placeholder="My Brand" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="igId">Instagram Business Account ID</Label>
              <Input id="igId" value={igUserId} onChange={(e) => setIgUserId(e.target.value)} placeholder="17841401234567890" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="igHandle">Instagram Username</Label>
              <Input id="igHandle" value={igUsername} onChange={(e) => setIgUsername(e.target.value)} placeholder="@yourbrand" />
            </div>
          </div>
          <Separator />
          <div className="space-y-1">
            <Label htmlFor="token">Page Access Token <span className="text-destructive">*</span></Label>
            <Textarea id="token" value={pageAccessToken} onChange={(e) => setPageAccessToken(e.target.value)} placeholder="EAAG..." className="font-mono text-xs" rows={3} />
            <p className="text-xs text-muted-foreground">Long-lived Page Access Token from your Meta App.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="verify">Webhook Verify Token <span className="text-destructive">*</span></Label>
            <Input id="verify" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="A random string you choose, e.g. nexus-meta-2026" />
            <p className="text-xs text-muted-foreground">You'll paste this same string into Meta's webhook setup screen in Step 3.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save & Encrypt
          </Button>
        </CardContent>
      </Card>

      {/* Webhook setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 3 — Configure the webhook in Meta</CardTitle>
          <CardDescription>Tell Meta where to send incoming comments and DMs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <Label>Callback URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => copy(WEBHOOK_URL, "Webhook URL")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Verify Token</Label>
            <p className="text-xs text-muted-foreground">Use the exact same string you saved in Step 2.</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <p className="font-semibold">In Meta App Dashboard:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open <strong>Webhooks</strong> → choose <strong>Instagram</strong>.</li>
              <li>Paste the Callback URL and Verify Token above. Click <strong>Verify and Save</strong>.</li>
              <li>Subscribe to fields: <code>comments</code>, <code>messages</code>, <code>messaging_postbacks</code>, <code>mentions</code>.</li>
              <li>Repeat for <strong>Messenger</strong> with fields: <code>messages</code>, <code>messaging_postbacks</code>, <code>feed</code>.</li>
              <li>In your app, go to Instagram/Messenger settings and <strong>Subscribe</strong> your Page to the webhook.</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Test */}
      {isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 4 — Send a test DM</CardTitle>
            <CardDescription>Send yourself a test DM to confirm everything is wired up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Platform</Label>
                <select value={testPlatform} onChange={(e) => setTestPlatform(e.target.value as any)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook Messenger</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Recipient ID (IGSID or PSID)</Label>
                <Input value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} placeholder="The recipient must have messaged you first" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} maxLength={1000} />
            </div>
            <Button variant="outline" onClick={handleTestSend} disabled={testing}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Test
            </Button>
            <p className="text-xs text-muted-foreground">
              Note: Meta only allows DMs to users who have messaged you in the last 24 hours (or commented on your post — for private replies).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
