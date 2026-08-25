import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { AD_PROVIDERS, type AdProvider } from "@/lib/ads/constants";
import { useStartAdOAuth, type AdConnection } from "@/hooks/useAds";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { usePipelines } from "@/hooks/useDeals";

type Phase = "intro" | "loading" | "not_configured" | "error";

export default function ConnectAccountDialog({
  provider, open, onOpenChange, connection,
}: {
  provider: AdProvider;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  connection?: AdConnection;
}) {
  const workspaceId = useWorkspaceId();
  const meta = AD_PROVIDERS[provider];
  const startOAuth = useStartAdOAuth();
  const [phase, setPhase] = useState<Phase>("intro");
  const [message, setMessage] = useState<string>("");
  const [pipelineId, setPipelineId] = useState<string>("");

  const { data: pipelines = [] } = usePipelines(workspaceId);

  useEffect(() => {
    if (open) { setPhase("intro"); setMessage(""); }
  }, [open]);

  const handleAuthorise = async () => {
    setPhase("loading");
    try {
      const res = await startOAuth.mutateAsync({ workspaceId, provider });
      if (res?.authorize_url) {
        window.location.href = res.authorize_url;
        return;
      }
      setMessage(res?.message || `${meta.label} is not configured for this workspace yet.`);
      setPhase("not_configured");
    } catch (e: any) {
      const fallback = `${meta.label} connection setup is not yet deployed. Please contact your workspace administrator.`;
      setMessage(e?.message || fallback);
      setPhase("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Connect {meta.label}
          </DialogTitle>
          <DialogDescription>{meta.blurb}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-accent" /> What NexusFlo24 will access
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {meta.permissions.map((p) => (
                <li key={p} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              You authorise on {meta.shortLabel}'s own sign-in screen. NexusFlo24 never sees or stores your password,
              and access tokens are encrypted on our servers.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ads-pipeline">Default CRM pipeline for imported ad leads</Label>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger id="ads-pipeline">
                <SelectValue placeholder={pipelines.length ? "Choose a pipeline" : "No pipelines yet"} />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {pipelines.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Leads captured from {meta.shortLabel} lead forms land here. You can change this per ad account later.
            </p>
          </div>

          {phase === "not_configured" && (
            <Alert>
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Channel authorisation not available yet</AlertTitle>
              <AlertDescription className="text-sm">
                {message} Once the {meta.label} app credentials are added to this project, this button will take
                you straight to {meta.shortLabel}'s consent screen.
              </AlertDescription>
            </Alert>
          )}

          {phase === "error" && (
            <Alert variant="destructive">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="text-sm">
                {message || `${meta.label} connection setup is not yet deployed. Please contact your workspace administrator.`}
              </AlertDescription>
            </Alert>
          )}

          {connection?.status === "needs_attention" && (
            <Alert>
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Reconnect required</AlertTitle>
              <AlertDescription className="text-sm">
                {connection.last_error || "Access expired or a permission was removed. Authorise again to resume syncing."}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAuthorise} disabled={phase === "loading"} className="gap-2">
            {phase === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            {connection?.status === "needs_attention" ? "Reconnect" : `Continue to ${meta.shortLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
