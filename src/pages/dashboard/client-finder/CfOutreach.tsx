import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, ShieldBan, Send } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useIcps, useOffers } from "@/hooks/useClientFinder";
import {
  useCampaignAction, useCfCampaigns, useCfSuppressions, useCreateCfCampaign,
} from "@/hooks/useClientFinderOutreach";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-accent/15 text-accent border border-accent/25",
  paused: "bg-amber-100 text-amber-800",
  stopped: "bg-destructive/10 text-destructive",
  completed: "bg-primary/10 text-primary",
};

export default function CfOutreach() {
  const workspaceId = useWorkspaceId();
  const { data: campaigns = [], isLoading } = useCfCampaigns(workspaceId);
  const { data: offers = [] } = useOffers(workspaceId);
  const { data: icps = [] } = useIcps(workspaceId);
  const { data: suppressions = [] } = useCfSuppressions(workspaceId);
  const create = useCreateCfCampaign(workspaceId);
  const action = useCampaignAction(workspaceId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [offerId, setOfferId] = useState<string>("");
  const [icpId, setIcpId] = useState<string>("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [supValue, setSupValue] = useState("");

  const approvedIcps = icps.filter((i) => i.approval_status === "approved");

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Give the campaign a name");
    if (!offerId) return toast.error("Choose the offer this campaign promotes");
    await create.mutateAsync({
      name: name.trim(),
      offer_id: offerId,
      icp_id: icpId || null,
      from_name: fromName.trim() || null,
      from_email: fromEmail.trim() || null,
    } as any);
    setOpen(false);
    setName(""); setOfferId(""); setIcpId(""); setFromName(""); setFromEmail("");
  };

  const addSuppression = async () => {
    const value = supValue.trim().toLowerCase();
    if (!value) return;
    await action.mutateAsync(
      value.includes("@")
        ? { action: "suppress", email: value, reason: "added manually" }
        : { action: "suppress", domain: value.replace(/^https?:\/\//, "").replace(/\/.*$/, ""), reason: "added manually" },
    );
    setSupValue("");
    toast.success("Added to the do-not-contact list");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Outreach campaigns</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Every campaign needs your explicit approval before a single email goes out.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New campaign
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : campaigns.length === 0 ? (
            <div className="py-10 text-center">
              <Send className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No campaigns yet. Create one to build a sequence and enrol approved prospects.
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  to={c.id}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.from_email ? `From ${c.from_name ? `${c.from_name} · ` : ""}${c.from_email}` : "Sender not set"}
                      {c.paused_reason ? ` · ${c.paused_reason}` : ""}
                    </p>
                  </div>
                  <Badge className={STATUS_STYLES[c.status] ?? "bg-muted"}>{c.status.replace("_", " ")}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldBan className="h-4 w-4" /> Do-not-contact list
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Emails and domains here are never contacted, and anyone already enrolled is stopped. Unsubscribes from
            the platform-wide suppression list are honoured too.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="person@example.com or example.com"
              value={supValue}
              onChange={(e) => setSupValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSuppression()}
            />
            <Button variant="outline" onClick={addSuppression} disabled={action.isPending}>
              {action.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </div>
          {suppressions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing suppressed for this workspace yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suppressions.map((s: any) => (
                <Badge key={s.id} variant="outline">{s.email ?? s.domain}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New outreach campaign</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q3 agencies — London" />
            </div>
            <div>
              <Label>Offer</Label>
              <Select value={offerId} onValueChange={setOfferId}>
                <SelectTrigger><SelectValue placeholder="Choose an offer" /></SelectTrigger>
                <SelectContent>
                  {offers.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {offers.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Create an offer first on the Offers tab.</p>
              )}
            </div>
            <div>
              <Label>Ideal customer profile (optional)</Label>
              <Select value={icpId} onValueChange={setIcpId}>
                <SelectTrigger><SelectValue placeholder="Choose an approved profile" /></SelectTrigger>
                <SelectContent>
                  {approvedIcps.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From name</Label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div>
                <Label>From email</Label>
                <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="jane@yourcompany.com" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
