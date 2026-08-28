import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2, Mail, Plug } from "lucide-react";
import { format } from "date-fns";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useCfMailboxActions, useCfMailboxStatus } from "@/hooks/useClientFinderInbox";
import { useCfGmailActions, useCfGmailStatus } from "@/hooks/useClientFinderGmail";

export default function MailboxCard() {
  const workspaceId = useWorkspaceId();
  const { data, isLoading } = useCfMailboxStatus(workspaceId);
  const { startOauth, completeOauth, disconnect } = useCfMailboxActions(workspaceId);
  const { data: gmail } = useCfGmailStatus(workspaceId);
  const gmailActions = useCfGmailActions(workspaceId);
  const [params, setParams] = useSearchParams();
  const handled = useRef(false);

  // Finish an OAuth round-trip when the provider redirects back here.
  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state || handled.current || !workspaceId) return;
    handled.current = true;
    const provider = params.get("provider") ?? "google";
    completeOauth.mutate(
      { provider, code, state },
      {
        onSettled: () => {
          params.delete("code");
          params.delete("state");
          params.delete("provider");
          params.delete("scope");
          setParams(params, { replace: true });
        },
      },
    );
  }, [params, workspaceId, completeOauth, setParams]);

  const mailboxes = data?.mailboxes ?? [];
  const providers = data?.providers ?? {};
  const fallback = data?.fallback_sender;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sending mailboxes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking mailbox connections…
          </div>
        ) : (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {mailboxes.length > 0
                  ? "Campaigns can send from a connected mailbox. Disconnecting a mailbox pauses any campaign using it."
                  : fallback?.configured
                    ? `No mailbox is connected. Sequences send from your verified workspace sender (${fallback.from_email}).`
                    : "No mailbox is connected and no workspace sender is set up, so sequences send from the platform sender."}
              </AlertDescription>
            </Alert>

            {mailboxes.length > 0 && (
              <div className="divide-y rounded-lg border">
                {mailboxes.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.provider === "google" ? "Google" : m.provider === "microsoft" ? "Microsoft" : "Platform"} ·
                        connected {format(new Date(m.connected_at), "d MMM yyyy")}
                        {m.last_error ? ` · ${m.last_error}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.status === "connected" ? "default" : "destructive"}>{m.status}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          m.provider === "google" && gmail?.configured
                            ? gmailActions.disconnect.mutate(m.id)
                            : disconnect.mutate(m.id)}
                        disabled={disconnect.isPending || gmailActions.disconnect.isPending}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {(["google", "microsoft"] as const).map((key) => {
                const p = providers[key];
                // Gmail connects through Lovable's App User Connector, so it is
                // available whenever that connector client is set up.
                const viaConnector = key === "google" && !!gmail?.configured;
                const configured = viaConnector || !!p?.configured;
                const label = key === "google" ? "Gmail / Google Workspace" : p?.label ?? key;
                return (
                  <div key={key} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {configured
                        ? "Connect a mailbox to send from your own address."
                        : "Not available yet — this platform has no credentials for this provider."}
                    </p>
                    <Button
                      size="sm"
                      variant={configured ? "default" : "outline"}
                      disabled={!configured || startOauth.isPending || gmailActions.connect.isPending}
                      onClick={() => (viaConnector ? gmailActions.connect.mutate() : startOauth.mutate(key))}
                    >
                      <Plug className="mr-2 h-4 w-4" />
                      {configured ? "Connect" : "Not configured"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
