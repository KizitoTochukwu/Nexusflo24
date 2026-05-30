import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Loader2,
  MessageCircle,
  RefreshCw,
  Unplug,
  ShieldCheck,
  Phone,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  useSyncWhatsAppTemplates,
  useWhatsAppConnection,
} from "@/hooks/useWhatsAppConnection";

interface Props {
  workspaceId: string;
}

export function WhatsAppConnectCard({ workspaceId }: Props) {
  const { data: conn, isLoading } = useWhatsAppConnection(workspaceId);
  const connect = useConnectWhatsApp(workspaceId);
  const disconnect = useDisconnectWhatsApp(workspaceId);
  const sync = useSyncWhatsAppTemplates(workspaceId);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const handleConnect = async () => {
    try {
      const res = await connect.mutateAsync();
      toast.success(
        `Connected ${res?.displayPhoneNumber || "your WhatsApp number"} — fetching templates…`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Connection failed");
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading WhatsApp status…
        </CardContent>
      </Card>
    );
  }

  const isConnected = conn?.configured && conn?.is_active;

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
                {isConnected ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline">Not connected</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Connect your WhatsApp Business Account in one click via Meta — same flow as
                HubSpot, Wati, ManyChat.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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
          </>
        )}
      </CardContent>

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
    </Card>
  );
}
