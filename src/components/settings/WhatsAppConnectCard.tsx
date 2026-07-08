import { useCallback, useEffect, useState } from "react";
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
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  useSyncWhatsAppTemplates,
  useWhatsAppConnection,
} from "@/hooks/useWhatsAppConnection";

interface Props {
  workspaceId: string;
}

type ActiveProvider = "meta" | "twilio" | null;

const SUPABASE_FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const TWILIO_INBOUND_URL = `${SUPABASE_FN_BASE}/twilio-whatsapp-webhook`;
const TWILIO_STATUS_URL = `${SUPABASE_FN_BASE}/twilio-whatsapp-status`;
const WEBHOOK_CALLBACK_URL = `${SUPABASE_FN_BASE}/whatsapp-webhook`;

interface TwilioCfg {
  provider: "twilio";
  account_sid: string;
  auth_token: string;
  from_number: string;
  messaging_service_sid?: string;
}

// ---------------------------------------------------------------------------
// Active-provider resolution — SINGLE SOURCE OF TRUTH, always from the DB.
// ---------------------------------------------------------------------------

interface ChannelSettingsWhatsAppShape {
  configured?: boolean;
  is_active?: boolean;
  non_secret?: { provider?: string };
}

async function fetchWhatsAppChannelSettings(
  workspaceId: string,
): Promise<ChannelSettingsWhatsAppShape | null> {
  const { data: sess } = await supabase.auth.getSession();
  const accessToken = sess.session?.access_token;
  if (!accessToken) return null;
  const res = await fetch(
    `${SUPABASE_FN_BASE}/channel-settings-get?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    },
  );
  const json = await res.json().catch(() => ({}));
  return (json?.whatsapp as ChannelSettingsWhatsAppShape) || null;
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

// ---------------------------------------------------------------------------
// Twilio panel
// ---------------------------------------------------------------------------

function TwilioWhatsAppPanel({
  workspaceId,
  activeProvider,
  onActivated,
}: {
  workspaceId: string;
  activeProvider: ActiveProvider;
  onActivated: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [cfg, setCfg] = useState<TwilioCfg>({
    provider: "twilio",
    account_sid: "",
    auth_token: "",
    from_number: "",
    messaging_service_sid: "",
  });

  const isTwilioActive = activeProvider === "twilio";
  const metaIsActive = activeProvider === "meta";

  const validate = (): string | null => {
    if (!/^AC[0-9a-fA-F]{32}$/.test(cfg.account_sid.trim())) {
      return "Account SID must start with AC and be 34 characters long.";
    }
    if (!cfg.auth_token.trim()) {
      return "Auth Token is required.";
    }
    // Messaging Service SID can substitute for a From number
    if (!cfg.messaging_service_sid?.trim()) {
      if (!/^\+[1-9]\d{6,14}$/.test(cfg.from_number.trim())) {
        return "From number must be valid E.164 format (e.g. +14155238886).";
      }
    }
    return null;
  };

  const doSave = async () => {
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
      await onActivated();
      toast.success("Twilio WhatsApp is now active for this workspace.");
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
      setConfirmSwitch(false);
    }
  };

  const handlePrimary = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (metaIsActive) {
      setConfirmSwitch(true);
      return;
    }
    void doSave();
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
      await onActivated();
      toast.success("Twilio WhatsApp disconnected");
    } catch (err: any) {
      toast.error(err?.message || "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  };

  const primaryLabel = metaIsActive
    ? "Validate & Switch to Twilio"
    : isTwilioActive
    ? "Update Twilio credentials"
    : "Save & activate Twilio";

  return (
    <div className="space-y-4">
      {metaIsActive && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Meta Cloud API is currently active for this workspace. Enter your Twilio credentials
            below and click <strong>{primaryLabel}</strong> to switch providers.
          </AlertDescription>
        </Alert>
      )}

      {isTwilioActive && (
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
        <Button onClick={handlePrimary} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            primaryLabel
          )}
        </Button>
        {isTwilioActive && (
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

      <AlertDialog open={confirmSwitch} onOpenChange={setConfirmSwitch}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to Twilio WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate Meta Cloud API for this workspace. Your Meta connection details
              and synced templates are preserved and you can switch back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Webhook verify token section (unchanged)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Meta panel
// ---------------------------------------------------------------------------

function MetaWhatsAppPanel({
  workspaceId,
  activeProvider,
  onActivated,
}: {
  workspaceId: string;
  activeProvider: ActiveProvider;
  onActivated: () => Promise<void>;
}) {
  const { data: conn } = useWhatsAppConnection(workspaceId);
  const connect = useConnectWhatsApp(workspaceId);
  const disconnect = useDisconnectWhatsApp(workspaceId);
  const sync = useSyncWhatsAppTemplates(workspaceId);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const metaIsActive = activeProvider === "meta";
  const twilioIsActive = activeProvider === "twilio";

  const runConnect = async () => {
    try {
      setConnectionError(null);
      const res = await connect.mutateAsync();
      await onActivated();
      toast.success(
        `Connected ${res?.displayPhoneNumber || "your WhatsApp number"} — Meta Cloud API is now active.`,
      );
    } catch (err: any) {
      const message = err?.message || "Connection failed";
      setConnectionError(message);
      toast.error(message);
    } finally {
      setConfirmSwitch(false);
    }
  };

  const handleConnect = () => {
    if (twilioIsActive) {
      setConfirmSwitch(true);
      return;
    }
    void runConnect();
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
      await onActivated();
      toast.success("WhatsApp disconnected");
      setConfirmDisconnect(false);
    } catch (err: any) {
      toast.error(err?.message || "Disconnect failed");
    }
  };

  return (
    <div className="space-y-4">
      {twilioIsActive && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Twilio WhatsApp is currently active for this workspace. Click{" "}
            <strong>Connect &amp; Switch to Meta</strong> to switch providers.
          </AlertDescription>
        </Alert>
      )}

      {metaIsActive ? (
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
                <MessageCircle className="h-4 w-4 mr-2" />
                {twilioIsActive ? "Connect & Switch to Meta" : "Connect WhatsApp via Meta"}
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

      <AlertDialog open={confirmSwitch} onOpenChange={setConfirmSwitch}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to Meta Cloud API?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate Twilio WhatsApp for this workspace. Meta will only become
              active after you complete the Meta signup popup successfully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={connect.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runConnect} disabled={connect.isPending}>
              {connect.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Continue to Meta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card shell — owns selectedProviderTab + activeProvider split
// ---------------------------------------------------------------------------

export function WhatsAppConnectCard({ workspaceId }: Props) {
  const { data: conn, isLoading: connLoading } = useWhatsAppConnection(workspaceId);
  const qc = useQueryClient();
  const [twilioChannel, setTwilioChannel] =
    useState<ChannelSettingsWhatsAppShape | null>(null);
  const [channelLoading, setChannelLoading] = useState(true);
  const [selectedProviderTab, setSelectedProviderTab] = useState<"meta" | "twilio">("meta");
  const [initialised, setInitialised] = useState(false);

  const loadChannel = useCallback(async () => {
    setChannelLoading(true);
    try {
      const wa = await fetchWhatsAppChannelSettings(workspaceId);
      setTwilioChannel(wa);
    } finally {
      setChannelLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadChannel();
  }, [loadChannel]);

  // Derive active provider strictly from DB-backed data.
  const metaActive = Boolean(conn?.configured && conn?.is_active);
  const twilioActive = Boolean(
    twilioChannel?.configured &&
      twilioChannel?.is_active &&
      (twilioChannel?.non_secret?.provider || "").toLowerCase() === "twilio",
  );
  const activeProvider: ActiveProvider = metaActive
    ? "meta"
    : twilioActive
    ? "twilio"
    : null;

  // First-load: align the visible tab with whatever provider is active.
  useEffect(() => {
    if (initialised || connLoading || channelLoading) return;
    setSelectedProviderTab(activeProvider === "twilio" ? "twilio" : "meta");
    setInitialised(true);
  }, [initialised, connLoading, channelLoading, activeProvider]);

  const refreshActiveProvider = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["whatsapp-connection", workspaceId] }),
      loadChannel(),
    ]);
  }, [qc, workspaceId, loadChannel]);

  if (connLoading || channelLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading WhatsApp status…
        </CardContent>
      </Card>
    );
  }

  const headerBadge =
    activeProvider === "meta" ? (
      <Badge variant="default" className="bg-green-500 hover:bg-green-500">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Meta Connected
      </Badge>
    ) : activeProvider === "twilio" ? (
      <Badge variant="default" className="bg-green-500 hover:bg-green-500">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Twilio Connected
      </Badge>
    ) : (
      <Badge variant="outline">Not connected</Badge>
    );

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
                {headerBadge}
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
        <Tabs
          value={selectedProviderTab}
          onValueChange={(v) => setSelectedProviderTab(v as "meta" | "twilio")}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="meta">Meta Cloud API</TabsTrigger>
            <TabsTrigger value="twilio">Twilio WhatsApp</TabsTrigger>
          </TabsList>
          <TabsContent value="meta" className="pt-4">
            <MetaWhatsAppPanel
              workspaceId={workspaceId}
              activeProvider={activeProvider}
              onActivated={refreshActiveProvider}
            />
          </TabsContent>
          <TabsContent value="twilio" className="pt-4">
            <TwilioWhatsAppPanel
              workspaceId={workspaceId}
              activeProvider={activeProvider}
              onActivated={refreshActiveProvider}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
