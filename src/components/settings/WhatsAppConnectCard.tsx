import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  RefreshCw,
  Unplug,
  ShieldCheck,
  Phone,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  useSyncWhatsAppTemplates,
  useWhatsAppConnection,
} from "@/hooks/useWhatsAppConnection";

interface Props {
  workspaceId: string;
}

const SUPABASE_FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const TWILIO_INBOUND_URL = `${SUPABASE_FN_BASE}/twilio-whatsapp-webhook`;
const TWILIO_STATUS_URL = `${SUPABASE_FN_BASE}/twilio-whatsapp-status`;

interface TwilioCfg {
  provider: "twilio";
  account_sid: string;
  auth_token: string;
  from_number: string;
  messaging_service_sid?: string;
}

function CopyableUrl({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono truncate flex-1">{url}</code>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(url);
            toast.success("Copied");
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function TwilioWhatsAppPanel({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [cfg, setCfg] = useState<TwilioCfg>({
    provider: "twilio",
    account_sid: "",
    auth_token: "",
    from_number: "",
    messaging_service_sid: "",
  });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const accessToken = sess.session?.access_token;
        if (!accessToken) return;
        const url = `${SUPABASE_FN_BASE}/channel-settings-get?workspaceId=${encodeURIComponent(workspaceId)}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const wa = json?.whatsapp;
        // masked values (provider is not masked because it's not a secret-like string;
        // it just gets first-4 / last-4 — but for short strings like "twilio" it
        // returns "****". So infer from presence of account_sid masked + provider.
        if (wa?.configured && wa?.masked) {
          const looksLikeTwilio =
            wa.masked.account_sid ||
            wa.masked.from_number ||
            String(wa.masked.provider || "").toLowerCase().includes("twil");
          if (looksLikeTwilio) setIsActive(Boolean(wa.is_active));
        }
      } catch (err) {
        console.error("load twilio whatsapp settings", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) throw new Error("Please sign in again.");
      const res = await fetch(`${SUPABASE_FN_BASE}/channel-settings-save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ workspaceId, channel: "whatsapp", config: cfg }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) throw new Error(json?.error || `Save failed (${res.status})`);
      setIsActive(true);
      toast.success("Twilio WhatsApp connected — paste the webhook URLs into Twilio Console.");
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const disconnectTwilio = async () => {
    setDisconnecting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) throw new Error("Please sign in again.");
      const res = await fetch(`${SUPABASE_FN_BASE}/channel-settings-save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ workspaceId, channel: "whatsapp", disconnect: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) throw new Error(json?.error || `Disconnect failed`);
      setCfg({
        provider: "twilio",
        account_sid: "",
        auth_token: "",
        from_number: "",
        messaging_service_sid: "",
      });
      setIsActive(false);
      toast.success("Twilio WhatsApp disconnected");
    } catch (err: any) {
      toast.error(err?.message || "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Twilio settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isActive && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Twilio WhatsApp is the active provider for this workspace. Outbound campaigns,
            automations, and AI replies will use Twilio.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertDescription className="text-xs space-y-1.5">
          <p>
            Use Twilio's WhatsApp sandbox for testing, or a number approved through Twilio's
            Senders. You need an Account SID, Auth Token, and a WhatsApp-enabled From number.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tw-sid">Account SID</Label>
          <Input
            id="tw-sid"
            placeholder="AC…"
            value={cfg.account_sid}
            onChange={(e) => setCfg({ ...cfg, account_sid: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tw-token">Auth Token</Label>
          <Input
            id="tw-token"
            type="password"
            placeholder="32-char auth token"
            value={cfg.auth_token}
            onChange={(e) => setCfg({ ...cfg, auth_token: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tw-from">From number (E.164)</Label>
          <Input
            id="tw-from"
            placeholder="+14155238886"
            value={cfg.from_number}
            onChange={(e) => setCfg({ ...cfg, from_number: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tw-msid">Messaging Service SID (optional)</Label>
          <Input
            id="tw-msid"
            placeholder="MG…"
            value={cfg.messaging_service_sid || ""}
            onChange={(e) => setCfg({ ...cfg, messaging_service_sid: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save & activate Twilio"}
        </Button>
        {isActive && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={disconnectTwilio}
            disabled={disconnecting}
          >
            <Unplug className="h-4 w-4 mr-2" /> Disconnect Twilio
          </Button>
        )}
      </div>

      <div className="space-y-2 pt-2">
        <div className="text-sm font-medium">Paste these into Twilio Console</div>
        <CopyableUrl label="Inbound message webhook (POST)" url={TWILIO_INBOUND_URL} />
        <CopyableUrl label="Delivery status callback (POST)" url={TWILIO_STATUS_URL} />
        <p className="text-xs text-muted-foreground">
          Twilio Console → Messaging → Settings → WhatsApp Senders → choose your number → set
          "When a message comes in" and "Status callback URL" to the URLs above.
        </p>
      </div>
    </div>
  );
}

const WEBHOOK_CALLBACK_URL = `${SUPABASE_FN_BASE}/whatsapp-webhook`;

function WebhookVerifyTokenSection({ workspaceId }: { workspaceId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const callFn = async (method: "GET" | "POST") => {
    const { data: sess } = await supabase.auth.getSession();
    const accessToken = sess.session?.access_token;
    if (!accessToken) throw new Error("Please sign in again.");
    const url =
      method === "GET"
        ? `${SUPABASE_FN_BASE}/whatsapp-verify-token?workspaceId=${encodeURIComponent(workspaceId)}`
        : `${SUPABASE_FN_BASE}/whatsapp-verify-token`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" ? JSON.stringify({ workspaceId }) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) throw new Error(json?.error || `Request failed (${res.status})`);
    return json as { token: string | null };
  };

  const reveal = async () => {
    setLoadingReveal(true);
    try {
      const res = await callFn("GET");
      if (!res.token) {
        toast.message("No verify token saved yet — click Regenerate to create one.");
        setRevealed(true);
        setToken(null);
        return;
      }
      setToken(res.token);
      setRevealed(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load token");
    } finally {
      setLoadingReveal(false);
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await callFn("POST");
      setToken(res.token);
      setRevealed(true);
      toast.success("New verify token generated — copy and paste it into Meta.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to regenerate token");
    } finally {
      setRegenerating(false);
    }
  };

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success("Copied");
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <div className="font-medium text-sm">Webhook configuration for Meta</div>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste these two values into <strong>Meta Business → WhatsApp → Configuration → Webhook</strong>,
        then click <em>Verify and Save</em> and subscribe the <code>messages</code> field.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">Callback URL</Label>
        <div className="flex items-center gap-2">
          <Input readOnly value={WEBHOOK_CALLBACK_URL} className="font-mono text-xs" />
          <Button size="sm" variant="outline" onClick={() => copy(WEBHOOK_CALLBACK_URL)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Verify Token</Label>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            type={revealed ? "text" : "password"}
            value={revealed ? token ?? "" : "••••••••••••••••"}
            placeholder={revealed && !token ? "No token yet — regenerate to create one" : ""}
            className="font-mono text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={revealed ? () => setRevealed(false) : reveal}
            disabled={loadingReveal}
            title={revealed ? "Hide" : "Show"}
          >
            {loadingReveal ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : revealed ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => token && copy(token)}
            disabled={!token}
            title="Copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={regenerate} disabled={regenerating}>
            {regenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Regenerating
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
              </>
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Regenerating immediately rotates the token. You'll need to re-verify the webhook in Meta after rotation.
        </p>
      </div>
    </div>
  );
}

function MetaWhatsAppPanel({ workspaceId }: { workspaceId: string }) {
  const { data: conn } = useWhatsAppConnection(workspaceId);
  const connect = useConnectWhatsApp(workspaceId);
  const disconnect = useDisconnectWhatsApp(workspaceId);
  const sync = useSyncWhatsAppTemplates(workspaceId);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setConnectionError(null);
      const res = await connect.mutateAsync();
      toast.success(
        `Connected ${res?.displayPhoneNumber || "your WhatsApp number"} — fetching templates…`,
      );
    } catch (err: any) {
      const message = err?.message || "Connection failed";
      setConnectionError(message);
      toast.error(message);
    }
  };

  const handleSync = async () => {
    try {
      const res = await sync.mutateAsync();
      toast.success(`Synced ${res?.synced ?? 0} templates from Meta`);
    } catch (err: any) {
      toast.error(err?.message || "Sync failed");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success("WhatsApp disconnected");
      setConfirmDisconnect(false);
    } catch (err: any) {
      toast.error(err?.message || "Disconnect failed");
    }
  };

  const isConnected = conn?.configured && conn?.is_active;

  return (
    <div className="space-y-4">
      {isConnected ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                <Phone className="h-3 w-3" /> Phone number
              </div>
              <div className="font-medium">
                {conn?.display_phone_number || conn?.phone_number_id || "—"}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                <ShieldCheck className="h-3 w-3" /> Verified business
              </div>
              <div className="font-medium">
                {conn?.verified_name || conn?.business_account_name || "—"}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-1">WABA ID</div>
              <div className="font-mono text-xs truncate">{conn?.waba_id || "—"}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-1">Connection method</div>
              <div className="font-medium capitalize">
                {conn?.connection_method?.replace("_", " ") || "manual"}
          </div>

          <WebhookVerifyTokenSection workspaceId={workspaceId} />
            </div>
          </div>

          {!conn?.default_reengagement_template_id && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Pick a <strong>default re-engagement template</strong> below so messages outside
                the 24h window still deliver instead of failing.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSync} disabled={sync.isPending} variant="outline">
              {sync.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" /> Sync templates from Meta
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDisconnect(true)}
            >
              <Unplug className="h-4 w-4 mr-2" /> Disconnect
            </Button>
          </div>
        </>
      ) : (
        <>
          <Alert>
            <AlertDescription>
              Connecting opens a Meta popup where you'll select your Facebook Business, create or
              pick a WhatsApp Business Account, and confirm your phone number. Takes about 90
              seconds.
            </AlertDescription>
          </Alert>
          {connectionError && (
            <Alert variant="destructive">
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}
          <Button
            size="lg"
            onClick={handleConnect}
            disabled={connect.isPending}
            className="bg-[#1877F2] hover:bg-[#166fe5] text-white"
          >
            {connect.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening Meta…
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" /> Connect WhatsApp via Meta
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            If nothing happens within ~15 seconds, allow popups and disable any ad-blocker /
            tracking protection (Brave Shields, uBlock, Safari ITP) for this site, then retry.
          </p>
        </>
      )}

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Inbound messages will stop arriving and campaigns/automations using WhatsApp will
              fail. You can reconnect anytime. Templates already synced will be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function WhatsAppConnectCard({ workspaceId }: Props) {
  const { data: conn, isLoading } = useWhatsAppConnection(workspaceId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading WhatsApp status…
        </CardContent>
      </Card>
    );
  }

  const metaConnected = conn?.configured && conn?.is_active;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                WhatsApp Business
                {metaConnected ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Meta Connected
                  </Badge>
                ) : (
                  <Badge variant="outline">Not connected</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Pick a provider — Meta Cloud API (Embedded Signup) or Twilio WhatsApp. Only one
                provider can be active per workspace.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="meta" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="meta">Meta Cloud API</TabsTrigger>
            <TabsTrigger value="twilio">Twilio WhatsApp</TabsTrigger>
          </TabsList>
          <TabsContent value="meta" className="pt-4">
            <MetaWhatsAppPanel workspaceId={workspaceId} />
          </TabsContent>
          <TabsContent value="twilio" className="pt-4">
            <TwilioWhatsAppPanel workspaceId={workspaceId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
